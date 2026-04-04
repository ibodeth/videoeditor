// Prepared special effects — exported separately to comply with React Fast Refresh
// (fast refresh requires component files to only export components)

export const EFFECTS = [
  // Filters
  { id: 'none',         label: 'None',          category: 'filter',    css: 'none',                                                                   icon: '🎬' },
  { id: 'grayscale',    label: 'B&W',            category: 'filter',    css: 'grayscale(1)',                                                            icon: '⬛' },
  { id: 'sepia',        label: 'Sepia',          category: 'filter',    css: 'sepia(0.8)',                                                              icon: '🟫' },
  { id: 'invert',       label: 'Invert',         category: 'filter',    css: 'invert(1)',                                                               icon: '��' },
  { id: 'warm',         label: 'Warm',           category: 'filter',    css: 'sepia(0.4) saturate(1.4) hue-rotate(-10deg)',                             icon: '🌅' },
  { id: 'cool',         label: 'Cool',           category: 'filter',    css: 'saturate(1.2) hue-rotate(30deg)',                                         icon: '❄️' },
  { id: 'vivid',        label: 'Vivid',          category: 'filter',    css: 'saturate(2) contrast(1.1)',                                               icon: '🌈' },
  { id: 'fade',         label: 'Fade',           category: 'filter',    css: 'opacity(0.7) contrast(0.8)',                                              icon: '🌫️' },
  { id: 'dramatic',     label: 'Dramatic',       category: 'filter',    css: 'contrast(1.5) brightness(0.9)',                                           icon: '🎭' },
  { id: 'vintage',      label: 'Vintage',        category: 'filter',    css: 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(0.8)',                  icon: '📷' },
  { id: 'neon',         label: 'Neon',           category: 'filter',    css: 'saturate(3) brightness(1.1) contrast(1.2)',                               icon: '💜' },
  { id: 'hdr',          label: 'HDR',            category: 'filter',    css: 'contrast(1.3) saturate(1.5) brightness(1.05)',                            icon: '✨' },

  // Adjustments
  { id: 'bright',       label: 'Bright',         category: 'adjust',    css: 'brightness(1.4)',                                                         icon: '☀️' },
  { id: 'dark',         label: 'Dark',           category: 'adjust',    css: 'brightness(0.6)',                                                         icon: '🌙' },
  { id: 'contrast+',    label: 'Contrast+',      category: 'adjust',    css: 'contrast(1.5)',                                                           icon: '◐' },
  { id: 'sharp',        label: 'Sharp',          category: 'adjust',    css: 'contrast(1.2) saturate(1.1)',                                             icon: '🔆' },
  { id: 'blur',         label: 'Blur',           category: 'adjust',    css: 'blur(2px)',                                                               icon: '💧' },
  { id: 'saturate+',    label: 'Saturate+',      category: 'adjust',    css: 'saturate(2)',                                                             icon: '🎨' },
  { id: 'desat',        label: 'Desaturate',     category: 'adjust',    css: 'saturate(0.2)',                                                           icon: '🌑' },
  { id: 'overexpose',   label: 'Overexpose',     category: 'adjust',    css: 'brightness(1.8) contrast(0.7)',                                           icon: '💡' },

  // Creative
  { id: 'sunset',       label: 'Sunset',         category: 'creative',  css: 'sepia(0.3) saturate(1.5) hue-rotate(-20deg) brightness(1.1)',             icon: '🌇' },
  { id: 'forest',       label: 'Forest',         category: 'creative',  css: 'hue-rotate(70deg) saturate(1.3) brightness(0.95)',                        icon: '🌿' },
  { id: 'ocean',        label: 'Ocean',          category: 'creative',  css: 'hue-rotate(180deg) saturate(1.4) brightness(1.05)',                       icon: '🌊' },
  { id: 'noir',         label: 'Noir',           category: 'creative',  css: 'grayscale(1) contrast(1.5) brightness(0.85)',                             icon: '🎩' },
  { id: 'cyberpunk',    label: 'Cyberpunk',      category: 'creative',  css: 'saturate(3) hue-rotate(270deg) contrast(1.3)',                            icon: '🤖' },
  { id: 'dreamy',       label: 'Dreamy',         category: 'creative',  css: 'brightness(1.15) saturate(1.2) blur(1px)',                                icon: '💭' },
  { id: 'fire',         label: 'Fire',           category: 'creative',  css: 'saturate(2) hue-rotate(-30deg) contrast(1.2) brightness(1.1)',            icon: '🔥' },
  { id: 'ice',          label: 'Ice',            category: 'creative',  css: 'hue-rotate(200deg) saturate(0.6) brightness(1.2) contrast(0.9)',          icon: '🧊' },
  { id: 'gold',         label: 'Gold',           category: 'creative',  css: 'sepia(1) saturate(1.8) brightness(1.1)',                                  icon: '🏆' },
  { id: 'purple',       label: 'Purple',         category: 'creative',  css: 'hue-rotate(260deg) saturate(1.5)',                                        icon: '🟣' },

  // Cinematic
  { id: 'film-grain',   label: 'Film Look',      category: 'cinematic', css: 'contrast(1.1) saturate(0.9) brightness(0.95)',                            icon: '🎞' },
  { id: 'teal-orange',  label: 'Teal+Orange',    category: 'cinematic', css: 'saturate(1.3) contrast(1.15)',                                            icon: '🎬' },
  { id: 'bleach',       label: 'Bleach',         category: 'cinematic', css: 'contrast(1.4) saturate(0.7) brightness(1.05)',                            icon: '⬜' },
  { id: 'cross-proc',   label: 'Cross Proc',     category: 'cinematic', css: 'hue-rotate(30deg) saturate(2) contrast(1.3)',                             icon: '🔀' },
  { id: 'anamorphic',   label: 'Anamorphic',     category: 'cinematic', css: 'contrast(1.2) saturate(1.1) brightness(0.95) hue-rotate(5deg)',           icon: '📽' },
  { id: 'matte',        label: 'Matte',          category: 'cinematic', css: 'contrast(0.85) brightness(1.05) saturate(0.8)',                           icon: '🎪' },
];

// Canvas globalCompositeOperation blend modes
export const BLEND_MODES = [
  { id: 'source-over',  label: 'Normal'        },
  { id: 'multiply',     label: 'Multiply'      },
  { id: 'screen',       label: 'Screen'        },
  { id: 'overlay',      label: 'Overlay'       },
  { id: 'darken',       label: 'Darken'        },
  { id: 'lighten',      label: 'Lighten'       },
  { id: 'color-dodge',  label: 'Color Dodge'   },
  { id: 'color-burn',   label: 'Color Burn'    },
  { id: 'hard-light',   label: 'Hard Light'    },
  { id: 'soft-light',   label: 'Soft Light'    },
  { id: 'difference',   label: 'Difference'    },
  { id: 'exclusion',    label: 'Exclusion'     },
  { id: 'hue',          label: 'Hue'           },
  { id: 'saturation',   label: 'Saturation'    },
  { id: 'color',        label: 'Color'         },
  { id: 'luminosity',   label: 'Luminosity'    },
];
