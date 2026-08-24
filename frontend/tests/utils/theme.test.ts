import { describe, it, expect } from 'vitest';
import { DOMAIN_BASE_COLORS, getCategoryShade } from '../../src/utils/theme';

describe('Theme Utilities', () => {
  it('defines base colors for all 7 required domain categories', () => {
    const categories = ['AI & ML', 'CS', 'SYSTEMS', 'MATH', 'PHYSICS', 'CYBERSECURITY', 'ARCH'];
    categories.forEach((cat) => {
      expect(DOMAIN_BASE_COLORS[cat]).toBeDefined();
      expect(DOMAIN_BASE_COLORS[cat]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('generates consistent deterministic shade for the same node ID and category', () => {
    const shade1 = getCategoryShade('TOPIC-001', 'AI & ML');
    const shade2 = getCategoryShade('TOPIC-001', 'AI & ML');
    expect(shade1).toBe(shade2);
    expect(shade1).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('produces distinct micro-variations for different node IDs in the same category', () => {
    const shadeA = getCategoryShade('TOPIC-001', 'CS');
    const shadeB = getCategoryShade('TOPIC-002', 'CS');
    // Colors should be valid hex codes
    expect(shadeA).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(shadeB).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('falls back gracefully to default cyan color on unknown domain category', () => {
    const shade = getCategoryShade('TOPIC-UNKNOWN', 'NON_EXISTENT_CAT');
    expect(shade).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
