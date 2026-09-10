import * as THREE from 'three';

export const DOMAIN_BASE_COLORS: Record<string, string> = {
  'AI & ML': '#00f0ff',       // Laser Cyan
  'CS': '#ff007f',            // Neon Hot Pink
  'SYSTEMS': '#a855f7',       // Synapse Purple
  'MATH': '#ffd600',          // Overclock Laser Yellow
  'PHYSICS': '#00ff66',       // Tritium Green
  'CYBERSECURITY': '#ff1744', // Hazard Plasma Red
  'ARCH': '#0088ff'           // Ion Engine Blue
};

export const DOMAIN_LIGHT_COLORS: Record<string, string> = {
  'AI & ML': '#0284c7',       // High-contrast Sky Blue
  'CS': '#e11d48',            // Deep Rose Pink
  'SYSTEMS': '#7c3aed',       // Royal Violet
  'MATH': '#d97706',          // High-contrast Amber / Gold
  'PHYSICS': '#059669',       // Deep Emerald Green
  'CYBERSECURITY': '#dc2626', // Crimson Red
  'ARCH': '#2563eb'           // High-contrast Royal Blue
};

export function getDomainBaseColor(category: string, theme: 'dark' | 'light' = 'dark'): string {
  if (theme === 'light' && DOMAIN_LIGHT_COLORS[category]) {
    return DOMAIN_LIGHT_COLORS[category];
  }
  if (DOMAIN_BASE_COLORS[category]) return DOMAIN_BASE_COLORS[category];

  // Deterministic golden ratio hue hashing for emergent subgraphs
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i);
    hash |= 0;
  }
  const goldenRatio = 0.618033988749895;
  const hue = Math.floor(((Math.abs(hash) * goldenRatio) % 1) * 360);
  const color = new THREE.Color();
  color.setHSL(hue / 360, 0.95, theme === 'light' ? 0.45 : 0.55);
  return '#' + color.getHexString();
}

export const getCategoryShade = (id: string, category: string, theme: 'dark' | 'light' = 'dark'): string => {
  const baseColorHex = getDomainBaseColor(category, theme);
  const color = new THREE.Color(baseColorHex);

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  // Micro lightness variance (±4%)
  const lightDelta = ((positiveHash % 10) - 5) * 0.012;
  const minL = theme === 'light' ? 0.46 : 0.45;
  const maxL = theme === 'light' ? 0.54 : 0.65;
  color.setHSL(hsl.h, Math.min(1.0, hsl.s), THREE.MathUtils.clamp(hsl.l + lightDelta, minL, maxL));

  return '#' + color.getHexString();
};
