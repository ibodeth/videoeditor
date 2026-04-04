import { useState, useRef, useEffect } from 'react';
import { X, Download, Film, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Platform presets ──────────────────────────────────────────────────────────
const PRESETS = [
  { id: 'yt-4k',        group: 'YouTube',    label: 'YouTube 4K',              icon: '▶', w: 3840, h: 2160, fps: 30,  ratio: '16:9' },
  { id: 'yt-1080',      group: 'YouTube',    label: 'YouTube 1080p',           icon: '▶', w: 1920, h: 1080, fps: 30,  ratio: '16:9' },
  { id: 'yt-720',       group: 'YouTube',    label: 'YouTube 720p',            icon: '▶', w: 1280, h: 720,  fps: 30,  ratio: '16:9' },
  { id: 'yt-shorts',    group: 'YouTube',    label: 'YouTube Shorts',          icon: '▶', w: 1080, h: 1920, fps: 60,  ratio: '9:16' },
  { id: 'tt-1080',      group: 'TikTok',     label: 'TikTok HD',               icon: '♪', w: 1080, h: 1920, fps: 60,  ratio: '9:16' },
  { id: 'tt-720',       group: 'TikTok',     label: 'TikTok Standard',         icon: '♪', w: 720,  h: 1280, fps: 30,  ratio: '9:16' },
  { id: 'ig-reels',     group: 'Instagram',  label: 'Reels / Story',           icon: '◈', w: 1080, h: 1920, fps: 30,  ratio: '9:16' },
  { id: 'ig-portrait',  group: 'Instagram',  label: 'Feed Portrait (4:5)',     icon: '◈', w: 1080, h: 1350, fps: 30,  ratio: '4:5'  },
  { id: 'ig-square',    group: 'Instagram',  label: 'Feed Square (1:1)',       icon: '◈', w: 1080, h: 1080, fps: 30,  ratio: '1:1'  },
  { id: 'ig-landscape', group: 'Instagram',  label: 'Feed Landscape (1.91:1)', icon: '◈', w: 1080, h: 566,  fps: 30,  ratio: '1.91:1'},
  { id: 'tw-1080',      group: 'Twitter/X',  label: 'Twitter/X Landscape',    icon: '✕', w: 1920, h: 1080, fps: 30,  ratio: '16:9' },
  { id: 'tw-square',    group: 'Twitter/X',  label: 'Twitter/X Square',       icon: '✕', w: 1080, h: 1080, fps: 30,  ratio: '1:1'  },
  { id: 'vi-4k',        group: 'Vimeo',      label: 'Vimeo 4K',               icon: '⬡', w: 3840, h: 2160, fps: 30,  ratio: '16:9' },
  { id: 'vi-1080',      group: 'Vimeo',      label: 'Vimeo 1080p',            icon: '⬡', w: 1920, h: 1080, fps: 30,  ratio: '16:9' },
  { id: 'cin-4k-dci',   group: 'Cinema',     label: 'DCI 4K (4096×2160)',     icon: '🎞', w: 4096, h: 2160, fps: 24,  ratio: '1.9:1' },
  { id: 'cin-2k',       group: 'Cinema',     label: 'DCI 2K (2048×1080)',     icon: '🎞', w: 2048, h: 1080, fps: 24,  ratio: '1.9:1' },
  { id: 'cin-1080-24',  group: 'Cinema',     label: '1080p Cinematic (24fps)', icon: '🎞', w: 1920, h: 1080, fps: 24,  ratio: '16:9' },
  { id: 'custom',       group: 'Custom',     label: 'Custom…',                icon: '⚙', w: 1920, h: 1080, fps: 30,  ratio: '' },
];

const PRESET_GROUPS = [...new Set(PRESETS.map(p => p.group))];

const QUALITY_PRESETS = [
  { label: 'Lossless (Best)', videoBitrate: 20_000_000, h264Bitrate: 15_000_000 },
  { label: 'High',            videoBitrate:  8_000_000, h264Bitrate:  6_000_000 },
  { label: 'Medium',          videoBitrate:  4_000_000, h264Bitrate:  3_000_000 },
  { label: 'Low',             videoBitrate:  1_500_000, h264Bitrate:  1_200_000 },
  { label: 'Draft',           videoBitrate:    500_000, h264Bitrate:    400_000 },
];

const FPS_OPTIONS = [12, 24, 25, 29.97, 30, 48, 50, 59.94, 60];

// ─── Format detection ────────────────────────────────────────────────────────
const FORMAT_OPTIONS = [];

// Always add WebM options
['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].forEach(mime => {
  try {
    if (MediaRecorder.isTypeSupported(mime)) {
      const label = mime.includes('vp9') ? 'WebM VP9' : mime.includes('vp8') ? 'WebM VP8' : 'WebM';
      if (!FORMAT_OPTIONS.find(f => f.mime === mime))
        FORMAT_OPTIONS.push({ label, mime, engine: 'mediarecorder', ext: 'webm' });
    }
  } catch { /* ignore */ }
});

