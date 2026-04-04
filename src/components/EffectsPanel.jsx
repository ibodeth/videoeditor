import { EFFECTS } from './effects.js';

const CATEGORIES = [
  { id: 'filter',   label: 'Filters'    },
  { id: 'adjust',   label: 'Adjustments'},
  { id: 'creative', label: 'Creative'   },
];

export default function EffectsPanel({ selectedLayer, onUpdateLayer }) {
  const currentCss = (selectedLayer?.effects && selectedLayer.effects[0]) || 'none';

  function applyEffect(fx) {
    if (!selectedLayer) return;
    onUpdateLayer(selectedLayer.id, { effects: fx.id === 'none' ? [] : [fx.css] });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effects</span>
      </div>

      {!selectedLayer ? (
        <div style={{ padding: 12, color: '#444', fontSize: 11, textAlign: 'center' }}>
          Select a layer to apply effects
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 2px 5px' }}>
                {cat.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                {EFFECTS.filter(f => f.category === cat.id || (cat.id === 'filter' && f.id === 'none')).map(fx => {
                  const active = (fx.id === 'none' && currentCss === 'none') || (fx.css === currentCss);
                  return (
                    <button
                      key={fx.id}
                      onClick={() => applyEffect(fx)}
                      title={fx.label}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '4px 2px', borderRadius: 3, cursor: 'pointer', border: 'none',
                        background: active ? '#2a3a5a' : '#222',
                        outline: active ? '1px solid #4B8BFF' : '1px solid transparent',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#2a2a2a'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#222'; }}
                    >
                      <span style={{ fontSize: 14 }}>{fx.icon}</span>
                      <span style={{ fontSize: 9, color: active ? '#6aadff' : '#888', textAlign: 'center', lineHeight: 1.2 }}>{fx.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
