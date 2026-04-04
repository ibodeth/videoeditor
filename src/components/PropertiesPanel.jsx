import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Minus } from 'lucide-react';
import { EFFECTS, BLEND_MODES } from './effects.js';

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="ae-panel-header" onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {title}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

function PropRow({ label, children }) {
  return (
    <div className="ae-prop-row">
      <span className="ae-prop-label">{label}</span>
      <div className="ae-prop-value">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, format = v => v }) {
  return (
    <input
      type="number"
      className="ae-number-input"
      value={format(value)}
      min={min} max={max} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

function SliderRow({ label, value, onChange, min = 0, max = 100, step = 1, format = v => v, parse = v => v }) {
  return (
    <PropRow label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parse(parseFloat(e.target.value)))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 10, color: '#888', width: 34, textAlign: 'right', fontFamily: 'monospace' }}>
          {format(value)}
        </span>
      </div>
    </PropRow>
  );
}

function AeSelect({ value, onChange, options, style }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: '#111', border: '1px solid #333', color: '#ccc',
        fontSize: 11, padding: '2px 4px', borderRadius: 2, width: '100%', outline: 'none',
        ...style,
      }}
    >
      {options.map(o => <option key={o.id ?? o} value={o.id ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

// Keyframe editor row (shows keyframe count + add/remove buttons)
function KeyframeRow({ prop, value, layer, onUpdateLayer, children }) {
  const kfs = layer.keyframes?.[prop] || [];
  const hasKF = kfs.length > 0;

  function addKeyframe() {
    // Round to 2 decimals
    const relTime = parseFloat(((layer._currentTime ?? 0) - layer.startTime).toFixed(2));
    const safeTime = Math.max(0, Math.min(layer.duration, relTime));
    const newKF = { time: safeTime, value };
    const existing = [...kfs];
    const idx = existing.findIndex(k => Math.abs(k.time - safeTime) < 0.01);
    if (idx >= 0) existing[idx] = newKF;
    else existing.push(newKF);
    existing.sort((a, b) => a.time - b.time);
    onUpdateLayer(layer.id, { keyframes: { ...(layer.keyframes || {}), [prop]: existing } });
  }

  function clearKeyframes() {
    const kf = { ...(layer.keyframes || {}) };
    delete kf[prop];
    onUpdateLayer(layer.id, { keyframes: kf });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #222' }}>
      <div style={{ flex: 1 }}>{children}</div>
      <div style={{ display: 'flex', gap: 2, padding: '0 4px', flexShrink: 0 }}>
        <button
          title={hasKF ? `${kfs.length} keyframe(s) — click to add` : 'Add keyframe'}
          onClick={addKeyframe}
          style={{
            background: hasKF ? '#1a3050' : 'none', border: hasKF ? '1px solid #2a5a8a' : '1px solid #333',
            color: hasKF ? '#6aadff' : '#444', borderRadius: 2, cursor: 'pointer',
            width: 14, height: 14, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >◆</button>
        {hasKF && (
          <button
            title="Remove all keyframes"
            onClick={clearKeyframes}
            style={{ background: 'none', border: '1px solid #333', color: '#664444', borderRadius: 2, cursor: 'pointer', width: 14, height: 14, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          ><Minus size={8} /></button>
        )}
      </div>
    </div>
  );
}

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Georgia', 'Verdana', 'Times New Roman',
  'Courier New', 'Impact', 'Trebuchet MS', 'Comic Sans MS',
  'Palatino', 'Garamond', 'Bookman', 'Tahoma', 'Arial Black', 'Gill Sans',
];

export default function PropertiesPanel({ layer, onUpdateLayer, onUpdateTransform, currentTime }) {
  if (!layer) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 11, padding: 16, textAlign: 'center' }}>
        Select a layer to view properties
      </div>
    );
  }

  // Attach currentTime to layer for keyframe editing
  const layerWithTime = { ...layer, _currentTime: currentTime ?? 0 };

  const t = layer.transform || {};

  return (
    <div style={{ fontSize: 11 }}>
      {/* Header */}
      <div style={{ padding: '6px 10px', background: '#222', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#888', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Properties</span>
        <span style={{ color: '#aaa', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.name}</span>
      </div>

      {/* ── Transform ── */}
      <Section title="Transform">
        <KeyframeRow label="Position X" prop="x" value={t.x ?? 0} layer={layerWithTime} onUpdateLayer={onUpdateLayer}>
          <PropRow label="Pos X">
            <NumberInput value={t.x ?? 0} onChange={v => onUpdateTransform(layer.id, { x: v })} min={-4000} max={4000} step={1} format={v => Math.round(v)} />
          </PropRow>
        </KeyframeRow>
        <KeyframeRow label="Position Y" prop="y" value={t.y ?? 0} layer={layerWithTime} onUpdateLayer={onUpdateLayer}>
          <PropRow label="Pos Y">
            <NumberInput value={t.y ?? 0} onChange={v => onUpdateTransform(layer.id, { y: v })} min={-4000} max={4000} step={1} format={v => Math.round(v)} />
          </PropRow>
        </KeyframeRow>
        <PropRow label="Anchor X">
          <NumberInput value={t.anchorX ?? 0} onChange={v => onUpdateTransform(layer.id, { anchorX: v })} min={-4000} max={4000} step={1} format={v => Math.round(v)} />
        </PropRow>
        <PropRow label="Anchor Y">
          <NumberInput value={t.anchorY ?? 0} onChange={v => onUpdateTransform(layer.id, { anchorY: v })} min={-4000} max={4000} step={1} format={v => Math.round(v)} />
        </PropRow>
        <KeyframeRow prop="scaleX" value={Math.round((t.scaleX ?? 1) * 100)} layer={layerWithTime} onUpdateLayer={onUpdateLayer}>
          <SliderRow label="Scale X" value={Math.round((t.scaleX ?? 1) * 100)} onChange={v => onUpdateTransform(layer.id, { scaleX: v / 100 })} min={1} max={500} format={v => `${v}%`} />
        </KeyframeRow>
        <KeyframeRow prop="scaleY" value={Math.round((t.scaleY ?? 1) * 100)} layer={layerWithTime} onUpdateLayer={onUpdateLayer}>
          <SliderRow label="Scale Y" value={Math.round((t.scaleY ?? 1) * 100)} onChange={v => onUpdateTransform(layer.id, { scaleY: v / 100 })} min={1} max={500} format={v => `${v}%`} />
        </KeyframeRow>
        <KeyframeRow prop="rotation" value={t.rotation ?? 0} layer={layerWithTime} onUpdateLayer={onUpdateLayer}>
          <SliderRow label="Rotation" value={t.rotation ?? 0} onChange={v => onUpdateTransform(layer.id, { rotation: v })} min={-360} max={360} format={v => `${Math.round(v)}°`} />
        </KeyframeRow>
        <KeyframeRow prop="opacity" value={Math.round((t.opacity ?? 1) * 100)} layer={layerWithTime} onUpdateLayer={onUpdateLayer}>
          <SliderRow label="Opacity" value={Math.round((t.opacity ?? 1) * 100)} onChange={v => onUpdateTransform(layer.id, { opacity: v / 100 })} min={0} max={100} format={v => `${v}%`} />
        </KeyframeRow>
        <SliderRow label="Skew X" value={t.skewX ?? 0} onChange={v => onUpdateTransform(layer.id, { skewX: v })} min={-90} max={90} format={v => `${Math.round(v)}°`} />
        <SliderRow label="Skew Y" value={t.skewY ?? 0} onChange={v => onUpdateTransform(layer.id, { skewY: v })} min={-90} max={90} format={v => `${Math.round(v)}°`} />
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance">
        <PropRow label="Blend Mode">
          <AeSelect
            value={layer.blendMode || 'source-over'}
            onChange={v => onUpdateLayer(layer.id, { blendMode: v })}
            options={BLEND_MODES}
          />
        </PropRow>
      </Section>

      {/* ── Color Correction ── */}
      {(layer.type === 'video' || layer.type === 'photo') && (
        <Section title="Color Correction" defaultOpen={false}>
          <SliderRow label="Brightness" value={layer.brightness ?? 100} onChange={v => onUpdateLayer(layer.id, { brightness: v })} min={0} max={300} format={v => `${v}%`} />
          <SliderRow label="Contrast"   value={layer.contrast ?? 100}   onChange={v => onUpdateLayer(layer.id, { contrast: v })}   min={0} max={300} format={v => `${v}%`} />
          <SliderRow label="Saturation" value={layer.saturation ?? 100} onChange={v => onUpdateLayer(layer.id, { saturation: v })} min={0} max={300} format={v => `${v}%`} />
          <SliderRow label="Hue"        value={layer.hue ?? 0}          onChange={v => onUpdateLayer(layer.id, { hue: v })}        min={-180} max={180} format={v => `${Math.round(v)}°`} />
          <PropRow label="">
            <button
              onClick={() => onUpdateLayer(layer.id, { brightness: 100, contrast: 100, saturation: 100, hue: 0 })}
              style={{ fontSize: 10, color: '#666', background: '#222', border: '1px solid #333', borderRadius: 2, cursor: 'pointer', padding: '2px 8px' }}
            >
              Reset
            </button>
          </PropRow>
        </Section>
      )}

      {/* ── Effect Preset (video/photo) ── */}
      {(layer.type === 'video' || layer.type === 'photo') && (
        <Section title="Effect Preset" defaultOpen={false}>
          <PropRow label="Preset">
            <select
              value={(layer.effects && layer.effects[0]) || 'none'}
              onChange={e => {
                const fx = EFFECTS.find(f => f.css === e.target.value || (e.target.value === 'none' && f.id === 'none'));
                onUpdateLayer(layer.id, { effects: fx && fx.css !== 'none' ? [fx.css] : [] });
              }}
              style={{ background: '#111', border: '1px solid #333', color: '#ccc', fontSize: 11, padding: '2px 4px', borderRadius: 2, width: '100%', outline: 'none' }}
            >
              <option value="none">None</option>
              {EFFECTS.filter(f => f.id !== 'none').map(f => (
                <option key={f.id} value={f.css}>{f.label}</option>
              ))}
            </select>
          </PropRow>
        </Section>
      )}

      {/* ── Drop Shadow ── */}
      <Section title="Drop Shadow" defaultOpen={false}>
        <PropRow label="Enable">
          <input
            type="checkbox"
            checked={layer.dropShadow?.enabled ?? false}
            onChange={e => onUpdateLayer(layer.id, { dropShadow: { ...(layer.dropShadow || {}), enabled: e.target.checked } })}
            style={{ cursor: 'pointer' }}
          />
        </PropRow>
        {layer.dropShadow?.enabled && (
          <>
            <PropRow label="Color">
              <input
                type="color"
                value={shadowColorHex(layer.dropShadow?.color)}
                onChange={e => onUpdateLayer(layer.id, { dropShadow: { ...(layer.dropShadow || {}), color: e.target.value + 'cc' } })}
                style={{ width: '100%', height: 22, padding: 1, background: '#111', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
              />
            </PropRow>
            <SliderRow label="Blur"    value={layer.dropShadow?.blur ?? 10}    onChange={v => onUpdateLayer(layer.id, { dropShadow: { ...(layer.dropShadow || {}), blur: v } })}    min={0} max={80}  format={v => `${v}px`} />
            <SliderRow label="Offset X" value={layer.dropShadow?.offsetX ?? 5} onChange={v => onUpdateLayer(layer.id, { dropShadow: { ...(layer.dropShadow || {}), offsetX: v } })} min={-100} max={100} format={v => `${v}px`} />
            <SliderRow label="Offset Y" value={layer.dropShadow?.offsetY ?? 5} onChange={v => onUpdateLayer(layer.id, { dropShadow: { ...(layer.dropShadow || {}), offsetY: v } })} min={-100} max={100} format={v => `${v}px`} />
          </>
        )}
      </Section>

      {/* ── Audio ── */}
      {(layer.type === 'video' || layer.type === 'audio') && (
        <Section title="Audio" defaultOpen={false}>
          <SliderRow
            label="Volume"
            value={Math.round((layer.volume ?? 1) * 100)}
            onChange={v => onUpdateLayer(layer.id, { volume: v / 100 })}
            min={0} max={150}
            format={v => `${v}%`}
          />
          <PropRow label="Mute">
            <input
              type="checkbox"
              checked={layer.muted ?? false}
              onChange={e => onUpdateLayer(layer.id, { muted: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
          </PropRow>
        </Section>
      )}

      {/* ── Speed ── */}
      {(layer.type === 'video' || layer.type === 'audio') && (
        <Section title="Speed" defaultOpen={false}>
          <SliderRow
            label="Speed"
            value={Math.round((layer.speed ?? 1) * 100)}
            onChange={v => onUpdateLayer(layer.id, { speed: v / 100 })}
            min={10} max={400}
            format={v => `${v}%`}
          />
        </Section>
      )}

      {/* ── Text ── */}
      {layer.type === 'text' && (
        <Section title="Text">
          <PropRow label="Content">
            <textarea
              value={layer.text ?? ''}
              onChange={e => onUpdateLayer(layer.id, { text: e.target.value })}
              rows={3}
              style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#ccc', fontSize: 11, padding: 4, borderRadius: 2, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
          </PropRow>
          <PropRow label="Font Size">
            <NumberInput value={layer.fontSize ?? 48} onChange={v => onUpdateLayer(layer.id, { fontSize: v })} min={8} max={500} step={1} format={v => Math.round(v)} />
          </PropRow>
          <PropRow label="Font Family">
            <AeSelect
              value={layer.fontFamily ?? 'Arial'}
              onChange={v => onUpdateLayer(layer.id, { fontFamily: v })}
              options={FONT_FAMILIES.map(f => ({ id: f, label: f }))}
            />
          </PropRow>
          <PropRow label="Color">
            <input
              type="color"
              value={layer.fontColor ?? '#ffffff'}
              onChange={e => onUpdateLayer(layer.id, { fontColor: e.target.value })}
              style={{ width: '100%', height: 22, padding: 1, background: '#111', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
            />
          </PropRow>
          <PropRow label="Align">
            <div style={{ display: 'flex', gap: 3 }}>
              {['left', 'center', 'right'].map(a => (
                <button
                  key={a}
                  onClick={() => onUpdateLayer(layer.id, { textAlign: a })}
                  style={{
                    flex: 1, padding: '2px 4px', fontSize: 10, border: 'none', cursor: 'pointer', borderRadius: 2, textTransform: 'capitalize',
                    background: (layer.textAlign ?? 'center') === a ? '#2a3a5a' : '#222',
                    color:      (layer.textAlign ?? 'center') === a ? '#6aadff' : '#888',
                  }}
                >{a}</button>
              ))}
            </div>
          </PropRow>
          <PropRow label="Bold">
            <input type="checkbox" checked={layer.fontBold ?? false} onChange={e => onUpdateLayer(layer.id, { fontBold: e.target.checked })} style={{ cursor: 'pointer' }} />
          </PropRow>
          <PropRow label="Italic">
            <input type="checkbox" checked={layer.fontItalic ?? false} onChange={e => onUpdateLayer(layer.id, { fontItalic: e.target.checked })} style={{ cursor: 'pointer' }} />
          </PropRow>
          <SliderRow label="Line Height" value={layer.lineHeight ?? 1.2} onChange={v => onUpdateLayer(layer.id, { lineHeight: v })} min={0.5} max={4} step={0.05} format={v => v.toFixed(2)} />
          <SliderRow label="Stroke W"  value={layer.textStroke ?? 0}  onChange={v => onUpdateLayer(layer.id, { textStroke: v })}  min={0} max={30} step={0.5} format={v => `${v}px`} />
          <PropRow label="Stroke Color">
            <input
              type="color"
              value={layer.textStrokeColor ?? '#000000'}
              onChange={e => onUpdateLayer(layer.id, { textStrokeColor: e.target.value })}
              style={{ width: '100%', height: 22, padding: 1, background: '#111', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
            />
          </PropRow>
          <PropRow label="Text Shadow">
            <input type="checkbox" checked={layer.textShadow ?? false} onChange={e => onUpdateLayer(layer.id, { textShadow: e.target.checked })} style={{ cursor: 'pointer' }} />
          </PropRow>
          {layer.textShadow && (
            <>
              <SliderRow label="Shadow Blur"   value={layer.textShadowBlur ?? 4}    onChange={v => onUpdateLayer(layer.id, { textShadowBlur: v })}    min={0} max={40} format={v => `${v}px`} />
              <SliderRow label="Shadow X"      value={layer.textShadowOffsetX ?? 2} onChange={v => onUpdateLayer(layer.id, { textShadowOffsetX: v })} min={-40} max={40} format={v => `${v}px`} />
              <SliderRow label="Shadow Y"      value={layer.textShadowOffsetY ?? 2} onChange={v => onUpdateLayer(layer.id, { textShadowOffsetY: v })} min={-40} max={40} format={v => `${v}px`} />
            </>
          )}
        </Section>
      )}

      {/* ── Shape ── */}
      {layer.type === 'shape' && (
        <Section title="Shape">
          <PropRow label="Fill">
            <input
              type="color"
              value={layer.fill || '#4B8BFF'}
              onChange={e => onUpdateLayer(layer.id, { fill: e.target.value })}
              style={{ width: '100%', height: 22, padding: 1, background: '#111', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
            />
          </PropRow>
          <PropRow label="Stroke">
            <input
              type="color"
              value={layer.stroke || '#000000'}
              onChange={e => onUpdateLayer(layer.id, { stroke: e.target.value })}
              style={{ width: '100%', height: 22, padding: 1, background: '#111', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
            />
          </PropRow>
          <SliderRow label="Stroke W" value={layer.strokeWidth ?? 0} onChange={v => onUpdateLayer(layer.id, { strokeWidth: v })} min={0} max={50} format={v => `${v}px`} />
          <PropRow label="Width">
            <NumberInput value={layer.shapeWidth ?? 400} onChange={v => onUpdateLayer(layer.id, { shapeWidth: v })} min={1} max={3840} step={1} format={v => Math.round(v)} />
          </PropRow>
          <PropRow label="Height">
            <NumberInput value={layer.shapeHeight ?? 300} onChange={v => onUpdateLayer(layer.id, { shapeHeight: v })} min={1} max={2160} step={1} format={v => Math.round(v)} />
          </PropRow>
          {layer.shapeType === 'rectangle' && (
            <SliderRow label="Corner Radius" value={layer.cornerRadius ?? 0} onChange={v => onUpdateLayer(layer.id, { cornerRadius: v })} min={0} max={200} format={v => `${v}px`} />
          )}
        </Section>
      )}

      {/* ── Timing info ── */}
      <Section title="Timing" defaultOpen={false}>
        <PropRow label="Start">{(layer.startTime ?? 0).toFixed(2)}s</PropRow>
        <PropRow label="Duration">{(layer.duration ?? 0).toFixed(2)}s</PropRow>
        <PropRow label="Trim In">{(layer.trimIn ?? 0).toFixed(2)}s</PropRow>
        <PropRow label="Speed">{((layer.speed ?? 1) * 100).toFixed(0)}%</PropRow>
      </Section>

      {/* ── Layer info ── */}
      <Section title="Layer" defaultOpen={false}>
        <PropRow label="Visible">
          <input type="checkbox" checked={layer.visible ?? true} onChange={e => onUpdateLayer(layer.id, { visible: e.target.checked })} style={{ cursor: 'pointer' }} />
        </PropRow>
        <PropRow label="Locked">
          <input type="checkbox" checked={layer.locked ?? false} onChange={e => onUpdateLayer(layer.id, { locked: e.target.checked })} style={{ cursor: 'pointer' }} />
        </PropRow>
        <PropRow label="Track">{layer.trackIndex}</PropRow>
        <PropRow label="Type"><span style={{ textTransform: 'capitalize', color: '#888' }}>{layer.type}</span></PropRow>
      </Section>
    </div>
  );
}

function shadowColorHex(color) {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color.substring(0, 7);
  return '#000000';
}
