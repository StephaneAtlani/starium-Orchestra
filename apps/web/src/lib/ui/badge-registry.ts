/**
 * Registre badges Starium : palette × ton de surface × couleur du texte.
 * Fusion : défauts code → `PlatformUiBadgeSettings.badgeConfig` → `Client.uiBadgeConfig`.
 * Rétrocompat : ancien champ `tone` (seul) → équivalent pastel + auto.
 */
import { cn } from '@/lib/utils';
import {
  PALETTE_SURFACE_BASE,
  PALETTE_TEXT_AUTO,
} from './badge-palette-matrix.generated';

/** Palettes = familles de couleurs (+ neutre). */
export const BADGE_PALETTES = [
  'neutral',
  'slate',
  'gray',
  'zinc',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'rose',
  'pink',
  'fuchsia',
  'purple',
  'violet',
  'indigo',
  'blue',
  'sky',
  'cyan',
  'teal',
  'emerald',
  'green',
  'lime',
] as const;

export type BadgePalette = (typeof BADGE_PALETTES)[number];

/** Alias historique — même liste que les palettes. */
export const BADGE_TONES = BADGE_PALETTES;
export type BadgeTone = BadgePalette;

/** Ton de surface : pastel (clair), dark (Foncé), vivid (Vif). */
export const BADGE_SURFACES = ['pastel', 'dark', 'vivid'] as const;

export type BadgeSurface = (typeof BADGE_SURFACES)[number];

/** Anciennes valeurs en base → surface actuelle. */
const LEGACY_SURFACE_MAP: Record<string, BadgeSurface> = {
  soft: 'pastel',
  solid: 'vivid',
  dark: 'dark',
  outline: 'pastel',
};

/** Normalise une surface stockée (y compris legacy soft/solid/dark/outline). */
export function coerceBadgeSurface(raw: unknown): BadgeSurface | undefined {
  if (raw == null || typeof raw !== 'string') return undefined;
  if ((BADGE_SURFACES as readonly string[]).includes(raw)) {
    return raw as BadgeSurface;
  }
  return LEGACY_SURFACE_MAP[raw];
}

export const BADGE_TEXT_PRESETS = ['auto', 'dark', 'light', 'muted'] as const;

export type BadgeTextPreset = (typeof BADGE_TEXT_PRESETS)[number];

export type BadgeStyle = {
  palette: BadgePalette;
  surface: BadgeSurface;
  textColor: BadgeTextPreset;
};

const NEUTRAL_BASE: Record<BadgeSurface, string> = {
  pastel:
    'border-border bg-background dark:border-border dark:bg-muted/50',
  dark:
    'border-slate-800 bg-slate-900 dark:border-slate-950 dark:bg-slate-950',
  vivid:
    'border-primary bg-primary dark:border-primary dark:bg-primary shadow-sm',
};

const NEUTRAL_TEXT_AUTO: Record<BadgeSurface, string> = {
  /** Auto : pas `text-foreground` en sombre (≈ blanc) — même idée que la matrice chromatique. */
  pastel:
    'text-neutral-950 dark:text-zinc-500',
  dark: 'text-white dark:text-white',
  vivid: 'text-primary-foreground dark:text-primary-foreground',
};

const TEXT_PRESET_CLASS: Record<'light' | 'muted', string> = {
  light: 'text-white dark:text-white',
  muted: 'text-muted-foreground',
};

/**
 * « Texte foncé » (clé API `dark`) : toujours une nuance **foncée** de la palette (950).
 * On n’utilise pas `dark:text-*-50` ici : en thème sombre ça donnait du texte quasi blanc, incohérent avec le libellé.
 */
function textDarkPresetClass(palette: BadgePalette): string {
  if (palette === 'neutral') {
    return 'text-slate-950 dark:text-slate-950';
  }
  return `text-${palette}-950 dark:text-${palette}-950`;
}