// MP4 via WebCodecs VideoEncoder (Chrome 94+, Edge 94+)
const MP4_CODECS = [
  { codec: 'avc1.42E01E', label: 'MP4 H.264 (Baseline)', bitrate: 6_000_000 },
  { codec: 'avc1.4D401E', label: 'MP4 H.264 (Main)',     bitrate: 6_000_000 },
  { codec: 'hvc1.1.6.L93.B0', label: 'MP4 H.265/HEVC',  bitrate: 4_000_000 },
  { codec: 'av01.0.08M.08', label: 'MP4 AV1',            bitrate: 3_000_000 },
];

for (const opt of MP4_CODECS) {
  if (typeof VideoEncoder !== 'undefined') {
    FORMAT_OPTIONS.push({ label: opt.label, mime: 'video/mp4', engine: 'webcodecs', ext: 'mp4', codec: opt.codec });
    break; // Add only first supported; we'll check at export time
  }
}

// ─── Canvas rendering helpers ────────────────────────────────────────────────
function buildLayerFilter(layer) {
  const parts = [];
  if (layer.brightness !== undefined && layer.brightness !== 100) parts.push(`brightness(${layer.brightness / 100})`);
  if (layer.contrast   !== undefined && layer.contrast   !== 100) parts.push(`contrast(${layer.contrast / 100})`);
  if (layer.saturation !== undefined && layer.saturation !== 100) parts.push(`saturate(${layer.saturation / 100})`);
  if (layer.hue        !== undefined && layer.hue        !== 0)   parts.push(`hue-rotate(${layer.hue}deg)`);
  if (layer.effects && layer.effects.length > 0 && layer.effects[0] !== 'none') parts.push(layer.effects[0]);
  return parts.join(' ') || 'none';
}

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

function getTransformAtTime(layer, time) {
  const kfs = layer.keyframes || {};
  const relTime = time - layer.startTime;
  const base = layer.transform || {};
  const get = (prop, fallback) => {
    if (kfs[prop]?.length > 0) { const v = interpolateKF(kfs[prop], relTime); if (v !== null) return v; }
    return base[prop] ?? fallback;
  };
  return { x: get('x',0), y: get('y',0), anchorX: get('anchorX',0), anchorY: get('anchorY',0), scaleX: get('scaleX',1), scaleY: get('scaleY',1), rotation: get('rotation',0), opacity: get('opacity',1), skewX: get('skewX',0), skewY: get('skewY',0) };
}

// How long to wait for a 'seeked' event before giving up (ms).
// Some videos / browsers are slow to dispatch seeked on cross-origin blobs.
const SEEK_TIMEOUT_MS = 800;

async function seekVideo(vid, targetTime) {
  return new Promise((resolve) => {
    if (Math.abs(vid.currentTime - targetTime) < 0.005) { resolve(); return; }
    let resolved = false;
    const onSeeked = () => {
      if (resolved) return;
      resolved = true;
      vid.removeEventListener('seeked', onSeeked);
      resolve();
    };
    vid.addEventListener('seeked', onSeeked);
    vid.currentTime = Math.max(0, targetTime);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        vid.removeEventListener('seeked', onSeeked);
        resolve();
      }
    }, SEEK_TIMEOUT_MS);
  });
}

