import type {
  EntityVisual,
  VisualAccentToken,
  VisualSurfaceToken,
} from '@starium-orchestra/types';

export const VISUAL_ACCENT_CSS_VARS: Record<VisualAccentToken, string> = {
  'brand-gold': 'var(--brand-gold)',
  'state-info': 'var(--state-info)',
  'state-success': 'var(--state-success)',
  'state-warning': 'var(--state-warning)',
  'state-danger': 'var(--state-danger)',
  neutral: 'var(--neutral-900)',
};

export const VISUAL_SURFACE_CSS_VARS: Record<VisualSurfaceToken, string> = {
  'brand-gold-soft': 'var(--brand-gold-050)',
  'state-info-soft': 'var(--state-info-bg)',
  'state-success-soft': 'var(--state-success-bg)',
  'state-warning-soft': 'var(--state-warning-bg)',
  'state-danger-soft': 'var(--state-danger-bg)',
  'neutral-soft': 'var(--neutral-100)',
};

export function colorsForVisual(visual: EntityVisual | null | undefined): {
  accentColor: string;
  surfaceColor: string;
} {
  const accentColor = visual?.accentToken
    ? VISUAL_ACCENT_CSS_VARS[visual.accentToken]
    : 'var(--neutral-900)';
  const surfaceColor = visual?.surfaceToken
    ? VISUAL_SURFACE_CSS_VARS[visual.surfaceToken]
    : 'var(--neutral-100)';
  return { accentColor, surfaceColor };
}
