import type {
  EntityVisual,
  VisualAccentToken,
  VisualIconKey,
  VisualSurfaceToken,
} from '@starium-orchestra/types';

type VisualDescriptor = {
  iconKey: VisualIconKey;
  accentToken: VisualAccentToken;
  surfaceToken: VisualSurfaceToken;
};

const DEFAULT_NEUTRAL_VISUAL: VisualDescriptor = {
  iconKey: 'folder',
  accentToken: 'neutral',
  surfaceToken: 'neutral-soft',
};

const ACCENT_TO_SURFACE: Record<VisualAccentToken, VisualSurfaceToken> = {
  'brand-gold': 'brand-gold-soft',
  'state-info': 'state-info-soft',
  'state-success': 'state-success-soft',
  'state-warning': 'state-warning-soft',
  'state-danger': 'state-danger-soft',
  neutral: 'neutral-soft',
};

const ICON_DEFAULTS: Record<VisualIconKey, VisualDescriptor> = {
  activity: { iconKey: 'activity', accentToken: 'state-warning', surfaceToken: 'state-warning-soft' },
  briefcase: { iconKey: 'briefcase', accentToken: 'brand-gold', surfaceToken: 'brand-gold-soft' },
  building: { iconKey: 'building', accentToken: 'neutral', surfaceToken: 'neutral-soft' },
  cloud: { iconKey: 'cloud', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  database: { iconKey: 'database', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  folder: { iconKey: 'folder', accentToken: 'neutral', surfaceToken: 'neutral-soft' },
  gitBranch: { iconKey: 'gitBranch', accentToken: 'state-warning', surfaceToken: 'state-warning-soft' },
  key: { iconKey: 'key', accentToken: 'state-warning', surfaceToken: 'state-warning-soft' },
  layers: { iconKey: 'layers', accentToken: 'state-warning', surfaceToken: 'state-warning-soft' },
  megaphone: { iconKey: 'megaphone', accentToken: 'state-success', surfaceToken: 'state-success-soft' },
  monitor: { iconKey: 'monitor', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  network: { iconKey: 'network', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  server: { iconKey: 'server', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  shield: { iconKey: 'shield', accentToken: 'state-danger', surfaceToken: 'state-danger-soft' },
  smartphone: { iconKey: 'smartphone', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  users: { iconKey: 'users', accentToken: 'state-info', surfaceToken: 'state-info-soft' },
  wallet: { iconKey: 'wallet', accentToken: 'brand-gold', surfaceToken: 'brand-gold-soft' },
  workflow: { iconKey: 'workflow', accentToken: 'state-warning', surfaceToken: 'state-warning-soft' },
};

const LEGACY_PROJECT_COLOR_TO_ACCENT: Record<string, VisualAccentToken> = {
  'var(--starium-primary, var(--primary))': 'brand-gold',
  'var(--brand-gold)': 'brand-gold',
  'var(--color-amber-600)': 'state-warning',
  'var(--color-cyan-600)': 'state-info',
  'var(--color-emerald-600)': 'state-success',
  'var(--color-fuchsia-600)': 'state-warning',
  'var(--color-indigo-600)': 'state-info',
  'var(--color-sky-600)': 'state-info',
  'var(--color-violet-600)': 'state-warning',
  'var(--destructive)': 'state-danger',
  'var(--muted-foreground)': 'neutral',
};

const PROJECT_NAME_RULES: ReadonlyArray<{ substrings: readonly string[]; visual: VisualDescriptor }> = [
  { substrings: ['identite', 'acces', 'iam', 'sso'], visual: ICON_DEFAULTS.key },
  { substrings: ['data', 'integration', 'etl', 'api'], visual: ICON_DEFAULTS.database },
  {
    substrings: ['experience', 'client', 'canal', 'web', 'portail', 'appli', 'mobile'],
    visual: ICON_DEFAULTS.monitor,
  },
  { substrings: ['infra', 'reseau', 'network', 'cloud'], visual: ICON_DEFAULTS.server },
  { substrings: ['cyber', 'securite', 'resilience', 'siem'], visual: ICON_DEFAULTS.shield },
  { substrings: ['observabil', 'monitoring', 'supervision'], visual: ICON_DEFAULTS.activity },
  { substrings: ['transformation', 'metier', 'business'], visual: ICON_DEFAULTS.briefcase },
  { substrings: ['operation', 'plateforme', 'run', 'devops'], visual: ICON_DEFAULTS.layers },
  { substrings: ['processus', 'workflow'], visual: ICON_DEFAULTS.workflow },
];

const BUDGET_KEYWORD_RULES: ReadonlyArray<{ pattern: RegExp; visual: VisualDescriptor }> = [
  { pattern: /\b(dsi|it|cyber|data|tech|infra|si)\b/i, visual: ICON_DEFAULTS.server },
  { pattern: /\b(daf|financ|compta)\b/i, visual: ICON_DEFAULTS.wallet },
  { pattern: /\b(rh|humain|people|talent)\b/i, visual: ICON_DEFAULTS.users },
  { pattern: /\b(market|comm|marque)\b/i, visual: ICON_DEFAULTS.megaphone },
  { pattern: /\b(fonctionnement|run|support|ops|exploit)\b/i, visual: ICON_DEFAULTS.building },
  { pattern: /\b(invest|capex|build)\b/i, visual: ICON_DEFAULTS.activity },
  { pattern: /\b(projet|project|pmo)\b/i, visual: ICON_DEFAULTS.folder },
];

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function sanitizeToken<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | null {
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function buildVisual(iconKey: VisualIconKey, accentToken?: VisualAccentToken | null, source?: EntityVisual['source']): EntityVisual {
  const defaults = ICON_DEFAULTS[iconKey] ?? DEFAULT_NEUTRAL_VISUAL;
  const accent = accentToken ?? defaults.accentToken;
  return {
    iconKey,
    accentToken: accent,
    surfaceToken: ACCENT_TO_SURFACE[accent],
    source: source ?? 'neutralFallback',
  };
}

export function resolveOrgUnitVisual(input: {
  iconKey?: string | null;
  accentToken?: string | null;
  surfaceToken?: string | null;
} | null | undefined): EntityVisual | null {
  if (!input) return null;
  const iconKey = sanitizeToken(input.iconKey, Object.keys(ICON_DEFAULTS) as VisualIconKey[]);
  const accentToken = sanitizeToken(input.accentToken, Object.keys(ACCENT_TO_SURFACE) as VisualAccentToken[]);
  const surfaceToken = sanitizeToken(input.surfaceToken, Object.values(ACCENT_TO_SURFACE) as VisualSurfaceToken[]);
  if (!iconKey && !accentToken && !surfaceToken) return null;
  const base = buildVisual(iconKey ?? DEFAULT_NEUTRAL_VISUAL.iconKey, accentToken, 'ownerOrgUnit');
  return {
    ...base,
    surfaceToken: surfaceToken ?? base.surfaceToken,
  };
}

function resolveLegacyProjectConfiguredVisual(input: {
  icon?: string | null;
  color?: string | null;
}): EntityVisual | null {
  const iconKey = sanitizeToken(input.icon, Object.keys(ICON_DEFAULTS) as VisualIconKey[]);
  const accentToken = input.color ? LEGACY_PROJECT_COLOR_TO_ACCENT[input.color] ?? null : null;
  if (!iconKey && !accentToken) return null;
  return buildVisual(iconKey ?? DEFAULT_NEUTRAL_VISUAL.iconKey, accentToken, 'portfolioCategory');
}

function resolveProjectNameFallback(names: Array<string | null | undefined>): EntityVisual | null {
  const haystack = names
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeText)
    .join(' ');
  if (!haystack) return null;
  for (const rule of PROJECT_NAME_RULES) {
    if (rule.substrings.some((fragment) => haystack.includes(fragment))) {
      return { ...rule.visual, source: 'heuristicFallback' };
    }
  }
  return null;
}

export function resolveProjectVisual(input: {
  projectKind: string;
  portfolioCategory?: {
    icon?: string | null;
    color?: string | null;
    name?: string | null;
    parent?: { icon?: string | null; color?: string | null; name?: string | null } | null;
  } | null;
  ownerOrgUnitVisual?: EntityVisual | null;
}): EntityVisual {
  const categoryConfigured = input.portfolioCategory
    ? resolveLegacyProjectConfiguredVisual({
        icon: input.portfolioCategory.icon ?? input.portfolioCategory.parent?.icon ?? null,
        color: input.portfolioCategory.color ?? input.portfolioCategory.parent?.color ?? null,
      })
    : null;
  if (categoryConfigured) return categoryConfigured;

  const categoryHeuristic = resolveProjectNameFallback([
    input.portfolioCategory?.name,
    input.portfolioCategory?.parent?.name,
  ]);
  if (categoryHeuristic) return categoryHeuristic;

  if (input.ownerOrgUnitVisual) return { ...input.ownerOrgUnitVisual, source: 'ownerOrgUnit' };

  if (input.projectKind === 'ACTIVITY') {
    return buildVisual('activity', null, 'kindFallback');
  }
  return buildVisual('folder', null, 'neutralFallback');
}

export function resolveBudgetVisual(input: {
  ownerOrgUnitVisual?: EntityVisual | null;
  expenseMix?: 'CAPEX' | 'OPEX' | 'MIXTE' | null;
  name?: string | null;
  code?: string | null;
  description?: string | null;
  ownerOrgUnitName?: string | null;
  ownerOrgUnitCode?: string | null;
}): EntityVisual {
  if (input.ownerOrgUnitVisual) {
    return { ...input.ownerOrgUnitVisual, source: 'ownerOrgUnit' };
  }

  if (input.expenseMix === 'CAPEX') return buildVisual('activity', null, 'expenseMix');
  if (input.expenseMix === 'OPEX') return buildVisual('building', null, 'expenseMix');
  if (input.expenseMix === 'MIXTE') return buildVisual('wallet', null, 'expenseMix');

  const haystack = [
    input.name,
    input.code,
    input.description,
    input.ownerOrgUnitName,
    input.ownerOrgUnitCode,
  ]
    .filter(Boolean)
    .join(' ');

  for (const rule of BUDGET_KEYWORD_RULES) {
    if (rule.pattern.test(haystack)) {
      return { ...rule.visual, source: 'heuristicFallback' };
    }
  }

  return buildVisual('wallet', null, 'neutralFallback');
}