export function badgeClassForStyle(style: BadgeStyle): string {
  const { palette, surface, textColor } = style;
  let base: string;
  let autoText: string;

  if (palette === 'neutral') {
    base = NEUTRAL_BASE[surface];
    autoText = NEUTRAL_TEXT_AUTO[surface];
  } else {
    base = PALETTE_SURFACE_BASE[palette][surface];
    autoText = PALETTE_TEXT_AUTO[palette][surface];
  }

  const text =
    textColor === 'auto'
      ? autoText
      : textColor === 'dark'
        ? textDarkPresetClass(palette)
        : TEXT_PRESET_CLASS[textColor];
  return cn('font-normal', base, text);
}

/** Ancien modèle à un seul `tone` → pastel + texte auto (comportement proche du legacy). */
export function legacyToneToStyle(tone: BadgePalette): BadgeStyle {
  return { palette: tone, surface: 'pastel', textColor: 'auto' };
}

export function badgeClassForTone(tone: BadgeTone): string {
  return badgeClassForStyle(legacyToneToStyle(tone));
}

export const BADGE_PALETTE_GROUPS: ReadonlyArray<{
  label: string;
  palettes: readonly BadgePalette[];
}> = [
  { label: 'Neutre', palettes: ['neutral'] },
  {
    label: 'Gris',
    palettes: ['slate', 'gray', 'zinc', 'stone'],
  },
  {
    label: 'Rouges & chauds',
    palettes: ['red', 'orange', 'amber', 'yellow', 'rose'],
  },
  {
    label: 'Roses & violets',
    palettes: ['pink', 'fuchsia', 'purple', 'violet'],
  },
  {
    label: 'Bleus',
    palettes: ['indigo', 'blue', 'sky', 'cyan'],
  },
  {
    label: 'Verts & sarcelle',
    palettes: ['teal', 'emerald', 'green', 'lime'],
  },
];

/** Libellés UI (fr) — valeur API = clé Tailwind, pas l’id technique seul à l’affichage. */
export const BADGE_PALETTE_LABELS: Record<BadgePalette, string> = {
  neutral: 'Neutre',
  slate: 'Ardoise',
  gray: 'Gris',
  zinc: 'Zinc',
  stone: 'Pierre',
  red: 'Rouge',
  orange: 'Orange',
  amber: 'Ambre',
  yellow: 'Jaune',
  rose: 'Rose',
  pink: 'Rose vif',
  fuchsia: 'Fuchsia',
  purple: 'Pourpre',
  violet: 'Violet',
  indigo: 'Indigo',
  blue: 'Bleu',
  sky: 'Bleu ciel',
  cyan: 'Cyan',
  teal: 'Sarcelle',
  emerald: 'Émeraude',
  green: 'Vert',
  lime: 'Citron vert',
};

export const BADGE_SURFACE_LABELS: Record<BadgeSurface, string> = {
  pastel: 'Pastel',
  dark: 'Foncé',
  vivid: 'Vif',
};

export const BADGE_TEXT_PRESET_LABELS: Record<BadgeTextPreset, string> = {
  auto: 'Automatique (contraste)',
  dark: 'Texte foncé',
  light: 'Texte clair',
  muted: 'Texte atténué',
};

export const PROJECT_TASK_STATUSES = [
  'DRAFT',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
] as const;

export type ProjectTaskStatusKey = (typeof PROJECT_TASK_STATUSES)[number];

export const PROJECT_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type ProjectTaskPriorityKey = (typeof PROJECT_TASK_PRIORITIES)[number];

/**
 * Défauts code (fusion sans JSON plateforme/client). Pour la même chose en base plateforme :
 * `apps/api/prisma/default-platform-ui-badge-config.json` + migration `20260331190000_platform_ui_badge_default_config`.
 */