function renderFrameToCanvas(ctx, layers, time, w, h, compositionWidth, compositionHeight, videoEls, imageCache) {
  const scaleX = w / compositionWidth;
  const scaleY = h / compositionHeight;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const visible = [...layers]
    .filter(l => l.visible && time >= l.startTime && time < l.startTime + l.duration)
    .sort((a, b) => b.trackIndex - a.trackIndex);

  for (const layer of visible) {
    ctx.save();
    const tr = getTransformAtTime(layer, time);
    ctx.globalAlpha = Math.max(0, Math.min(1, tr.opacity));
    ctx.globalCompositeOperation = layer.blendMode || 'source-over';

    const filterStr = buildLayerFilter(layer);
    if (filterStr !== 'none') ctx.filter = filterStr;

    const ds = layer.dropShadow;
    if (ds?.enabled) {
      ctx.shadowColor   = ds.color   || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur    = ds.blur    ?? 10;
      ctx.shadowOffsetX = ds.offsetX ?? 5;
      ctx.shadowOffsetY = ds.offsetY ?? 5;
    }

    const cx = (compositionWidth  / 2 + tr.x) * scaleX;
    const cy = (compositionHeight / 2 + tr.y) * scaleY;
    ctx.translate(cx, cy);
    ctx.rotate((tr.rotation * Math.PI) / 180);
    ctx.scale(tr.scaleX * scaleX, tr.scaleY * scaleY);
    // Skew
    if (tr.skewX || tr.skewY) {
      ctx.transform(1, Math.tan(tr.skewY * Math.PI / 180), Math.tan(tr.skewX * Math.PI / 180), 1, 0, 0);
    }
    // Anchor point (composition units; no extra scaleX needed here since scale already folded in)
    if (tr.anchorX || tr.anchorY) {
      ctx.translate(-tr.anchorX, -tr.anchorY);
    }

    const hw = compositionWidth  / 2;
    const hh = compositionHeight / 2;

    if (layer.type === 'video' && videoEls[layer.id]) {
      const vid = videoEls[layer.id];
      if (vid.readyState >= 2) ctx.drawImage(vid, -hw, -hh, compositionWidth, compositionHeight);
    } else if (layer.type === 'photo' && imageCache[layer.url]) {
      const img = imageCache[layer.url];
      if (img.naturalWidth > 0) ctx.drawImage(img, -hw, -hh, compositionWidth, compositionHeight);
    } else if (layer.type === 'text') {
      drawText(ctx, layer);
    } else if (layer.type === 'shape') {
      drawShape(ctx, layer);
    }
    ctx.restore();
  }
}

function drawText(ctx, layer) {
  const fSize = layer.fontSize ?? 48;
  ctx.font = `${layer.fontItalic ? 'italic ' : ''}${layer.fontBold ? 'bold ' : ''}${fSize}px ${layer.fontFamily ?? 'Arial'}`;
  ctx.textAlign    = layer.textAlign ?? 'center';
  ctx.textBaseline = 'middle';
  const text  = layer.text ?? '';
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
      ctx.lineWidth = layer.textStroke * 2;
      ctx.strokeStyle = layer.textStrokeColor ?? '#000000';
      ctx.strokeText(line, 0, y);
    }
    ctx.fillStyle = layer.fontColor ?? '#ffffff';
    ctx.fillText(line, 0, y);
  });
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

function drawShape(ctx, layer) {
  const sw = layer.shapeWidth  ?? 400;
  const sh = layer.shapeHeight ?? 300;
  ctx.beginPath();
  if (layer.shapeType === 'ellipse') {
    ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, Math.PI * 2);
  } else {
    const r = Math.min(layer.cornerRadius ?? 0, sw / 2, sh / 2);
    if (r > 0) ctx.roundRect(-sw / 2, -sh / 2, sw, sh, r);
    else       ctx.rect(-sw / 2, -sh / 2, sw, sh);
  }
  if (layer.fill)   { ctx.fillStyle = layer.fill; ctx.fill(); }
  if (layer.stroke && (layer.strokeWidth ?? 0) > 0) { ctx.strokeStyle = layer.stroke; ctx.lineWidth = layer.strokeWidth; ctx.stroke(); }
}

