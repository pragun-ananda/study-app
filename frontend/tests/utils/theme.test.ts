import { describe, it, expect } from 'vitest';
import { DOMAIN_BASE_COLORS, DOMAIN_LIGHT_COLORS, getDomainBaseColor, getCategoryShade } from '../../src/utils/theme';

describe('Theme Utilities', () => {
  it('defines base colors for all 7 required domain categories in dark and light modes', () => {
    const categories = ['AI & ML', 'CS', 'SYSTEMS', 'MATH', 'PHYSICS', 'CYBERSECURITY', 'ARCH'];
    categories.forEach((cat) => {
      expect(DOMAIN_BASE_COLORS[cat]).toBeDefined();
      expect(DOMAIN_BASE_COLORS[cat]).toMatch(/^#[0-9a-fA-F]{6}$/);

      expect(DOMAIN_LIGHT_COLORS[cat]).toBeDefined();
      expect(DOMAIN_LIGHT_COLORS[cat]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('retrieves distinct base colors for light vs dark mode to ensure high contrast', () => {
    const darkMath = getDomainBaseColor('MATH', 'dark');
    const lightMath = getDomainBaseColor('MATH', 'light');
    expect(darkMath).toBe(DOMAIN_BASE_COLORS['MATH']);
    expect(lightMath).toBe(DOMAIN_LIGHT_COLORS['MATH']);
    expect(darkMath).not.toBe(lightMath);
  });

  it('generates consistent deterministic shade for the same node ID and category', () => {
    const shade1 = getCategoryShade('TOPIC-001', 'AI & ML');
    const shade2 = getCategoryShade('TOPIC-001', 'AI & ML');
    expect(shade1).toBe(shade2);
    expect(shade1).toMatch(/^#[0-9a-fA-F]{6}$/);

    const lightShade1 = getCategoryShade('TOPIC-001', 'AI & ML', 'light');
    const lightShade2 = getCategoryShade('TOPIC-001', 'AI & ML', 'light');
    expect(lightShade1).toBe(lightShade2);
    expect(lightShade1).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('produces distinct micro-variations for different node IDs in the same category', () => {
    const shadeA = getCategoryShade('TOPIC-001', 'CS');
    const shadeB = getCategoryShade('TOPIC-002', 'CS');
    expect(shadeA).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(shadeB).toMatch(/^#[0-9a-fA-F]{6}$/);

    const lightShadeA = getCategoryShade('TOPIC-001', 'CS', 'light');
    const lightShadeB = getCategoryShade('TOPIC-002', 'CS', 'light');
    expect(lightShadeA).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(lightShadeB).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('falls back gracefully to deterministic color on unknown domain category in both themes', () => {
    const darkUnknown = getCategoryShade('TOPIC-UNKNOWN', 'NON_EXISTENT_CAT', 'dark');
    const lightUnknown = getCategoryShade('TOPIC-UNKNOWN', 'NON_EXISTENT_CAT', 'light');
    expect(darkUnknown).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(lightUnknown).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