const DEFAULT_TASK_STATUS: Record<ProjectTaskStatusKey, BadgeStyle> = {
  DRAFT: { palette: 'stone', surface: 'pastel', textColor: 'auto' },
  TODO: { palette: 'indigo', surface: 'pastel', textColor: 'auto' },
  IN_PROGRESS: { palette: 'sky', surface: 'pastel', textColor: 'auto' },
  BLOCKED: { palette: 'red', surface: 'pastel', textColor: 'auto' },
  DONE: { palette: 'emerald', surface: 'pastel', textColor: 'auto' },
  CANCELLED: { palette: 'stone', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_TASK_STATUS_LABELS: Record<ProjectTaskStatusKey, string> = {
  DRAFT: 'Brouillon',
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

const DEFAULT_TASK_PRIORITY: Record<ProjectTaskPriorityKey, BadgeStyle> = {
  LOW: { palette: 'neutral', surface: 'pastel', textColor: 'auto' },
  MEDIUM: { palette: 'indigo', surface: 'pastel', textColor: 'auto' },
  HIGH: { palette: 'amber', surface: 'pastel', textColor: 'auto' },
  CRITICAL: { palette: 'red', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_TASK_PRIORITY_LABELS: Record<ProjectTaskPriorityKey, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

/** Portefeuille projets (`/projects`) — nature, cycle de vie, priorité projet, santé, signaux portefeuille. */
export const PROJECT_KIND_KEYS = ['PROJECT', 'ACTIVITY'] as const;
export type ProjectKindBadgeKey = (typeof PROJECT_KIND_KEYS)[number];

export const PROJECT_LIFECYCLE_STATUS_KEYS = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;
export type ProjectLifecycleStatusKey = (typeof PROJECT_LIFECYCLE_STATUS_KEYS)[number];

export const PROJECT_ENTITY_PRIORITY_KEYS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type ProjectEntityPriorityKey = (typeof PROJECT_ENTITY_PRIORITY_KEYS)[number];

export const PROJECT_COMPUTED_HEALTH_KEYS = ['RED', 'ORANGE', 'GREEN'] as const;
export type ProjectComputedHealthKey = (typeof PROJECT_COMPUTED_HEALTH_KEYS)[number];

export const PROJECT_PORTFOLIO_SIGNAL_KEYS = [
  'late',
  'blocked',
  'critical',
  'norisk',
  'noowner',
] as const;
export type ProjectPortfolioSignalKey = (typeof PROJECT_PORTFOLIO_SIGNAL_KEYS)[number];

const DEFAULT_PROJECT_KIND: Record<ProjectKindBadgeKey, BadgeStyle> = {
  PROJECT: { palette: 'slate', surface: 'pastel', textColor: 'auto' },
  ACTIVITY: { palette: 'cyan', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_PROJECT_KIND_LABELS: Record<ProjectKindBadgeKey, string> = {
  PROJECT: 'Projet',
  ACTIVITY: 'Activité',
};

const DEFAULT_PROJECT_LIFECYCLE_STATUS: Record<
  ProjectLifecycleStatusKey,
  BadgeStyle
> = {
  DRAFT: { palette: 'stone', surface: 'pastel', textColor: 'auto' },
  PLANNED: { palette: 'indigo', surface: 'pastel', textColor: 'auto' },
  IN_PROGRESS: { palette: 'sky', surface: 'pastel', textColor: 'auto' },
  ON_HOLD: { palette: 'amber', surface: 'pastel', textColor: 'auto' },
  COMPLETED: { palette: 'emerald', surface: 'pastel', textColor: 'auto' },
  CANCELLED: { palette: 'zinc', surface: 'pastel', textColor: 'auto' },
  ARCHIVED: { palette: 'gray', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_PROJECT_LIFECYCLE_LABELS: Record<ProjectLifecycleStatusKey, string> = {
  DRAFT: 'Brouillon',
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  ARCHIVED: 'Archivé',
};

const DEFAULT_PROJECT_ENTITY_PRIORITY: Record<
  ProjectEntityPriorityKey,
  BadgeStyle
> = {
  LOW: { palette: 'neutral', surface: 'pastel', textColor: 'auto' },
  MEDIUM: { palette: 'indigo', surface: 'pastel', textColor: 'auto' },
  HIGH: { palette: 'amber', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_PROJECT_ENTITY_PRIORITY_LABELS: Record<
  ProjectEntityPriorityKey,
  string
> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

const DEFAULT_PROJECT_COMPUTED_HEALTH: Record<
  ProjectComputedHealthKey,
  BadgeStyle
> = {
  RED: { palette: 'red', surface: 'pastel', textColor: 'auto' },
  ORANGE: { palette: 'amber', surface: 'pastel', textColor: 'auto' },
  GREEN: { palette: 'emerald', surface: 'vivid', textColor: 'auto' },
};

const DEFAULT_PROJECT_HEALTH_LABELS: Record<ProjectComputedHealthKey, string> = {
  RED: 'Santé : critique',
  ORANGE: 'Santé : attention',
  GREEN: 'Santé : bon',
};

const DEFAULT_PROJECT_PORTFOLIO_SIGNAL: Record<
  ProjectPortfolioSignalKey,
  BadgeStyle
> = {
  late: { palette: 'red', surface: 'pastel', textColor: 'auto' },
  blocked: { palette: 'red', surface: 'pastel', textColor: 'auto' },
  critical: { palette: 'rose', surface: 'pastel', textColor: 'auto' },
  norisk: { palette: 'amber', surface: 'pastel', textColor: 'auto' },
  noowner: { palette: 'orange', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_PROJECT_PORTFOLIO_LABELS: Record<ProjectPortfolioSignalKey, string> = {
  late: 'En retard',
  blocked: 'Bloqué',
  critical: 'Critique',
  norisk: 'Sans étude de risque',
  noowner: 'Sans responsable',
};

/** Entrée fusionnée pour l’affichage (tableaux, pastilles). */
export type BadgeEntry = {
  label: string;
  palette: BadgePalette;
  surface: BadgeSurface;
  textColor: BadgeTextPreset;
  className: string;
};

/** Surcharges JSON (champs partiels + `tone` legacy). */
export type UiBadgeStyleFields = {
  label?: string;
  tone?: BadgeTone;
  palette?: BadgePalette;
  surface?: BadgeSurface;
  textColor?: BadgeTextPreset;
};

export type UiBadgeConfig = {
  projectTaskStatus?: Partial<Record<ProjectTaskStatusKey, UiBadgeStyleFields>>;
  projectTaskPriority?: Partial<Record<ProjectTaskPriorityKey, UiBadgeStyleFields>>;
  custom?: Array<
    { key: string; label: string } & UiBadgeStyleFields
  >;
  projectKind?: Partial<Record<ProjectKindBadgeKey, UiBadgeStyleFields>>;
  /** Statut cycle de vie projet (fiche / liste), distinct des statuts de tâche. */
  projectLifecycleStatus?: Partial<
    Record<ProjectLifecycleStatusKey, UiBadgeStyleFields>
  >;
  /** Priorité « projet » (LOW/MEDIUM/HIGH), distincte des priorités de tâche. */
  projectEntityPriority?: Partial<
    Record<ProjectEntityPriorityKey, UiBadgeStyleFields>
  >;
  projectComputedHealth?: Partial<
    Record<ProjectComputedHealthKey, UiBadgeStyleFields>
  >;
  projectPortfolioSignal?: Partial<
    Record<ProjectPortfolioSignalKey, UiBadgeStyleFields>
  >;
};

function isBadgePalette(v: unknown): v is BadgePalette {
  return typeof v === 'string' && (BADGE_PALETTES as readonly string[]).includes(v);
}

function isBadgeSurface(v: unknown): v is BadgeSurface {
  return coerceBadgeSurface(v) !== undefined;
}

function isBadgeTextPreset(v: unknown): v is BadgeTextPreset {
  return typeof v === 'string' && (BADGE_TEXT_PRESETS as readonly string[]).includes(v);
}

function normalizeBadgeStyle(
  entry: UiBadgeStyleFields | undefined,
  def: BadgeStyle,
): BadgeStyle {
  if (!entry) return def;
  const palette =
    entry.palette ??
    (entry.tone != null && isBadgePalette(entry.tone) ? entry.tone : undefined) ??
    def.palette;
  const surface =
    coerceBadgeSurface(entry.surface) ?? def.surface;
  const textColor = entry.textColor ?? def.textColor;
  return { palette, surface, textColor };
}

function parseStyleFields(ent: Record<string, unknown>): UiBadgeStyleFields {
  const row: UiBadgeStyleFields = {};
  if (typeof ent.label === 'string') row.label = ent.label;
  if (isBadgePalette(ent.tone)) row.tone = ent.tone;
  if (isBadgePalette(ent.palette)) row.palette = ent.palette;
  const surf = coerceBadgeSurface(ent.surface);
  if (surf) row.surface = surf;
  if (isBadgeTextPreset(ent.textColor)) row.textColor = ent.textColor;
  return row;
}

function parseKeyedStyleMap<K extends string>(
  raw: unknown,
  allowed: readonly K[],
): Partial<Record<K, UiBadgeStyleFields>> | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const m: Partial<Record<K, UiBadgeStyleFields>> = {};
  for (const k of Object.keys(raw)) {
    if (!(allowed as readonly string[]).includes(k)) continue;
    const e = (raw as Record<string, unknown>)[k];
    if (!e || typeof e !== 'object') continue;
    m[k as K] = parseStyleFields(e as Record<string, unknown>);
  }
  return Object.keys(m).length > 0 ? m : undefined;
}

/** Parse JSON API → structure typée (permissif). */
export function parseUiBadgeConfig(raw: unknown): UiBadgeConfig | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const out: UiBadgeConfig = {};

  const pts = parseKeyedStyleMap(o.projectTaskStatus, PROJECT_TASK_STATUSES);
  if (pts) out.projectTaskStatus = pts;

  const ptp = parseKeyedStyleMap(o.projectTaskPriority, PROJECT_TASK_PRIORITIES);
  if (ptp) out.projectTaskPriority = ptp;

  const pk = parseKeyedStyleMap(o.projectKind, PROJECT_KIND_KEYS);
  if (pk) out.projectKind = pk;

  const pls = parseKeyedStyleMap(
    o.projectLifecycleStatus,
    PROJECT_LIFECYCLE_STATUS_KEYS,
  );
  if (pls) out.projectLifecycleStatus = pls;

  const pep = parseKeyedStyleMap(
    o.projectEntityPriority,
    PROJECT_ENTITY_PRIORITY_KEYS,
  );
  if (pep) out.projectEntityPriority = pep;

  const pch = parseKeyedStyleMap(
    o.projectComputedHealth,
    PROJECT_COMPUTED_HEALTH_KEYS,
  );
  if (pch) out.projectComputedHealth = pch;

  const pps = parseKeyedStyleMap(
    o.projectPortfolioSignal,
    PROJECT_PORTFOLIO_SIGNAL_KEYS,
  );
  if (pps) out.projectPortfolioSignal = pps;

  if (Array.isArray(o.custom)) {
    const custom: NonNullable<UiBadgeConfig['custom']> = [];
    for (const row of o.custom) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (typeof r.key !== 'string' || typeof r.label !== 'string') continue;
      const ent: UiBadgeStyleFields = {};
      if (isBadgePalette(r.tone)) ent.tone = r.tone;
      if (isBadgePalette(r.palette)) ent.palette = r.palette;
      const surf = coerceBadgeSurface(r.surface);
      if (surf) ent.surface = surf;
      if (isBadgeTextPreset(r.textColor)) ent.textColor = r.textColor;
      const hasStyleHint =
        isBadgePalette(r.tone) ||
        isBadgePalette(r.palette) ||
        coerceBadgeSurface(r.surface) != null ||
        isBadgeTextPreset(r.textColor);
      if (!hasStyleHint) continue;
      custom.push({ key: r.key, label: r.label, ...ent });
    }
    out.custom = custom;
  }

  return out;
}

export type MergedUiBadges = {
  projectTaskStatus: Record<ProjectTaskStatusKey, BadgeEntry>;
  projectTaskPriority: Record<ProjectTaskPriorityKey, BadgeEntry>;
  custom: Array<BadgeEntry & { key: string }>;
  projectKind: Record<ProjectKindBadgeKey, BadgeEntry>;
  projectLifecycleStatus: Record<ProjectLifecycleStatusKey, BadgeEntry>;
  projectEntityPriority: Record<ProjectEntityPriorityKey, BadgeEntry>;
  projectComputedHealth: Record<ProjectComputedHealthKey, BadgeEntry>;
  projectPortfolioSignal: Record<ProjectPortfolioSignalKey, BadgeEntry>;
};

function mergeBadgeGroup<K extends string>(
  keys: readonly K[],
  defaults: Record<K, BadgeStyle>,
  defaultLabels: Record<K, string>,
  platform: Partial<Record<K, UiBadgeStyleFields>> | undefined,
  client: Partial<Record<K, UiBadgeStyleFields>> | undefined,
): Record<K, BadgeEntry> {
  const out = {} as Record<K, BadgeEntry>;
  for (const key of keys) {
    const def = defaults[key];
    const p = platform?.[key];
    const c = client?.[key];
    const mergedFields: UiBadgeStyleFields = {
      label: c?.label ?? p?.label,
      tone: c?.tone ?? p?.tone,
      palette: c?.palette ?? p?.palette,
      surface: c?.surface ?? p?.surface,
      textColor: c?.textColor ?? p?.textColor,
    };
    const style = normalizeBadgeStyle(mergedFields, def);
    const label =
      mergedFields.label?.trim() ||
      p?.label?.trim() ||
      c?.label?.trim() ||
      defaultLabels[key];

    out[key] = {
      label,
      ...style,
      className: badgeClassForStyle(style),
    };
  }
  return out;
}

export function mergeUiBadgeConfig(
  platformStored: UiBadgeConfig | null | undefined,
  clientStored: UiBadgeConfig | null | undefined,
): MergedUiBadges {
  const projectTaskStatus = mergeBadgeGroup(
    PROJECT_TASK_STATUSES,
    DEFAULT_TASK_STATUS,
    DEFAULT_TASK_STATUS_LABELS,
    platformStored?.projectTaskStatus,
    clientStored?.projectTaskStatus,
  );

  const projectTaskPriority = mergeBadgeGroup(
    PROJECT_TASK_PRIORITIES,
    DEFAULT_TASK_PRIORITY,
    DEFAULT_TASK_PRIORITY_LABELS,
    platformStored?.projectTaskPriority,
    clientStored?.projectTaskPriority,
  );

  const projectKind = mergeBadgeGroup(
    PROJECT_KIND_KEYS,
    DEFAULT_PROJECT_KIND,
    DEFAULT_PROJECT_KIND_LABELS,
    platformStored?.projectKind,
    clientStored?.projectKind,
  );

  const projectLifecycleStatus = mergeBadgeGroup(
    PROJECT_LIFECYCLE_STATUS_KEYS,
    DEFAULT_PROJECT_LIFECYCLE_STATUS,
    DEFAULT_PROJECT_LIFECYCLE_LABELS,
    platformStored?.projectLifecycleStatus,
    clientStored?.projectLifecycleStatus,
  );

  const projectEntityPriority = mergeBadgeGroup(
    PROJECT_ENTITY_PRIORITY_KEYS,
    DEFAULT_PROJECT_ENTITY_PRIORITY,
    DEFAULT_PROJECT_ENTITY_PRIORITY_LABELS,
    platformStored?.projectEntityPriority,
    clientStored?.projectEntityPriority,
  );

  const projectComputedHealth = mergeBadgeGroup(
    PROJECT_COMPUTED_HEALTH_KEYS,
    DEFAULT_PROJECT_COMPUTED_HEALTH,
    DEFAULT_PROJECT_HEALTH_LABELS,
    platformStored?.projectComputedHealth,
    clientStored?.projectComputedHealth,
  );

  const projectPortfolioSignal = mergeBadgeGroup(
    PROJECT_PORTFOLIO_SIGNAL_KEYS,
    DEFAULT_PROJECT_PORTFOLIO_SIGNAL,
    DEFAULT_PROJECT_PORTFOLIO_LABELS,
    platformStored?.projectPortfolioSignal,
    clientStored?.projectPortfolioSignal,
  );

  const byKey = new Map<string, { key: string; label: string } & UiBadgeStyleFields>();
  for (const row of platformStored?.custom ?? []) {
    byKey.set(row.key, row);
  }
  const defCustom: BadgeStyle = {
    palette: 'neutral',
    surface: 'pastel',
    textColor: 'auto',
  };
  for (const row of clientStored?.custom ?? []) {
    byKey.set(row.key, row);
  }
  const custom = [...byKey.values()].map((row) => {
    const style = normalizeBadgeStyle(row, defCustom);
    return {
      key: row.key,
      label: row.label,
      ...style,
      className: badgeClassForStyle(style),
    };
  });

  return {
    projectTaskStatus,
    projectTaskPriority,
    custom,
    projectKind,
    projectLifecycleStatus,
    projectEntityPriority,
    projectComputedHealth,
    projectPortfolioSignal,
  };
}

export function taskStatusLabel(merged: MergedUiBadges, status: string): string {
  if ((PROJECT_TASK_STATUSES as readonly string[]).includes(status)) {
    return merged.projectTaskStatus[status as ProjectTaskStatusKey].label;
  }
  return status;
}

export function taskPriorityLabel(
  merged: MergedUiBadges,
  priority: string,
): string {
  if ((PROJECT_TASK_PRIORITIES as readonly string[]).includes(priority)) {
    return merged.projectTaskPriority[priority as ProjectTaskPriorityKey].label;
  }
  return priority;
}

export function taskStatusBadgeClass(merged: MergedUiBadges, status: string): string {
  if ((PROJECT_TASK_STATUSES as readonly string[]).includes(status)) {
    return merged.projectTaskStatus[status as ProjectTaskStatusKey].className;
  }
  return merged.projectTaskStatus.TODO.className;
}

export function taskPriorityBadgeClass(
  merged: MergedUiBadges,
  priority: string,
): string {
  if ((PROJECT_TASK_PRIORITIES as readonly string[]).includes(priority)) {
    return merged.projectTaskPriority[priority as ProjectTaskPriorityKey].className;
  }
  return merged.projectTaskPriority.MEDIUM.className;
}

export function projectKindBadgeClass(
  merged: MergedUiBadges,
  kind: string,
): string {
  if ((PROJECT_KIND_KEYS as readonly string[]).includes(kind)) {
    return merged.projectKind[kind as ProjectKindBadgeKey].className;
  }
  return merged.projectKind.PROJECT.className;
}

/** Libellés courts santé (liste dense) — les libellés longs viennent de `merged`. */
export function projectComputedHealthShortLabel(
  health: ProjectComputedHealthKey,
): string {
  const m: Record<ProjectComputedHealthKey, string> = {
    RED: 'Critique',
    ORANGE: 'Attention',
    GREEN: 'Bon',
  };
  return m[health];
}

export function projectComputedHealthBadgeClass(
  merged: MergedUiBadges,
  health: string,
): string {
  if ((PROJECT_COMPUTED_HEALTH_KEYS as readonly string[]).includes(health)) {
    return merged.projectComputedHealth[health as ProjectComputedHealthKey].className;
  }
  return merged.projectComputedHealth.ORANGE.className;
}

export function projectPortfolioSignalBadgeClass(
  merged: MergedUiBadges,
  signal: ProjectPortfolioSignalKey,
): string {
  return merged.projectPortfolioSignal[signal].className;
}
