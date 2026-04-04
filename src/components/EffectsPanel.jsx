import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export const EFFECTS = [
  // Filters
  { id: 'none',       label: 'None',         category: 'filter', css: 'none',                              icon: '🎬' },
  { id: 'grayscale',  label: 'B&W',          category: 'filter', css: 'grayscale(1)',                      icon: '⬛' },
  { id: 'sepia',      label: 'Sepia',        category: 'filter', css: 'sepia(0.8)',                        icon: '🟫' },
  { id: 'invert',     label: 'Invert',       category: 'filter', css: 'invert(1)',                         icon: '🔄' },
  { id: 'warm',       label: 'Warm',         category: 'filter', css: 'sepia(0.4) saturate(1.4) hue-rotate(-10deg)', icon: '🌅' },
  { id: 'cool',       label: 'Cool',         category: 'filter', css: 'saturate(1.2) hue-rotate(30deg)',   icon: '❄️' },
  { id: 'vivid',      label: 'Vivid',        category: 'filter', css: 'saturate(2) contrast(1.1)',         icon: '🌈' },
  { id: 'fade',       label: 'Fade',         category: 'filter', css: 'opacity(0.7) contrast(0.8)',        icon: '🌫️' },
  { id: 'dramatic',   label: 'Dramatic',     category: 'filter', css: 'contrast(1.5) brightness(0.9)',     icon: '🎭' },
  { id: 'vintage',    label: 'Vintage',      category: 'filter', css: 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(0.8)', icon: '📷' },
  { id: 'neon',       label: 'Neon',         category: 'filter', css: 'saturate(3) brightness(1.1) contrast(1.2)', icon: '💜' },
  { id: 'hdr',        label: 'HDR',          category: 'filter', css: 'contrast(1.3) saturate(1.5) brightness(1.05)', icon: '✨' },

  // Adjustments
  { id: 'bright',     label: 'Bright',       category: 'adjust', css: 'brightness(1.4)',                  icon: '☀️' },
  { id: 'dark',       label: 'Dark',         category: 'adjust', css: 'brightness(0.6)',                  icon: '🌙' },
  { id: 'contrast+',  label: 'Contrast+',    category: 'adjust', css: 'contrast(1.5)',                    icon: '◐' },
  { id: 'sharp',      label: 'Sharp',        category: 'adjust', css: 'contrast(1.2) saturate(1.1)',      icon: '🔆' },
  { id: 'blur',       label: 'Blur',         category: 'adjust', css: 'blur(2px)',                        icon: '💧' },
  { id: 'saturate+',  label: 'Saturate+',    category: 'adjust', css: 'saturate(2)',                      icon: '🎨' },

  // Creative
  { id: 'sunset',     label: 'Sunset',       category: 'creative', css: 'sepia(0.3) saturate(1.5) hue-rotate(-20deg) brightness(1.1)', icon: '🌇' },
  { id: 'forest',     label: 'Forest',       category: 'creative', css: 'hue-rotate(70deg) saturate(1.3) brightness(0.95)', icon: '🌿' },
  { id: 'ocean',      label: 'Ocean',        category: 'creative', css: 'hue-rotate(180deg) saturate(1.4) brightness(1.05)', icon: '🌊' },
  { id: 'noir',       label: 'Noir',         category: 'creative', css: 'grayscale(1) contrast(1.5) brightness(0.85)', icon: '🎩' },
  { id: 'cyberpunk',  label: 'Cyberpunk',    category: 'creative', css: 'saturate(3) hue-rotate(270deg) contrast(1.3)', icon: '🤖' },
  { id: 'dreamy',     label: 'Dreamy',       category: 'creative', css: 'brightness(1.15) saturate(1.2) blur(1px)', icon: '💭' },
];

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

