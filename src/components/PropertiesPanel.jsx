import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { EFFECTS } from './effects.js';

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

function NumberInput({ value, onChange, min, max, step = 0.01, format = v => v }) {
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
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(parse(parseFloat(e.target.value)))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 10, color: '#888', width: 32, textAlign: 'right', fontFamily: 'monospace' }}>
          {format(value)}
        </span>
      </div>
    </PropRow>
  );
}

export default function PropertiesPanel({ layer, onUpdateLayer, onUpdateTransform }) {
  if (!layer) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 11, padding: 16, textAlign: 'center' }}>
        Select a layer to view properties
      </div>
    );
  }

  const t = layer.transform;

  return (
    <div style={{ fontSize: 11 }}>
      {/* Header */}
      <div style={{ padding: '6px 10px', background: '#222', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#888', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Properties</span>
        <span style={{ color: '#aaa', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layer.name}</span>
      </div>

      {/* ── Transform ── */}
      <Section title="Transform">
        <PropRow label="Position X">
          <NumberInput value={t.x} onChange={v => onUpdateTransform(layer.id, { x: v })} min={-4000} max={4000} step={1} format={v => Math.round(v)} />
        </PropRow>
        <PropRow label="Position Y">
          <NumberInput value={t.y} onChange={v => onUpdateTransform(layer.id, { y: v })} min={-4000} max={4000} step={1} format={v => Math.round(v)} />
        </PropRow>
        <SliderRow label="Scale X" value={Math.round(t.scaleX * 100)} onChange={v => onUpdateTransform(layer.id, { scaleX: v / 100 })} min={1} max={300} format={v => `${v}%`} />
        <SliderRow label="Scale Y" value={Math.round(t.scaleY * 100)} onChange={v => onUpdateTransform(layer.id, { scaleY: v / 100 })} min={1} max={300} format={v => `${v}%`} />
        <SliderRow label="Rotation" value={t.rotation} onChange={v => onUpdateTransform(layer.id, { rotation: v })} min={-360} max={360} format={v => `${Math.round(v)}°`} />
        <SliderRow label="Opacity" value={Math.round(t.opacity * 100)} onChange={v => onUpdateTransform(layer.id, { opacity: v / 100 })} min={0} max={100} format={v => `${v}%`} />
      </Section>

      {/* ── Video / Photo effects ── */}
      {(layer.type === 'video' || layer.type === 'photo') && (
        <Section title="Video">
          <PropRow label="Effect Preset">
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
              checked={layer.muted}
              onChange={e => onUpdateLayer(layer.id, { muted: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
          </PropRow>
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
          <PropRow label="Font Color">
            <input
              type="color"
              value={layer.fontColor ?? '#ffffff'}
              onChange={e => onUpdateLayer(layer.id, { fontColor: e.target.value })}
              style={{ width: '100%', height: 22, padding: 1, background: '#111', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
            />
          </PropRow>
          <PropRow label="Font Family">
            <select
              value={layer.fontFamily ?? 'Arial'}
              onChange={e => onUpdateLayer(layer.id, { fontFamily: e.target.value })}
              style={{ background: '#111', border: '1px solid #333', color: '#ccc', fontSize: 11, padding: '2px 4px', borderRadius: 2, width: '100%', outline: 'none' }}
            >
              {['Arial','Georgia','Verdana','Times New Roman','Courier New','Impact','Trebuchet MS','Comic Sans MS'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </PropRow>
        </Section>
      )}

      {/* ── Timing info ── */}
      <Section title="Timing" defaultOpen={false}>
        <PropRow label="Start">{layer.startTime.toFixed(2)}s</PropRow>
        <PropRow label="Duration">{layer.duration.toFixed(2)}s</PropRow>
        <PropRow label="Trim In">{(layer.trimIn || 0).toFixed(2)}s</PropRow>
      </Section>
    </div>
  );
}
