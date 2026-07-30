/**
 * Réponse de l’endpoint health (API-first, partagé api + web).
 */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  database?: 'connected' | 'disconnected';
  timestamp?: string;
}

export const VISUAL_ICON_KEYS = [
  'activity',
  'briefcase',
  'building',
  'cloud',
  'database',
  'folder',
  'gitBranch',
  'key',
  'layers',
  'megaphone',
  'monitor',
  'network',
  'server',
  'shield',
  'smartphone',
  'users',
  'wallet',
  'workflow',
] as const;

export type VisualIconKey = (typeof VISUAL_ICON_KEYS)[number];

export const VISUAL_ACCENT_TOKENS = [
  'brand-gold',
  'state-info',
  'state-success',
  'state-warning',
  'state-danger',
  'neutral',
] as const;

export type VisualAccentToken = (typeof VISUAL_ACCENT_TOKENS)[number];

export const VISUAL_SURFACE_TOKENS = [
  'brand-gold-soft',
  'state-info-soft',
  'state-success-soft',
  'state-warning-soft',
  'state-danger-soft',
  'neutral-soft',
] as const;

export type VisualSurfaceToken = (typeof VISUAL_SURFACE_TOKENS)[number];

export type VisualSource =
  | 'portfolioCategory'
  | 'ownerOrgUnit'
  | 'budgetOverride'
  | 'expenseMix'
  | 'kindFallback'
  | 'heuristicFallback'
  | 'neutralFallback';

export interface EntityVisual {
  iconKey: VisualIconKey | null;
  accentToken: VisualAccentToken | null;
  surfaceToken: VisualSurfaceToken | null;
  source: VisualSource | null;
}
