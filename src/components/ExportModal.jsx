import { useState, useRef } from 'react';
import { X, Download, Film, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Platform presets ──────────────────────────────────────────────────────────
const PRESETS = [
  // YouTube
  { id: 'yt-4k',        group: 'YouTube',    label: 'YouTube 4K',             icon: '▶', w: 3840, h: 2160, fps: 30,  ratio: '16:9' },
  { id: 'yt-1080',      group: 'YouTube',    label: 'YouTube 1080p',          icon: '▶', w: 1920, h: 1080, fps: 30,  ratio: '16:9' },
  { id: 'yt-720',       group: 'YouTube',    label: 'YouTube 720p',           icon: '▶', w: 1280, h: 720,  fps: 30,  ratio: '16:9' },
  { id: 'yt-shorts',    group: 'YouTube',    label: 'YouTube Shorts',         icon: '▶', w: 1080, h: 1920, fps: 60,  ratio: '9:16' },
  // TikTok
  { id: 'tt-1080',      group: 'TikTok',     label: 'TikTok HD',              icon: '♪', w: 1080, h: 1920, fps: 60,  ratio: '9:16' },
  { id: 'tt-720',       group: 'TikTok',     label: 'TikTok Standard',        icon: '♪', w: 720,  h: 1280, fps: 30,  ratio: '9:16' },
  // Instagram
  { id: 'ig-reels',     group: 'Instagram',  label: 'Reels / Story',          icon: '◈', w: 1080, h: 1920, fps: 30,  ratio: '9:16' },
  { id: 'ig-portrait',  group: 'Instagram',  label: 'Feed Portrait (4:5)',    icon: '◈', w: 1080, h: 1350, fps: 30,  ratio: '4:5'  },
  { id: 'ig-square',    group: 'Instagram',  label: 'Feed Square (1:1)',      icon: '◈', w: 1080, h: 1080, fps: 30,  ratio: '1:1'  },
  { id: 'ig-landscape', group: 'Instagram',  label: 'Feed Landscape (1.91:1)',icon: '◈', w: 1080, h: 566,  fps: 30,  ratio: '1.91:1'},
  // Twitter / X
  { id: 'tw-1080',      group: 'Twitter/X',  label: 'Twitter/X Landscape',   icon: '✕', w: 1920, h: 1080, fps: 30,  ratio: '16:9' },
  { id: 'tw-square',    group: 'Twitter/X',  label: 'Twitter/X Square',      icon: '✕', w: 1080, h: 1080, fps: 30,  ratio: '1:1'  },
  { id: 'tw-portrait',  group: 'Twitter/X',  label: 'Twitter/X Portrait',    icon: '✕', w: 1080, h: 1350, fps: 30,  ratio: '4:5'  },
  // Vimeo
  { id: 'vi-4k',        group: 'Vimeo',      label: 'Vimeo 4K',              icon: '⬡', w: 3840, h: 2160, fps: 30,  ratio: '16:9' },
  { id: 'vi-1080',      group: 'Vimeo',      label: 'Vimeo 1080p',           icon: '⬡', w: 1920, h: 1080, fps: 30,  ratio: '16:9' },
  // Cinema / Film
  { id: 'cin-4k-dci',   group: 'Cinema',     label: 'DCI 4K (4096×2160)',    icon: '🎞', w: 4096, h: 2160, fps: 24,  ratio: '1.9:1' },
  { id: 'cin-2k',       group: 'Cinema',     label: 'DCI 2K (2048×1080)',    icon: '🎞', w: 2048, h: 1080, fps: 24,  ratio: '1.9:1' },
  { id: 'cin-1080-24',  group: 'Cinema',     label: '1080p Cinematic (24fps)',icon: '🎞',w: 1920, h: 1080, fps: 24,  ratio: '16:9' },
  // Custom
  { id: 'custom',       group: 'Custom',     label: 'Custom…',               icon: '⚙', w: 1920, h: 1080, fps: 30,  ratio: '' },
];

const PRESET_GROUPS = [...new Set(PRESETS.map(p => p.group))];

const QUALITIES = {
  'Lossless (Best)': 20_000_000,
  'High':             8_000_000,
  'Medium':           4_000_000,
  'Low':              1_500_000,
  'Draft':              500_000,
};

const FPS_OPTIONS = [12, 24, 25, 29.97, 30, 48, 50, 59.94, 60];

// Detect which MIME types the browser supports
function detectMimeTypes() {
  const candidates = [
    { label: 'WebM VP9 (Best)', mime: 'video/webm;codecs=vp9' },
    { label: 'WebM VP8',        mime: 'video/webm;codecs=vp8' },
    { label: 'WebM H.264',      mime: 'video/webm;codecs=h264' },
    { label: 'MP4 H.264',       mime: 'video/mp4;codecs=h264' },
    { label: 'WebM (auto)',     mime: 'video/webm' },
  ];
  return candidates.filter(c => {
    try { return MediaRecorder.isTypeSupported(c.mime); } catch { return false; }
  });
}

const SUPPORTED_MIMES = detectMimeTypes();

export default function ExportModal({ onClose, layers, compositionDuration, compositionWidth, compositionHeight }) {
  const defaultPreset = PRESETS.find(p => p.id === 'yt-1080');
  const [selectedPresetId, setSelectedPresetId] = useState('yt-1080');
  const [customW,    setCustomW]    = useState(1920);
  const [customH,    setCustomH]    = useState(1080);
  const [fps,        setFps]        = useState(defaultPreset.fps);
  const [quality,    setQuality]    = useState('High');
  const [mimeChoice, setMimeChoice] = useState(SUPPORTED_MIMES[0]?.mime ?? 'video/webm');
  const [progress,   setProgress]   = useState(0);
  const [status,     setStatus]     = useState('idle');
  const [errMsg,     setErrMsg]     = useState('');
  const [showGroups, setShowGroups] = useState({});
  const cancelRef = useRef(false);

  const preset = PRESETS.find(p => p.id === selectedPresetId) ?? PRESETS[0];
  const outW = selectedPresetId === 'custom' ? customW : preset.w;
  const outH = selectedPresetId === 'custom' ? customH : preset.h;

  function selectPreset(p) {
    setSelectedPresetId(p.id);
    if (p.id !== 'custom') setFps(p.fps);
  }

  function toggleGroup(g) {
    setShowGroups(prev => ({ ...prev, [g]: !prev[g] }));
  }

  async function handleExport() {
    cancelRef.current = false;
    setStatus('exporting');
    setProgress(0);

    try {
      const w      = Math.max(2, Math.round(outW));
      const h      = Math.max(2, Math.round(outH));
      const fpsVal = Number(fps) || 30;

      // Offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Use user-selected mime type, fall back gracefully
      const activeMime = (mimeChoice && MediaRecorder.isTypeSupported(mimeChoice))
        ? mimeChoice
        : SUPPORTED_MIMES[0]?.mime ?? null;
      if (!activeMime) throw new Error('MediaRecorder is not supported in this browser.');

      // Set up recorder
      const stream = canvas.captureStream(fpsVal);
      const chunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: activeMime,
        videoBitsPerSecond: QUALITIES[quality],
      });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      // Create video elements for video layers
      const videoEls = {};
      for (const layer of layers) {
        if (layer.type === 'video' && layer.url) {
          const vid = document.createElement('video');
          vid.src  = layer.url;
          vid.muted = true;
          vid.crossOrigin = 'anonymous';
          await new Promise(r => { vid.onloadedmetadata = r; vid.onerror = r; vid.load(); setTimeout(r, 3000); });
          videoEls[layer.id] = vid;
        }
      }

      // Image cache
      const imageCache = {};
      for (const layer of layers) {
        if (layer.type === 'photo' && layer.url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = layer.url;
          await new Promise(r => { img.onload = r; img.onerror = r; if (img.complete) r(); });
          imageCache[layer.url] = img;
        }
      }

      recorder.start();

      const totalFrames = Math.ceil(compositionDuration * fpsVal);
      const scaleX = w / compositionWidth;
      const scaleY = h / compositionHeight;

      // Pre-sort layers once (layer order doesn't change during export)
      const sortedLayers = [...layers].sort((a, b) => b.trackIndex - a.trackIndex);

      for (let frame = 0; frame < totalFrames; frame++) {
        if (cancelRef.current) { recorder.stop(); return; }

        const time = frame / fpsVal;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const visible = sortedLayers.filter(
          l => l.visible && time >= l.startTime && time < l.startTime + l.duration
        );

        for (const layer of visible) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, layer.transform?.opacity ?? 1));

          const cx = (compositionWidth / 2 + (layer.transform?.x ?? 0)) * scaleX;
          const cy = (compositionHeight / 2 + (layer.transform?.y ?? 0)) * scaleY;
          ctx.translate(cx, cy);
          ctx.rotate(((layer.transform?.rotation ?? 0) * Math.PI) / 180);
          ctx.scale(
            (layer.transform?.scaleX ?? 1) * scaleX,
            (layer.transform?.scaleY ?? 1) * scaleY
          );

          const hw = compositionWidth  / 2;
          const hh = compositionHeight / 2;

          if (layer.type === 'video' && videoEls[layer.id]) {
            const vid  = videoEls[layer.id];
            const srcT = time - layer.startTime + (layer.trimIn ?? 0);
            vid.currentTime = Math.max(0, srcT);
            await new Promise(r => { vid.onseeked = r; setTimeout(r, 16); });
            if (vid.readyState >= 2) ctx.drawImage(vid, -hw, -hh, compositionWidth, compositionHeight);
          } else if (layer.type === 'photo' && imageCache[layer.url]) {
            const img = imageCache[layer.url];
            if (img.naturalWidth > 0) ctx.drawImage(img, -hw, -hh, compositionWidth, compositionHeight);
          } else if (layer.type === 'text') {
            ctx.font = `${layer.fontSize ?? 48}px ${layer.fontFamily ?? 'Arial'}`;
            ctx.fillStyle = layer.fontColor ?? '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(layer.text ?? '', 0, 0);
          }

          ctx.restore();
        }

        setProgress((frame + 1) / totalFrames);
        await new Promise(r => setTimeout(r, 0));
      }

      recorder.stop();
      await new Promise(r => { recorder.onstop = r; });

      // Pick file extension from mime type
      const ext = activeMime.startsWith('video/mp4') ? 'mp4'
                : activeMime.startsWith('video/webm') ? 'webm'
                : 'video';
      const sanitizedPresetName = preset.id !== 'custom' ? preset.label.replace(/[^a-zA-Z0-9]/g, '_') : 'custom';
      const blob = new Blob(chunks, { type: activeMime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `videoforge_${sanitizedPresetName}_${fpsVal}fps_${Date.now()}.${ext}`;
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

  // ── Shared styles ──
  const selStyle = { display: 'block', marginTop: 4, width: '100%', background: '#111', border: '1px solid #333', borderRadius: 3, color: '#ccc', padding: '5px 8px', fontSize: 12, outline: 'none' };
  const labelStyle = { fontSize: 11, color: '#888' };
  const sectionHead = { fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '10px 0 4px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} className="fade-in">
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, width: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.9)' }}>

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
              <button onClick={onClose} style={{ padding: '6px 24px', background: '#252525', border: '1px solid #333', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
                Close
              </button>
            </div>

          ) : status === 'error' ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <AlertCircle size={32} style={{ color: '#ff6655', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ color: '#ff8877', fontSize: 12, marginBottom: 12 }}>{errMsg}</p>
              <button onClick={() => setStatus('idle')} style={{ padding: '5px 16px', background: '#2a2a2a', border: '1px solid #333', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
                Back
              </button>
            </div>

          ) : (
            <>
              {/* ── Platform Presets ── */}
              <p style={sectionHead}>Platform Preset</p>
              <div style={{ border: '1px solid #2a2a2a', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                {PRESET_GROUPS.map(group => {
                  const groupPresets = PRESETS.filter(p => p.group === group);
                  const isOpen = showGroups[group] !== false; // default open
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
                                style={{
                                  background: active ? '#1a3050' : 'transparent',
                                  border: 'none',
                                  borderBottom: '1px solid #222',
                                  borderRight: '1px solid #222',
                                  padding: '6px 10px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1,
                                }}
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

              {/* Custom dimensions (shown when Custom is selected) */}
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

              {/* ── FPS, Quality, Format row ── */}
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
                    {Object.keys(QUALITIES).map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Codec / Format
                  {SUPPORTED_MIMES.length === 0 ? (
                    <span style={{ display: 'block', marginTop: 4, color: '#ff6655', fontSize: 11 }}>Not supported</span>
                  ) : (
                    <select value={mimeChoice} onChange={e => setMimeChoice(e.target.value)} disabled={status === 'exporting'} style={{ ...selStyle, marginTop: 4 }}>
                      {SUPPORTED_MIMES.map(m => <option key={m.mime} value={m.mime}>{m.label}</option>)}
                    </select>
                  )}
                </label>
              </div>

              {/* Summary line */}
              <div style={{ marginTop: 10, padding: '6px 8px', background: '#141414', borderRadius: 3, border: '1px solid #2a2a2a', fontSize: 10, color: '#666', lineHeight: '1.6', fontFamily: 'monospace' }}>
                <span style={{ color: '#888' }}>{outW}×{outH}</span>
                {preset.ratio && <span> · {preset.ratio}</span>}
                {' · '}<span style={{ color: '#888' }}>{fps} fps</span>
                {' · '}{SUPPORTED_MIMES.find(m => m.mime === mimeChoice)?.label ?? mimeChoice}
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

        {/* Footer buttons */}
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
                  disabled={layers.length === 0 || SUPPORTED_MIMES.length === 0}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    cursor: (layers.length === 0 || SUPPORTED_MIMES.length === 0) ? 'not-allowed' : 'pointer',
                    background: (layers.length === 0 || SUPPORTED_MIMES.length === 0) ? '#1a1a2a' : '#1a3a6a',
                    border: '1px solid #2a5aaa',
                    color: (layers.length === 0 || SUPPORTED_MIMES.length === 0) ? '#444' : '#6aadff',
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
