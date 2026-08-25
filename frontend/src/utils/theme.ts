import * as THREE from 'three';

export const DOMAIN_BASE_COLORS: Record<string, string> = {
  'MATH': '#facc15',          // Solar Sunlight Gold
  'ARCH': '#fb923c',          // Sunburst Amber
  'PHYSICS': '#f59e0b',       // Molten Topaz
  'SYSTEMS': '#ea580c',       // Copper Orange
  'CS': '#ef4444',            // Mars Crimson
  'AI & ML': '#f43f5e',       // Solar Prominence Rose
  'CYBERSECURITY': '#e11d48'  // Corona Ruby
};


export const getCategoryShade = (id: string, category: string): string => {
  const baseColorHex = DOMAIN_BASE_COLORS[category] || '#f59e0b';
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
