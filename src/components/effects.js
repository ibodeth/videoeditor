// Prepared special effects — exported separately to comply with React Fast Refresh
// (fast refresh requires component files to only export components)

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