// ─── Export via MediaRecorder (WebM) ────────────────────────────────────────
async function exportWebM({ canvas, layers, compositionDuration, compositionWidth, compositionHeight, fpsVal, videoBitrate, mimeType, cancelRef, setProgress }) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');

  const videoEls  = {};
  const imageCache = {};

  for (const layer of layers) {
    if (layer.type === 'video' && layer.url) {
      const vid = document.createElement('video');
      vid.src = layer.url; vid.muted = true; vid.crossOrigin = 'anonymous';
      await new Promise(r => { vid.onloadedmetadata = r; vid.onerror = r; vid.load(); setTimeout(r, 3000); });
      videoEls[layer.id] = vid;
    }
    if (layer.type === 'photo' && layer.url) {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = layer.url;
      await new Promise(r => { img.onload = r; img.onerror = r; if (img.complete) r(); });
      imageCache[layer.url] = img;
    }
  }

  const stream   = canvas.captureStream(fpsVal);
  const chunks   = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: videoBitrate });
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start();

  const totalFrames   = Math.ceil(compositionDuration * fpsVal);
  const sortedLayers  = [...layers].sort((a, b) => b.trackIndex - a.trackIndex);

  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelRef.current) { recorder.stop(); return null; }
    const time = frame / fpsVal;

    // Seek all video layers to correct position
    for (const layer of sortedLayers) {
      if (layer.type !== 'video' || !videoEls[layer.id]) continue;
      const isActive = time >= layer.startTime && time < layer.startTime + layer.duration;
      if (isActive) {
        const speed   = layer.speed ?? 1;
        const srcTime = (time - layer.startTime) * speed + (layer.trimIn ?? 0);
        await seekVideo(videoEls[layer.id], srcTime);
      }
    }

    renderFrameToCanvas(ctx, sortedLayers, time, w, h, compositionWidth, compositionHeight, videoEls, imageCache);
    setProgress((frame + 1) / totalFrames);
    // Yield to allow canvas to flush
    await new Promise(r => setTimeout(r, 0));
  }

  recorder.stop();
  await new Promise(r => { recorder.onstop = r; });
  return new Blob(chunks, { type: mimeType });
}

