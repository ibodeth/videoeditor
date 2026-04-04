import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX
} from 'lucide-react';

const PREVIEW_W = 960;
const PREVIEW_H = 540;

function pad2(n) { return String(Math.floor(n)).padStart(2, '0'); }
function formatTC(secs, fps = 30) {
  const h  = Math.floor(secs / 3600);
  const m  = Math.floor((secs % 3600) / 60);
  const s  = Math.floor(secs % 60);
  const fr = Math.floor((secs % 1) * fps);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(fr)}`;
}

/** Build a CSS filter string from a layer's color correction + effects */
function buildLayerFilter(layer) {
  const parts = [];
  if (layer.brightness !== undefined && layer.brightness !== 100)
    parts.push(`brightness(${layer.brightness / 100})`);
  if (layer.contrast !== undefined && layer.contrast !== 100)
    parts.push(`contrast(${layer.contrast / 100})`);
  if (layer.saturation !== undefined && layer.saturation !== 100)
    parts.push(`saturate(${layer.saturation / 100})`);
  if (layer.hue !== undefined && layer.hue !== 0)
    parts.push(`hue-rotate(${layer.hue}deg)`);
  if (layer.effects && layer.effects.length > 0 && layer.effects[0] !== 'none')
    parts.push(layer.effects[0]);
  return parts.join(' ') || 'none';
}

/** Interpolate keyframes for a given property at a given time */
function interpolateKF(keyframes, time) {
  if (!keyframes || keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].value;
  let lo = keyframes[0], hi = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      lo = keyframes[i]; hi = keyframes[i + 1]; break;
    }
  }
  if (time <= lo.time) return lo.value;
  if (time >= hi.time) return hi.value;
  const t = (time - lo.time) / (hi.time - lo.time);
  const ease = t * t * (3 - 2 * t);
  if (typeof lo.value === 'number') return lo.value + (hi.value - lo.value) * ease;
  return lo.value;
}

/** Get effective transform at a given time, applying keyframes if present */
function getTransformAtTime(layer, time) {
  const kfs = layer.keyframes || {};
  const relTime = time - layer.startTime;
  const base = layer.transform || {};

  const get = (prop, fallback) => {
    if (kfs[prop] && kfs[prop].length > 0) {
      const v = interpolateKF(kfs[prop], relTime);
      if (v !== null) return v;
    }
    return base[prop] ?? fallback;
  };

  return {
    x:        get('x', 0),
    y:        get('y', 0),
    anchorX:  get('anchorX', 0),
    anchorY:  get('anchorY', 0),
    scaleX:   get('scaleX', 1),
    scaleY:   get('scaleY', 1),
    rotation: get('rotation', 0),
    opacity:  get('opacity', 1),
    skewX:    get('skewX', 0),
    skewY:    get('skewY', 0),
  };
}

export default function CompositionViewer({
  layers, currentTime, setCurrentTime,
  isPlaying, setIsPlaying,
  duration, compositionWidth, compositionHeight,
  activeTool, onAddTextLayer,
}) {
  const canvasRef   = useRef(null);
  const videoRefs   = useRef({});
  const imageCache  = useRef({});
  const rafRef      = useRef(null);
  const lastTRef    = useRef(null);
  const ctRef       = useRef(currentTime);
  const layersRef   = useRef(layers);
  const mutedRef    = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => { ctRef.current = currentTime; }, [currentTime]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  /* ── Manage hidden video elements ── */
  useEffect(() => {
    const videoLayers = layers.filter(l => l.type === 'video' && l.url);
    const currentIds = new Set(videoLayers.map(l => l.id));

    for (const id of Object.keys(videoRefs.current)) {
      if (!currentIds.has(id)) {
        const vid = videoRefs.current[id];
        vid.pause(); vid.src = '';
        delete videoRefs.current[id];
      }
    }
    for (const layer of videoLayers) {
      if (!videoRefs.current[layer.id]) {
        const vid = document.createElement('video');
        vid.src = layer.url;
        vid.muted = true;
        vid.preload = 'auto';
        vid.crossOrigin = 'anonymous';
        vid.playsInline = true;
        vid.load();
        videoRefs.current[layer.id] = vid;
      }
    }
  }, [layers]);

  /* ── Canvas draw ── */
  const drawFrame = useCallback((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = PREVIEW_W;
    const ch = PREVIEW_H;
    const scx = cw / compositionWidth;
    const scy = ch / compositionHeight;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    const ls = layersRef.current;

    if (!ls.length) {
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, cw, ch);
      for (let x = 20; x < cw; x += 40) {
        for (let y = 20; y < ch; y += 40) {
          ctx.fillStyle = '#2a2a2a';
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch);
      ctx.moveTo(0, ch / 2); ctx.lineTo(cw, ch / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#444';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Drop media to begin', cw / 2, ch / 2);
      return;
    }

    const visible = [...ls]
      .filter(l => l.visible && time >= l.startTime && time < l.startTime + l.duration)
      .sort((a, b) => b.trackIndex - a.trackIndex);

    for (const layer of visible) {
      ctx.save();

      const tr = getTransformAtTime(layer, time);
      ctx.globalAlpha = Math.max(0, Math.min(1, tr.opacity));
      ctx.globalCompositeOperation = layer.blendMode || 'source-over';

      // CSS filter (effects + color correction)
      const filterStr = buildLayerFilter(layer);
      if (filterStr !== 'none') ctx.filter = filterStr;

      // Drop shadow
      const ds = layer.dropShadow;
      if (ds && ds.enabled) {
        ctx.shadowColor   = ds.color || 'rgba(0,0,0,0.8)';
        ctx.shadowBlur    = ds.blur ?? 10;
        ctx.shadowOffsetX = ds.offsetX ?? 5;
        ctx.shadowOffsetY = ds.offsetY ?? 5;
      }

      const px = (compositionWidth  / 2 + tr.x) * scx;
      const py = (compositionHeight / 2 + tr.y) * scy;
      ctx.translate(px, py);
      ctx.rotate((tr.rotation * Math.PI) / 180);
      ctx.scale(tr.scaleX, tr.scaleY);
      // Skew (degrees → radians)
      if (tr.skewX || tr.skewY) {
        ctx.transform(1, Math.tan(tr.skewY * Math.PI / 180), Math.tan(tr.skewX * Math.PI / 180), 1, 0, 0);
      }
      // Anchor point: shift content so that (anchorX, anchorY) in composition space is at the layer position
      if (tr.anchorX || tr.anchorY) {
        ctx.translate(-tr.anchorX * scx, -tr.anchorY * scy);
      }

      const hw = (compositionWidth  / 2) * scx;
      const hh = (compositionHeight / 2) * scy;

      if (layer.type === 'video' && videoRefs.current[layer.id]) {
        const vid = videoRefs.current[layer.id];
        if (vid.readyState >= 2) {
          ctx.drawImage(vid, -hw, -hh, hw * 2, hh * 2);
        }
      } else if (layer.type === 'photo' && layer.url) {
        if (!imageCache.current[layer.url]) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = layer.url;
          imageCache.current[layer.url] = img;
          img.onload = () => drawFrame(ctRef.current); // redraw when loaded
        }
        const img = imageCache.current[layer.url];
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -hw, -hh, hw * 2, hh * 2);
        }
      } else if (layer.type === 'text') {
        drawTextLayer(ctx, layer, ch, compositionHeight);
      } else if (layer.type === 'shape') {
        drawShapeLayer(ctx, layer, compositionWidth, compositionHeight, scx, scy);
      }

      ctx.restore();
    }
  }, [compositionWidth, compositionHeight]);

  /* ── Video sync helpers ── */
  const syncVideosRef = useRef(null);
  syncVideosRef.current = (time, playing) => {
    const ls = layersRef.current;
    for (const layer of ls) {
      if (layer.type !== 'video' || !layer.url) continue;
      const vid = videoRefs.current[layer.id];
      if (!vid) continue;
      const isActive = time >= layer.startTime && time < layer.startTime + layer.duration;
      if (isActive) {
        const speed   = layer.speed ?? 1;
        const srcTime = (time - layer.startTime) * speed + (layer.trimIn ?? 0);
        vid.muted        = mutedRef.current || (layer.muted ?? false);
        vid.volume       = layer.volume ?? 1;
        vid.playbackRate = speed;
        if (playing) {
          if (Math.abs(vid.currentTime - srcTime) > 0.2) {
            vid.currentTime = Math.max(0, srcTime);
          }
          if (vid.paused) vid.play().catch(() => {});
        } else {
          if (!vid.paused) vid.pause();
          if (Math.abs(vid.currentTime - srcTime) > 0.04) {
            vid.currentTime = Math.max(0, srcTime);
          }
        }
      } else {
        if (!vid.paused) vid.pause();
      }
    }
  };

  /* ── Playback RAF loop ── */
  useEffect(() => {
    if (isPlaying) {
      ctRef.current = currentTime;
      syncVideosRef.current(currentTime, true);
      lastTRef.current = performance.now();

      function tick() {
        const now   = performance.now();
        const delta = (now - lastTRef.current) / 1000;
        lastTRef.current = now;
        const next = Math.min(ctRef.current + delta, duration);
        ctRef.current = next;
        setCurrentTime(next);
        syncVideosRef.current(next, true);
        drawFrame(next);

        if (next < duration) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          syncVideosRef.current(next, false);
          setIsPlaying(false);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      syncVideosRef.current(ctRef.current, false);
      drawFrame(ctRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, duration, drawFrame, setCurrentTime, setIsPlaying]);

  // Redraw when paused
  useEffect(() => {
    if (!isPlaying) {
      syncVideosRef.current(currentTime, false);
      drawFrame(currentTime);
    }
  }, [currentTime, layers, isPlaying, drawFrame]);

  function togglePlay() { setIsPlaying(p => !p); }
  function goToStart() { setCurrentTime(0); }
  function goToEnd()   { setCurrentTime(duration); }

  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.max(0, Math.min(duration, pct * duration)));
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f0f' }}>
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 8, overflow: 'hidden',
      }}>
        <div style={{
          position: 'relative',
          aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}`,
          maxWidth: '100%', maxHeight: '100%',
          background: '#000',
          boxShadow: '0 0 0 1px #333, 0 8px 32px rgba(0,0,0,0.6)',
          cursor: activeTool === 'text' ? 'text' : activeTool === 'hand' ? 'grab' : 'default',
        }}>
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            style={{ display: 'block', width: '100%', height: '100%' }}
            onClick={() => {
              if (activeTool === 'text' && onAddTextLayer) onAddTextLayer();
            }}
          />
        </div>
      </div>

      {/* Controls bar */}
      <div style={{
        flexShrink: 0, background: '#1a1a1a', borderTop: '1px solid #2a2a2a',
        padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={goToStart} style={btnStyle} title="Go to start"><SkipBack size={13} /></button>
        <button onClick={togglePlay} style={{ ...btnStyle, background: '#2a3a5a', color: '#6aadff', padding: '4px 10px', borderRadius: 4 }}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={goToEnd} style={btnStyle} title="Go to end"><SkipForward size={13} /></button>

        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa', marginLeft: 4, letterSpacing: '0.05em' }}>
          {formatTC(currentTime, 30)}
        </span>

        <div
          onClick={handleProgressClick}
          style={{ flex: 1, height: 6, background: '#2a2a2a', borderRadius: 3, cursor: 'pointer', position: 'relative', overflow: 'visible' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: '#4B8BFF', borderRadius: 3 }} />
          <div style={{
            position: 'absolute', top: -3, left: `${pct}%`,
            width: 12, height: 12, borderRadius: '50%',
            background: '#4B8BFF', transform: 'translateX(-50%)', pointerEvents: 'none',
          }} />
        </div>

        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{formatTC(duration, 30)}</span>

        <button onClick={() => setMuted(m => !m)} style={btnStyle}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>
    </div>
  );
}

