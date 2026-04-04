import { useState, useRef } from 'react';
import { X, Download, Film, AlertCircle } from 'lucide-react';

const RESOLUTIONS = {
  '4k':    { label: '4K (3840×2160)',   w: 3840, h: 2160 },
  '1080p': { label: '1080p (1920×1080)',w: 1920, h: 1080 },
  '720p':  { label: '720p (1280×720)',  w: 1280, h: 720  },
  '480p':  { label: '480p (854×480)',   w: 854,  h: 480  },
};
const QUALITIES = {
  'High':   8_000_000,
  'Medium': 4_000_000,
  'Low':    1_500_000,
};

export default function ExportModal({ onClose, layers, compositionDuration, compositionWidth, compositionHeight }) {
  const [resolution, setResolution] = useState('1080p');
  const [quality,    setQuality]    = useState('Medium');
  const [progress,   setProgress]   = useState(0);        // 0–1
  const [status,     setStatus]     = useState('idle');    // idle | exporting | done | error
  const [errMsg,     setErrMsg]     = useState('');
  const cancelRef = useRef(false);

  async function handleExport() {
    cancelRef.current = false;
    setStatus('exporting');
    setProgress(0);

    try {
      const { w, h } = RESOLUTIONS[resolution];
      const fps = 30;

      // Offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Check MediaRecorder support
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : null;

      if (!mimeType) throw new Error('MediaRecorder not supported in this browser.');

      // Set up recorder
      const stream = canvas.captureStream(fps);
      const chunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
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

      const totalFrames = Math.ceil(compositionDuration * fps);
      const scaleX = w / compositionWidth;
      const scaleY = h / compositionHeight;

      for (let frame = 0; frame < totalFrames; frame++) {
        if (cancelRef.current) { recorder.stop(); return; }

        const time = frame / fps;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const visible = [...layers]
          .filter(l => l.visible && time >= l.startTime && time < l.startTime + l.duration)
          .sort((a, b) => b.trackIndex - a.trackIndex);

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
            await new Promise(r => { vid.onseeked = r; setTimeout(r, 100); });
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
        // Yield to browser for progress bar updates (minimal delay)
        await new Promise(r => setTimeout(r, 0));
      }

      recorder.stop();
      await new Promise(r => { recorder.onstop = r; });

      const blob = new Blob(chunks, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `videoforge-export-${Date.now()}.webm`;
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} className="fade-in">
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, width: 360, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: '#1a3a6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={14} style={{ color: '#6aadff' }} />
          </div>
          <span style={{ fontWeight: 600, color: '#ddd', flex: 1 }}>Export Composition</span>
          <button onClick={onClose} disabled={status === 'exporting'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a3a2a', border: '1px solid #2a5a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Download size={20} style={{ color: '#44cc88' }} />
            </div>
            <p style={{ color: '#ccc', fontSize: 13, marginBottom: 4 }}>Export Complete!</p>
            <p style={{ color: '#666', fontSize: 11, marginBottom: 16 }}>Your WebM file has been downloaded</p>
            <button onClick={onClose} style={{ padding: '6px 20px', background: '#2a2a2a', border: '1px solid #333', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
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
            {/* Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888' }}>
                Resolution
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  disabled={status === 'exporting'}
                  style={{ display: 'block', marginTop: 4, width: '100%', background: '#111', border: '1px solid #333', borderRadius: 3, color: '#ccc', padding: '5px 8px', fontSize: 12, outline: 'none' }}
                >
                  {Object.entries(RESOLUTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 11, color: '#888' }}>
                Quality
                <select
                  value={quality}
                  onChange={e => setQuality(e.target.value)}
                  disabled={status === 'exporting'}
                  style={{ display: 'block', marginTop: 4, width: '100%', background: '#111', border: '1px solid #333', borderRadius: 3, color: '#ccc', padding: '5px 8px', fontSize: 12, outline: 'none' }}
                >
                  {Object.keys(QUALITIES).map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </label>

              <div style={{ fontSize: 11, color: '#555' }}>
                Format: <span style={{ color: '#888' }}>WebM (VP9)</span>
                {' · '}Duration: <span style={{ color: '#888' }}>{compositionDuration}s</span>
                {' · '}Layers: <span style={{ color: '#888' }}>{layers.length}</span>
              </div>
            </div>

            {/* Progress */}
            {status === 'exporting' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#888' }}>Rendering…</span>
                  <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{Math.round(progress * 100)}%</span>
                </div>
                <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress * 100}%`, height: '100%', background: 'linear-gradient(90deg, #4B8BFF, #7B55EE)', borderRadius: 3, transition: 'width 0.2s' }} />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
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
                    disabled={layers.length === 0}
                    style={{ flex: 1, padding: '7px', background: layers.length === 0 ? '#1a1a2a' : '#1a3a6a', border: '1px solid #2a5aaa', borderRadius: 4, color: layers.length === 0 ? '#444' : '#6aadff', cursor: layers.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Download size={13} /> Export Video
                  </button>
                </>
              )}
            </div>

            {layers.length === 0 && (
              <p style={{ fontSize: 10, color: '#664444', marginTop: 8, textAlign: 'center' }}>Add layers to the timeline before exporting</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