// ─── Export via WebCodecs + mp4-muxer (MP4) ─────────────────────────────────
async function exportMP4({ canvas, layers, compositionDuration, compositionWidth, compositionHeight, fpsVal, videoBitrate, codec, cancelRef, setProgress }) {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');

  // Check VideoEncoder support for codec
  const support = await VideoEncoder.isConfigSupported({ codec, width: w, height: h });
  if (!support.supported) throw new Error(`Codec ${codec} not supported in this browser. Try a different format.`);

  const videoEls   = {};
  const imageCache = {};

  for (const layer of layers) {
    if (layer.type === 'video' && layer.url) {
      const vid = document.createElement('video');
      vid.src = layer.url; vid.muted = true; vid.crossOrigin = 'anonymous';
      await new Promise(r => { vid.onloadedmetadata = r; vid.onerror = r; vid.load(); setTimeout(r, 3000); });
      videoEls[layer.id] = vid;
    }
    if (layer.type === 'photo' && layer.url) {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = layer.url;
      await new Promise(r => { img.onload = r; img.onerror = r; if (img.complete) r(); });
      imageCache[layer.url] = img;
    }
  }

  const target = new ArrayBufferTarget();
  const muxer  = new Muxer({
    target,
    video: { codec: 'avc', width: w, height: h },
    fastStart: 'in-memory',
  });

  let encodeError = null;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => { encodeError = e; },
  });

  encoder.configure({ codec, width: w, height: h, bitrate: videoBitrate, framerate: fpsVal });

  const totalFrames  = Math.ceil(compositionDuration * fpsVal);
  const sortedLayers = [...layers].sort((a, b) => b.trackIndex - a.trackIndex);
  const frameDuration = 1_000_000 / fpsVal; // microseconds

  for (let frame = 0; frame < totalFrames; frame++) {
    if (cancelRef.current) { encoder.close(); return null; }
    if (encodeError) throw encodeError;

    const time = frame / fpsVal;

    for (const layer of sortedLayers) {
      if (layer.type !== 'video' || !videoEls[layer.id]) continue;
      const isActive = time >= layer.startTime && time < layer.startTime + layer.duration;
      if (isActive) {
        const speed   = layer.speed ?? 1;
        const srcTime = (time - layer.startTime) * speed + (layer.trimIn ?? 0);
        await seekVideo(videoEls[layer.id], srcTime);
      }
    }

    renderFrameToCanvas(ctx, sortedLayers, time, w, h, compositionWidth, compositionHeight, videoEls, imageCache);

    const imageBitmap = await createImageBitmap(canvas);
    const videoFrame  = new VideoFrame(imageBitmap, { timestamp: Math.round(frame * frameDuration) });
    encoder.encode(videoFrame, { keyFrame: frame % (fpsVal * 2) === 0 });
    videoFrame.close();
    imageBitmap.close();

    setProgress((frame + 1) / totalFrames);
    await new Promise(r => setTimeout(r, 0));
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  return new Blob([target.buffer], { type: 'video/mp4' });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExportModal({ onClose, layers, compositionDuration, compositionWidth, compositionHeight, fps: defaultFps = 30 }) {
  const [selectedPresetId, setSelectedPresetId] = useState('yt-1080');
  const [customW,    setCustomW]    = useState(1920);
  const [customH,    setCustomH]    = useState(1080);
  const [fps,        setFps]        = useState(defaultFps);
  const [quality,    setQuality]    = useState('High');
  const [format,     setFormat]     = useState(FORMAT_OPTIONS[0] ?? null);
  const [progress,   setProgress]   = useState(0);
  const [status,     setStatus]     = useState('idle');  // idle | exporting | done | error
  const [errMsg,     setErrMsg]     = useState('');
  const [showGroups, setShowGroups] = useState({});
  const cancelRef = useRef(false);

  const preset = PRESETS.find(p => p.id === selectedPresetId) ?? PRESETS[0];
  const outW = selectedPresetId === 'custom' ? customW : preset.w;
  const outH = selectedPresetId === 'custom' ? customH : preset.h;

  // Ensure format options are up to date
  const [availableFormats, setAvailableFormats] = useState(FORMAT_OPTIONS);
  useEffect(() => {
    // Probe WebCodecs for supported MP4 codecs
    if (typeof VideoEncoder === 'undefined') return;
    const probeCodecs = async () => {
      const mp4Options = [];
      for (const opt of MP4_CODECS) {
        try {
          const support = await VideoEncoder.isConfigSupported({ codec: opt.codec, width: 1920, height: 1080 });
          if (support.supported) {
            mp4Options.push({ label: opt.label, mime: 'video/mp4', engine: 'webcodecs', ext: 'mp4', codec: opt.codec });
          }
        } catch { /* skip */ }
      }
      if (mp4Options.length > 0) {
        const sorted = [...mp4Options, ...FORMAT_OPTIONS.filter(f => f.ext !== 'mp4')];
        setAvailableFormats(sorted);
        setFormat(sorted[0]);
      }
    };
    probeCodecs();
  }, []);

  function selectPreset(p) {
    setSelectedPresetId(p.id);
    if (p.id !== 'custom') setFps(p.fps);
  }

  function toggleGroup(g) {
    setShowGroups(prev => ({ ...prev, [g]: !prev[g] }));
  }

  async function handleExport() {
    if (!format) { setErrMsg('No supported export format found in this browser.'); setStatus('error'); return; }
    cancelRef.current = false;
    setStatus('exporting');
    setProgress(0);

    try {
      const w      = Math.max(2, Math.round(outW));
      const h      = Math.max(2, Math.round(outH));
      const fpsVal = Number(fps) || 30;
      const qPreset = QUALITY_PRESETS.find(q => q.label === quality) ?? QUALITY_PRESETS[1];

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;

      let blob = null;

      if (format.engine === 'webcodecs' && typeof VideoEncoder !== 'undefined') {
        blob = await exportMP4({
          canvas, layers, compositionDuration, compositionWidth, compositionHeight,
          fpsVal, videoBitrate: qPreset.h264Bitrate, codec: format.codec,
          cancelRef, setProgress,
        });
      } else {
        blob = await exportWebM({
          canvas, layers, compositionDuration, compositionWidth, compositionHeight,
          fpsVal, videoBitrate: qPreset.videoBitrate, mimeType: format.mime,
          cancelRef, setProgress,
        });
      }

      if (!blob || cancelRef.current) { setStatus('idle'); setProgress(0); return; }

      const sanitizedPresetName = preset.id !== 'custom' ? preset.label.replace(/[^a-zA-Z0-9]/g, '_') : 'custom';
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `videoforge_${sanitizedPresetName}_${fpsVal}fps_${Date.now()}.${format.ext}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('done');
    } catch (err) {
      console.error('Export error:', err);
      setErrMsg(err.message || 'Export failed');
      setStatus('error');
    }
  }

  function handleCancel() {
    cancelRef.current = true;
    setStatus('idle');
    setProgress(0);
  }

  const selStyle    = { display: 'block', marginTop: 4, width: '100%', background: '#111', border: '1px solid #333', borderRadius: 3, color: '#ccc', padding: '5px 8px', fontSize: 12, outline: 'none' };
  const labelStyle  = { fontSize: 11, color: '#888' };
  const sectionHead = { fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '10px 0 4px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} className="fade-in">
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, width: 480, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #2a2a2a', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 5, background: '#1a3a6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={13} style={{ color: '#6aadff' }} />
          </div>
          <span style={{ fontWeight: 600, color: '#ddd', flex: 1, fontSize: 13 }}>Export Composition</span>
          <button onClick={onClose} disabled={status === 'exporting'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflow: 'auto', padding: 16, flex: 1 }}>

          {status === 'done' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1a3a2a', border: '1px solid #2a5a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Download size={22} style={{ color: '#44cc88' }} />
              </div>
              <p style={{ color: '#ccc', fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Export Complete!</p>
              <p style={{ color: '#555', fontSize: 11, marginBottom: 20 }}>File downloaded to your browser</p>
              <button onClick={onClose} style={{ padding: '6px 24px', background: '#252525', border: '1px solid #333', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Close</button>
            </div>

          ) : status === 'error' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <AlertCircle size={32} style={{ color: '#ff6655', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ color: '#ff8877', fontSize: 12, marginBottom: 12 }}>{errMsg}</p>
              <button onClick={() => setStatus('idle')} style={{ padding: '5px 16px', background: '#2a2a2a', border: '1px solid #333', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Back</button>
            </div>

          ) : (
            <>
              {/* Platform Presets */}
              <p style={sectionHead}>Platform Preset</p>
              <div style={{ border: '1px solid #2a2a2a', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                {PRESET_GROUPS.map(group => {
                  const groupPresets = PRESETS.filter(p => p.group === group);
                  const isOpen = showGroups[group] !== false;
                  return (
                    <div key={group}>
                      <button
                        onClick={() => toggleGroup(group)}
                        style={{ width: '100%', textAlign: 'left', background: '#1e1e1e', border: 'none', borderBottom: '1px solid #2a2a2a', padding: '5px 10px', color: '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                      >
                        <span>{group}</span>
                        {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                      {isOpen && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                          {groupPresets.map(p => {
                            const active = selectedPresetId === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => selectPreset(p)}
                                disabled={status === 'exporting'}
                                style={{ background: active ? '#1a3050' : 'transparent', border: 'none', borderBottom: '1px solid #222', borderRight: '1px solid #222', padding: '6px 10px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1 }}
                              >
                                <span style={{ color: active ? '#6aadff' : '#bbb', fontSize: 11, fontWeight: active ? 600 : 400 }}>{p.label}</span>
                                {p.id !== 'custom' && (
                                  <span style={{ color: active ? '#4a8acc' : '#555', fontSize: 9, fontFamily: 'monospace' }}>
                                    {p.w}×{p.h} · {p.ratio} · {p.fps}fps
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedPresetId === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <label style={labelStyle}>
                    Width (px)
                    <input type="number" min={2} max={7680} value={customW} onChange={e => setCustomW(Number(e.target.value))} disabled={status === 'exporting'} style={{ ...selStyle, marginTop: 4 }} />
                  </label>
                  <label style={labelStyle}>
                    Height (px)
                    <input type="number" min={2} max={4320} value={customH} onChange={e => setCustomH(Number(e.target.value))} disabled={status === 'exporting'} style={{ ...selStyle, marginTop: 4 }} />
                  </label>
                </div>
              )}

              {/* FPS, Quality, Format */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                <label style={labelStyle}>
                  Frame Rate
                  <select value={fps} onChange={e => setFps(Number(e.target.value))} disabled={status === 'exporting'} style={{ ...selStyle, marginTop: 4 }}>
                    {FPS_OPTIONS.map(f => <option key={f} value={f}>{f} fps</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Quality
                  <select value={quality} onChange={e => setQuality(e.target.value)} disabled={status === 'exporting'} style={{ ...selStyle, marginTop: 4 }}>
                    {QUALITY_PRESETS.map(q => <option key={q.label} value={q.label}>{q.label}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Format
                  {availableFormats.length === 0 ? (
                    <span style={{ display: 'block', marginTop: 4, color: '#ff6655', fontSize: 11 }}>Not supported</span>
                  ) : (
                    <select
                      value={format?.label ?? ''}
                      onChange={e => setFormat(availableFormats.find(f => f.label === e.target.value) ?? null)}
                      disabled={status === 'exporting'}
                      style={{ ...selStyle, marginTop: 4 }}
                    >
                      {availableFormats.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
                    </select>
                  )}
                </label>
              </div>

              {/* Summary */}
              <div style={{ marginTop: 10, padding: '6px 8px', background: '#141414', borderRadius: 3, border: '1px solid #2a2a2a', fontSize: 10, color: '#666', lineHeight: '1.6', fontFamily: 'monospace' }}>
                <span style={{ color: '#888' }}>{outW}×{outH}</span>
                {preset.ratio && <span> · {preset.ratio}</span>}
                {' · '}<span style={{ color: '#888' }}>{fps} fps</span>
                {' · '}{format?.label ?? '–'}
                {' · '}{compositionDuration}s · {layers.length} layer{layers.length !== 1 ? 's' : ''}
              </div>

              {/* Progress bar */}
              {status === 'exporting' && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Rendering frames…</span>
                    <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{Math.round(progress * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg, #4B8BFF, #7B55EE)', borderRadius: 3, transition: 'width 0.15s' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {status !== 'done' && status !== 'error' && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #222', display: 'flex', gap: 8, flexShrink: 0 }}>
            {status === 'exporting' ? (
              <button onClick={handleCancel} style={{ flex: 1, padding: '7px', background: '#3a1a1a', border: '1px solid #5a2a2a', borderRadius: 4, color: '#ff8877', cursor: 'pointer', fontSize: 12 }}>
                Cancel
              </button>
            ) : (
              <>
                <button onClick={onClose} style={{ padding: '7px 16px', background: '#222', border: '1px solid #333', borderRadius: 4, color: '#888', cursor: 'pointer', fontSize: 12 }}>
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={layers.length === 0 || availableFormats.length === 0}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    cursor: layers.length === 0 || availableFormats.length === 0 ? 'not-allowed' : 'pointer',
                    background: layers.length === 0 || availableFormats.length === 0 ? '#1a1a2a' : '#1a3a6a',
                    border: '1px solid #2a5aaa',
                    color: layers.length === 0 || availableFormats.length === 0 ? '#444' : '#6aadff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Download size={13} />
                  Export · {outW}×{outH} · {fps}fps
                </button>
              </>
            )}
          </div>
        )}

        {status !== 'done' && status !== 'error' && layers.length === 0 && (
          <p style={{ fontSize: 10, color: '#664444', textAlign: 'center', padding: '0 16px 10px' }}>Add layers to the timeline before exporting</p>
        )}
      </div>
    </div>
  );
}
