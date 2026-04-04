import { useRef, useState, useEffect } from 'react';
import { Film, Image, Music2, Type, Eye, EyeOff, ZoomIn, ZoomOut, Scissors, Trash2, Copy } from 'lucide-react';

const HEADER_W  = 160;  // left layer header width in px
const ROW_H     = 28;   // px per layer row
const RULER_H   = 22;   // px ruler height
const ZOOM_MIN  = 20;   // px per second at min zoom
const ZOOM_MAX  = 400;
const ZOOM_STEP = 1.3;

function pad2(n) { return String(Math.floor(n)).padStart(2, '0'); }
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${pad2(s)}`;
}

function layerColor(type) {
  if (type === 'video') return '#5533CC';
  if (type === 'photo') return '#0078A8';
  if (type === 'audio') return '#007755';
  return '#CC6600'; // text
}

function LayerIcon({ type }) {
  const s = 11;
  if (type === 'video') return <Film size={s} />;
  if (type === 'photo') return <Image size={s} />;
  if (type === 'audio') return <Music2 size={s} />;
  return <Type size={s} />;
}

export default function Timeline({
  layers, setLayers,
  selectedLayerId, setSelectedLayerId,
  currentTime, setCurrentTime,
  duration, setDuration,
  mediaItems, onAddLayerFromMedia,
}) {
  const [pxPerSec, setPxPerSec] = useState(60);
  const [dragOver, setDragOver] = useState(false);
  const [ctxMenu, setCtxMenu]   = useState(null); // { x, y, layerId }
  const [editingName, setEditingName] = useState(null); // layerId being renamed

  // Drag state refs (no history during drag)
  const dragRef        = useRef(null);
  const dragOverride   = useRef(null);
  const playheadDrag   = useRef(false);
  const setLayersRef   = useRef(setLayers);
  const pxPerSecRef    = useRef(pxPerSec);
  const setCtRef       = useRef(setCurrentTime);
  const timelineRef    = useRef(null); // the scrollable area

  // React state for visual override during drag
  const [visualOverride, setVisualOverride] = useState(null); // { layerId, startTime, duration, trimIn }

  useEffect(() => { setLayersRef.current = setLayers; }, [setLayers]);
  useEffect(() => { pxPerSecRef.current = pxPerSec; }, [pxPerSec]);
  useEffect(() => { setCtRef.current = setCurrentTime; }, [setCurrentTime]);

  /* ── Mouse event handlers (stable, via refs) ── */
  useEffect(() => {
    function onMove(e) {
      // Playhead drag
      if (playheadDrag.current && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - HEADER_W + timelineRef.current.scrollLeft;
        const t = Math.max(0, Math.min(duration, x / pxPerSecRef.current));
        setCtRef.current(t);
        return;
      }

      // Clip drag/trim
      if (!dragRef.current) return;
      const { type, layerId, startX, origStart, origDur, origTrim } = dragRef.current;
      const dx = e.clientX - startX;
      const dt = dx / pxPerSecRef.current;

      let startTime = origStart;
      let dur       = origDur;
      let trimIn    = origTrim;

      if (type === 'move') {
        startTime = Math.max(0, origStart + dt);
      } else if (type === 'trimLeft') {
        const delta = Math.max(-origTrim, Math.min(origDur - 0.1, dt));
        startTime = origStart + delta;
        dur       = origDur  - delta;
        trimIn    = origTrim + delta;
      } else if (type === 'trimRight') {
        dur = Math.max(0.1, origDur + dt);
      }

      const override = { layerId, startTime, duration: dur, trimIn };
      dragOverride.current = override;
      setVisualOverride({ ...override });
    }

    function onUp() {
      playheadDrag.current = false;

      if (dragRef.current && dragOverride.current) {
        const { layerId } = dragRef.current;
        const ov = dragOverride.current;
        setLayersRef.current(prev =>
          prev.map(l => l.id === layerId
            ? { ...l, startTime: ov.startTime, duration: ov.duration, trimIn: ov.trimIn }
            : l
          )
        );
      }
      dragRef.current    = null;
      dragOverride.current = null;
      setVisualOverride(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [duration]); // duration needed for playhead clamp

  /* ── Derived: effective layer positions (apply visual override during drag) ── */
  function getEffective(layer) {
    if (visualOverride && visualOverride.layerId === layer.id) {
      return { ...layer, startTime: visualOverride.startTime, duration: visualOverride.duration, trimIn: visualOverride.trimIn };
    }
    return layer;
  }

  /* ── Drop media from project panel ── */
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const mediaId = e.dataTransfer.getData('application/media-id');
    if (!mediaId) return;
    const item = mediaItems.find(m => m.id === mediaId);
    if (item) onAddLayerFromMedia(item);
  }

  /* ── Context menu actions ── */
  function ctxSplit(layerId) {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer) return prev;
      if (currentTime <= layer.startTime || currentTime >= layer.startTime + layer.duration) return prev;
      const rel = currentTime - layer.startTime;
      const a = { ...layer, duration: rel };
      const b = { ...layer, id: crypto.randomUUID(), startTime: currentTime, duration: layer.duration - rel, trimIn: (layer.trimIn || 0) + rel };
      return prev.flatMap(l => l.id === layerId ? [a, b] : [l]);
    });
    setCtxMenu(null);
  }
  function ctxDelete(layerId) {
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    setCtxMenu(null);
  }
  function ctxDuplicate(layerId) {
    setLayers(prev => {
      const layer = prev.find(l => l.id === layerId);
      if (!layer) return prev;
      const copy = { ...layer, id: crypto.randomUUID(), startTime: layer.startTime + layer.duration };
      return [...prev, copy];
    });
    setCtxMenu(null);
  }

  /* ── Ruler tick generation ── */
  const totalW = Math.max(duration * pxPerSec + 100, 600);
  let tickStep = 1;
  if (pxPerSec < 30)  tickStep = 5;
  if (pxPerSec < 10)  tickStep = 10;
  if (pxPerSec < 5)   tickStep = 30;
  if (pxPerSec >= 60) tickStep = 0.5;
  if (pxPerSec >= 120) tickStep = 0.25;
  const ticks = [];
  for (let t = 0; t <= duration + tickStep; t += tickStep) {
    ticks.push(Math.round(t * 1000) / 1000);
  }

  const playheadX = currentTime * pxPerSec;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#161616', userSelect: 'none', position: 'relative' }}
      onClick={() => setCtxMenu(null)}
    >
      {/* ── Toolbar row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: '1px solid #2a2a2a', flexShrink: 0, background: '#1a1a1a' }}>
        <span style={{ fontSize: 11, color: '#555', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Timeline</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setPxPerSec(p => Math.max(ZOOM_MIN, p / ZOOM_STEP))} style={iconBtn} title="Zoom out"><ZoomOut size={13} /></button>
        <span style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', width: 36, textAlign: 'center' }}>{pxPerSec.toFixed(0)}px</span>
        <button onClick={() => setPxPerSec(p => Math.min(ZOOM_MAX, p * ZOOM_STEP))} style={iconBtn} title="Zoom in"><ZoomIn size={13} /></button>
      </div>

      {/* ── Main scrollable area ── */}
      <div
        ref={timelineRef}
        style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* ── Time ruler ── */}
        <div style={{
          display: 'flex',
          height: RULER_H,
          position: 'sticky', top: 0, zIndex: 10,
          background: '#1a1a1a',
          borderBottom: '1px solid #2a2a2a',
          minWidth: totalW + HEADER_W,
        }}>
          {/* Ruler header corner */}
          <div style={{ width: HEADER_W, minWidth: HEADER_W, borderRight: '1px solid #2a2a2a', flexShrink: 0 }} />
          {/* Ruler ticks */}
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden', cursor: 'pointer' }}
            onMouseDown={e => {
              const rect = timelineRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left - HEADER_W + timelineRef.current.scrollLeft;
              const t = Math.max(0, Math.min(duration, x / pxPerSecRef.current));
              setCurrentTime(t);
              playheadDrag.current = true;
            }}
          >
            {ticks.map(t => (
              <div key={t} style={{ position: 'absolute', left: t * pxPerSec, top: 0, bottom: 0 }}>
                <div style={{ width: 1, height: t % 1 === 0 ? 8 : 4, background: '#3a3a3a', marginTop: t % 1 === 0 ? 8 : 12 }} />
                {t % 1 === 0 && (
                  <span style={{ position: 'absolute', left: 3, top: 3, fontSize: 9, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {formatTime(t)}
                  </span>
                )}
              </div>
            ))}
            {/* Playhead on ruler */}
            <div style={{ position: 'absolute', left: playheadX, top: 0, bottom: 0, width: 1, background: '#FF3333', pointerEvents: 'none' }}>
              <div style={{ width: 9, height: 14, left: -4, top: 0, position: 'absolute', background: '#FF3333', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }} />
            </div>
          </div>
        </div>

        {/* ── Layer rows ── */}
        <div style={{ minWidth: totalW + HEADER_W }}>
          {layers.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60, color: '#444', fontSize: 12 }}>
              Add media from Project panel → drag to timeline
            </div>
          )}
          {layers.map((layer, idx) => {
            const eff = getEffective(layer);
            const selected = selectedLayerId === layer.id;
            const clipLeft  = eff.startTime * pxPerSec;
            const clipWidth = Math.max(4, eff.duration * pxPerSec);
            const color = layerColor(layer.type);

            return (
              <div key={layer.id} style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid #1a1a1a', background: selected ? '#1a2035' : idx % 2 === 0 ? '#161616' : '#181818', position: 'relative' }}>
                {/* Layer header */}
                <div style={{ width: HEADER_W, minWidth: HEADER_W, display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px', background: '#1c1c1c', borderRight: '1px solid #2a2a2a', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <span style={{ color, flexShrink: 0 }}><LayerIcon type={layer.type} /></span>

                  {editingName === layer.id ? (
                    <input
                      autoFocus
                      defaultValue={layer.name}
                      style={{ flex: 1, background: '#111', border: '1px solid #4B8BFF', borderRadius: 2, color: '#ccc', fontSize: 11, padding: '1px 4px', outline: 'none' }}
                      onBlur={e => { setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: e.target.value } : l)); setEditingName(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: 11, color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onDoubleClick={e => { e.stopPropagation(); setEditingName(layer.id); }}
                    >{layer.name}</span>
                  )}

                  {/* Visibility toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}
                    style={{ ...iconBtn, color: layer.visible ? '#aaa' : '#444', flexShrink: 0, padding: 2 }}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                  </button>
                </div>

                {/* Clip track area */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {/* Clip */}
                  <div
                    className={`ae-clip ae-clip-${layer.type}${selected ? ' selected' : ''}`}
                    style={{
                      left: clipLeft,
                      width: clipWidth,
                      background: `linear-gradient(90deg, ${color}cc, ${color})`,
                    }}
                    onMouseDown={e => {
                      if (e.button !== 0) return;
                      e.preventDefault(); e.stopPropagation();
                      setSelectedLayerId(layer.id);
                      dragRef.current = {
                        type: 'move', layerId: layer.id,
                        startX: e.clientX,
                        origStart: eff.startTime, origDur: eff.duration, origTrim: eff.trimIn ?? 0,
                      };
                    }}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, layerId: layer.id }); }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Left trim handle */}
                    <div
                      className="ae-clip-trim-handle ae-clip-trim-left"
                      onMouseDown={e => {
                        if (e.button !== 0) return;
                        e.preventDefault(); e.stopPropagation();
                        dragRef.current = {
                          type: 'trimLeft', layerId: layer.id,
                          startX: e.clientX,
                          origStart: eff.startTime, origDur: eff.duration, origTrim: eff.trimIn ?? 0,
                        };
                      }}
                    />

                    {/* Label */}
                    <span style={{ marginLeft: 8, marginRight: 8, fontSize: 10, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                      {layer.name}
                    </span>

                    {/* Right trim handle */}
                    <div
                      className="ae-clip-trim-handle ae-clip-trim-right"
                      onMouseDown={e => {
                        if (e.button !== 0) return;
                        e.preventDefault(); e.stopPropagation();
                        dragRef.current = {
                          type: 'trimRight', layerId: layer.id,
                          startX: e.clientX,
                          origStart: eff.startTime, origDur: eff.duration, origTrim: eff.trimIn ?? 0,
                        };
                      }}
                    />
                  </div>

                  {/* Playhead */}
                  <div className="ae-playhead" style={{ left: playheadX }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Playhead line across all rows (sticky column overlay) */}
      </div>

      {/* ── Context menu ── */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed', left: ctxMenu.x, top: ctxMenu.y,
            background: '#222', border: '1px solid #333', borderRadius: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)', zIndex: 1000,
            minWidth: 120, padding: 2,
          }}
          onClick={e => e.stopPropagation()}
        >
          {[
            { label: 'Split at Playhead', icon: <Scissors size={11} />, action: () => ctxSplit(ctxMenu.layerId) },
            { label: 'Duplicate',         icon: <Copy size={11} />,     action: () => ctxDuplicate(ctxMenu.layerId) },
            { label: 'Delete',            icon: <Trash2 size={11} />,   action: () => ctxDelete(ctxMenu.layerId), danger: true },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '5px 10px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: item.danger ? '#ff6666' : '#bbb', fontSize: 12,
                borderRadius: 3, textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#333'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#666', padding: 3, display: 'flex', alignItems: 'center',
  borderRadius: 2, transition: 'color 0.1s',
};
