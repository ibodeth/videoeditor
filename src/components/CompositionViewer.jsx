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

export default function CompositionViewer({
  layers, currentTime, setCurrentTime,
  isPlaying, setIsPlaying,
  duration, compositionWidth, compositionHeight,
}) {
  const canvasRef   = useRef(null);
  const videoRefs   = useRef({});   // layerId -> HTMLVideoElement
  const imageCache  = useRef({});   // url -> HTMLImageElement
  const rafRef      = useRef(null);
  const lastTRef    = useRef(null);
  const ctRef       = useRef(currentTime);
  const playRef     = useRef(isPlaying);
  const layersRef   = useRef(layers);
  const [muted, setMuted] = useState(false);

  // Keep refs in sync
  useEffect(() => { ctRef.current = currentTime; }, [currentTime]);
  useEffect(() => { playRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  /* ── Manage hidden video elements ── */
  useEffect(() => {
    const videoLayers = layers.filter(l => l.type === 'video' && l.url);
    const currentIds = new Set(videoLayers.map(l => l.id));

    // Remove stale
    for (const id of Object.keys(videoRefs.current)) {
      if (!currentIds.has(id)) {
        videoRefs.current[id].src = '';
        delete videoRefs.current[id];
      }
    }
    // Add new
    for (const layer of videoLayers) {
      if (!videoRefs.current[layer.id]) {
        const vid = document.createElement('video');
        vid.src = layer.url;
        vid.muted = true;
        vid.preload = 'auto';
        vid.crossOrigin = 'anonymous';
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

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    const ls = layersRef.current;

    if (!ls.length) {
      // Dot grid empty state
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, cw, ch);
      for (let x = 20; x < cw; x += 40) {
        for (let y = 20; y < ch; y += 40) {
          ctx.fillStyle = '#2a2a2a';
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Crosshair guides
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch);
      ctx.moveTo(0, ch / 2); ctx.lineTo(cw, ch / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#444';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Drop media to begin', cw / 2, ch / 2);
      return;
    }

    // Sort: higher trackIndex drawn first (bottom layer), lower = top layer
    const visible = [...ls]
      .filter(l => l.visible && time >= l.startTime && time < l.startTime + l.duration)
      .sort((a, b) => b.trackIndex - a.trackIndex);

    for (const layer of visible) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.transform?.opacity ?? 1));

      const cx = (compositionWidth / 2 + (layer.transform?.x ?? 0)) * scx;
      const cy = (compositionHeight / 2 + (layer.transform?.y ?? 0)) * scy;
      ctx.translate(cx, cy);
      ctx.rotate(((layer.transform?.rotation ?? 0) * Math.PI) / 180);
      ctx.scale(layer.transform?.scaleX ?? 1, layer.transform?.scaleY ?? 1);

      const hw = (compositionWidth / 2) * scx;
      const hh = (compositionHeight / 2) * scy;

      if (layer.type === 'video' && videoRefs.current[layer.id]) {
        const vid = videoRefs.current[layer.id];
        const srcTime = time - layer.startTime + (layer.trimIn ?? 0);
        if (Math.abs(vid.currentTime - srcTime) > 0.05) {
          vid.currentTime = Math.max(0, srcTime);
        }
        if (vid.readyState >= 2) {
          ctx.drawImage(vid, -hw, -hh, hw * 2, hh * 2);
        }
      } else if (layer.type === 'photo' && layer.url) {
        if (!imageCache.current[layer.url]) {
          const img = new Image();
          img.src = layer.url;
          imageCache.current[layer.url] = img;
        }
        const img = imageCache.current[layer.url];
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -hw, -hh, hw * 2, hh * 2);
        }
      } else if (layer.type === 'text') {
        const fSize = ((layer.fontSize ?? 48) / compositionHeight) * ch;
        ctx.font = `${fSize}px ${layer.fontFamily ?? 'Arial'}`;
        ctx.fillStyle = layer.fontColor ?? '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.text ?? '', 0, 0);
      }

      ctx.restore();
    }
  }, [compositionWidth, compositionHeight]);

  /* ── Playback RAF loop ── */
  useEffect(() => {
    if (isPlaying) {
      // Sync ref from prop before starting loop to handle mid-composition starts
      ctRef.current = currentTime;
      lastTRef.current = performance.now();
      function tick() {
        const now = performance.now();
        const delta = (now - lastTRef.current) / 1000;
        lastTRef.current = now;
        const next = Math.min(ctRef.current + delta, duration);
        ctRef.current = next;
        setCurrentTime(next);
        drawFrame(next);
        if (next < duration) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setIsPlaying(false);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      drawFrame(ctRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, duration, drawFrame, setCurrentTime, setIsPlaying]);

  // Redraw when paused (time or layers changed)
  useEffect(() => {
    if (!isPlaying) drawFrame(currentTime);
  }, [currentTime, layers, isPlaying, drawFrame]);

  /* ── Controls ── */
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
      {/* Canvas area */}
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
        }}>
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Controls bar */}
      <div style={{
        flexShrink: 0,
        background: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Transport */}
        <button onClick={goToStart} style={btnStyle} title="Go to start">
          <SkipBack size={13} />
        </button>
        <button onClick={togglePlay} style={{ ...btnStyle, background: '#2a3a5a', color: '#6aadff', padding: '4px 10px', borderRadius: 4 }}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={goToEnd} style={btnStyle} title="Go to end">
          <SkipForward size={13} />
        </button>

        {/* Timecode */}
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa', marginLeft: 4, letterSpacing: '0.05em' }}>
          {formatTC(currentTime, 30)}
        </span>

        {/* Progress scrubber */}
        <div
          onClick={handleProgressClick}
          style={{
            flex: 1, height: 6, background: '#2a2a2a', borderRadius: 3,
            cursor: 'pointer', position: 'relative', overflow: 'visible',
          }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: '#4B8BFF', borderRadius: 3 }} />
          <div style={{
            position: 'absolute', top: -3, left: `${pct}%`,
            width: 12, height: 12, borderRadius: '50%',
            background: '#4B8BFF', transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Duration */}
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
          {formatTC(duration, 30)}
        </span>

        {/* Volume mute */}
        <button onClick={() => setMuted(m => !m)} style={btnStyle}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#aaa', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 3, transition: 'background 0.1s, color 0.1s',
};
