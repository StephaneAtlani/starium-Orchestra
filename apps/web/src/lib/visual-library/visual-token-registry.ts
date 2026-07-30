import type {
  EntityVisual,
  VisualAccentToken,
  VisualIconKey,
  VisualSurfaceToken,
} from '@starium-orchestra/types';
import { VISUAL_ACCENT_TOKENS, VISUAL_ICON_KEYS } from '@starium-orchestra/types';

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

export const VISUAL_ACCENT_LABELS: Record<VisualAccentToken, string> = {
  'brand-gold': 'Or Starium',
  'state-info': 'Information',
  'state-success': 'Succès',
  'state-warning': 'Attention',
  'state-danger': 'Alerte',
  neutral: 'Neutre',
};

export function surfaceTokenForAccent(
  accentToken: VisualAccentToken,
): VisualSurfaceToken {
  switch (accentToken) {
    case 'brand-gold':
      return 'brand-gold-soft';
    case 'state-info':
      return 'state-info-soft';
    case 'state-success':
      return 'state-success-soft';
    case 'state-warning':
      return 'state-warning-soft';
    case 'state-danger':
      return 'state-danger-soft';
    default:
      return 'neutral-soft';
  }
}

export function buildEntityVisualPreview(
  iconKey: string | null | undefined,
  accentToken: string | null | undefined,
  source: EntityVisual['source'] = 'budgetOverride',
): EntityVisual {
  const safeIconKey = (VISUAL_ICON_KEYS.includes(iconKey as VisualIconKey)
    ? iconKey
    : 'folder') as VisualIconKey;
  const safeAccent = (VISUAL_ACCENT_TOKENS.includes(accentToken as VisualAccentToken)
    ? accentToken
    : 'neutral') as VisualAccentToken;

  return {
    iconKey: safeIconKey,
    accentToken: safeAccent,
    surfaceToken: surfaceTokenForAccent(safeAccent),
    source,
  };
}