/* ── Text layer drawing ── */
function drawTextLayer(ctx, layer, ch, compositionHeight) {
  const fSize = ((layer.fontSize ?? 48) / compositionHeight) * ch;
  ctx.font = `${layer.fontItalic ? 'italic ' : ''}${layer.fontBold ? 'bold ' : ''}${fSize}px ${layer.fontFamily ?? 'Arial'}`;
  ctx.textAlign    = layer.textAlign    ?? 'center';
  ctx.textBaseline = 'middle';

  const text = layer.text ?? '';
  const lines = text.split('\n');
  const lineH = fSize * (layer.lineHeight ?? 1.2);
  const startY = -((lines.length - 1) * lineH) / 2;

  if (layer.textShadow) {
    ctx.shadowColor   = layer.textShadowColor   ?? 'rgba(0,0,0,0.8)';
    ctx.shadowBlur    = layer.textShadowBlur    ?? 4;
    ctx.shadowOffsetX = layer.textShadowOffsetX ?? 2;
    ctx.shadowOffsetY = layer.textShadowOffsetY ?? 2;
  }

  lines.forEach((line, i) => {
    const y = startY + i * lineH;
    if ((layer.textStroke ?? 0) > 0) {
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.lineWidth = (layer.textStroke / compositionHeight) * ch * 2;
      ctx.strokeStyle = layer.textStrokeColor ?? '#000000';
      ctx.strokeText(line, 0, y);
      if (layer.textShadow) {
        ctx.shadowColor   = layer.textShadowColor   ?? 'rgba(0,0,0,0.8)';
        ctx.shadowBlur    = layer.textShadowBlur    ?? 4;
        ctx.shadowOffsetX = layer.textShadowOffsetX ?? 2;
        ctx.shadowOffsetY = layer.textShadowOffsetY ?? 2;
      }
    }
    ctx.fillStyle = layer.fontColor ?? '#ffffff';
    ctx.fillText(line, 0, y);
  });

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

/* ── Shape layer drawing ── */
function drawShapeLayer(ctx, layer, compositionWidth, compositionHeight, scx, scy) {
  const sw = ((layer.shapeWidth ?? 400) / compositionWidth) * (compositionWidth * scx);
  const sh = ((layer.shapeHeight ?? 300) / compositionHeight) * (compositionHeight * scy);

  ctx.beginPath();
  if (layer.shapeType === 'ellipse') {
    ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, Math.PI * 2);
  } else {
    const r = Math.min(layer.cornerRadius ?? 0, sw / 2, sh / 2);
    if (r > 0) {
      ctx.roundRect(-sw / 2, -sh / 2, sw, sh, r);
    } else {
      ctx.rect(-sw / 2, -sh / 2, sw, sh);
    }
  }

  if (layer.fill) { ctx.fillStyle = layer.fill; ctx.fill(); }
  if (layer.stroke && (layer.strokeWidth ?? 0) > 0) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth;
    ctx.stroke();
  }
}

const btnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#aaa', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 3, transition: 'background 0.1s, color 0.1s',
};
