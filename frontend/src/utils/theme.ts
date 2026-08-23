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


export const getCategoryShade = (id: string, category: string): string => {
  const baseColorHex = DOMAIN_BASE_COLORS[category] || '#00f0ff';
  const color = new THREE.Color(baseColorHex);

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);

  // Micro lightness variance (±4%) to keep all nodes vividly within their Cyberdeck hue
  const lightDelta = ((positiveHash % 10) - 5) * 0.012;
  color.setHSL(hsl.h, Math.min(1.0, hsl.s), THREE.MathUtils.clamp(hsl.l + lightDelta, 0.45, 0.65));

  return '#' + color.getHexString();
};
