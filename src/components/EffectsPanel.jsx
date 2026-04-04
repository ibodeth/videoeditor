import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { EFFECTS } from './effects.js';

const CATEGORIES = [
  { id: 'all',      label: 'All' },
  { id: 'filter',   label: 'Filters' },
  { id: 'adjust',   label: 'Adjust' },
  { id: 'creative', label: 'Creative' },
];

function Slider({ label, value, min, max, onChange, unit }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs text-white/40 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function EffectsPanel({ activeEffect, onEffectSelect, brightness, setBrightness, contrast, setContrast, saturation, setSaturation, opacity, setOpacity }) {
  const [category, setCategory] = useState('all');

  const shown = EFFECTS.filter(e => category === 'all' || e.category === category);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-white/6 shrink-0">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={11} /> Effects
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-3 py-2 shrink-0">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-2 py-0.5 rounded text-xs transition-all ${
              category === c.id ? 'bg-violet-600/30 text-violet-300' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Effect chips */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-3 gap-1.5">
          {shown.map(effect => (
            <button
              key={effect.id}
              onClick={() => onEffectSelect(effect)}
              className={`effect-chip flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-all ${
                activeEffect?.id === effect.id
                  ? 'border-violet-500 bg-violet-600/20 text-violet-200'
                  : 'border-white/8 bg-white/3 text-white/60 hover:bg-white/8 hover:border-white/16'
              }`}
            >
              <span className="text-base leading-none">{effect.icon}</span>
              <span className="truncate w-full text-center text-xs">{effect.label}</span>
            </button>
          ))}
        </div>

        {/* Manual adjustments */}
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Adjustments</p>
          <Slider label="Brightness" value={brightness} min={0} max={200} onChange={setBrightness} unit="%" />
          <Slider label="Contrast"   value={contrast}   min={0} max={200} onChange={setContrast}   unit="%" />
          <Slider label="Saturation" value={saturation} min={0} max={200} onChange={setSaturation} unit="%" />
          <Slider label="Opacity"    value={opacity}    min={0} max={100} onChange={setOpacity}    unit="%" />
        </div>
      </div>
    </div>
  );
}
