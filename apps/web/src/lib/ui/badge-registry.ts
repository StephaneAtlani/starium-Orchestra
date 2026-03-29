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

/** Ton de surface (accord avec la palette). */
export const BADGE_SURFACES = [
  'pastel',
  'soft',
  'solid',
  'dark',
  'outline',
] as const;

export type BadgeSurface = (typeof BADGE_SURFACES)[number];

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
  soft: 'border-border bg-muted dark:border-border dark:bg-muted/80',
  solid: 'border-primary bg-primary dark:border-primary dark:bg-primary',
  dark: 'border-foreground/20 bg-foreground/10 dark:border-border dark:bg-muted',
  outline: 'border-2 border-border bg-transparent',
};

const NEUTRAL_TEXT_AUTO: Record<BadgeSurface, string> = {
  pastel: 'text-foreground',
  soft: 'text-foreground',
  solid: 'text-primary-foreground',
  dark: 'text-foreground',
  outline: 'text-foreground',
};

const TEXT_PRESET_CLASS: Record<
  Exclude<BadgeTextPreset, 'auto'>,
  string
> = {
  dark: 'text-slate-950 dark:text-slate-50',
  light: 'text-white dark:text-white',
  muted: 'text-muted-foreground',
};

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
    textColor === 'auto' ? autoText : TEXT_PRESET_CLASS[textColor];
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

export const BADGE_SURFACE_LABELS: Record<BadgeSurface, string> = {
  pastel: 'Pastel',
  soft: 'Doux (moyen)',
  solid: 'Plein',
  dark: 'Foncé',
  outline: 'Contour',
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

const DEFAULT_TASK_STATUS: Record<ProjectTaskStatusKey, BadgeStyle> = {
  DRAFT: { palette: 'slate', surface: 'pastel', textColor: 'auto' },
  TODO: { palette: 'neutral', surface: 'pastel', textColor: 'auto' },
  IN_PROGRESS: { palette: 'sky', surface: 'pastel', textColor: 'auto' },
  BLOCKED: { palette: 'red', surface: 'pastel', textColor: 'auto' },
  DONE: { palette: 'emerald', surface: 'pastel', textColor: 'auto' },
  CANCELLED: { palette: 'slate', surface: 'pastel', textColor: 'auto' },
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
  MEDIUM: { palette: 'slate', surface: 'pastel', textColor: 'auto' },
  HIGH: { palette: 'amber', surface: 'pastel', textColor: 'auto' },
  CRITICAL: { palette: 'red', surface: 'pastel', textColor: 'auto' },
};

const DEFAULT_TASK_PRIORITY_LABELS: Record<ProjectTaskPriorityKey, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
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
};

function isBadgePalette(v: unknown): v is BadgePalette {
  return typeof v === 'string' && (BADGE_PALETTES as readonly string[]).includes(v);
}

function isBadgeSurface(v: unknown): v is BadgeSurface {
  return typeof v === 'string' && (BADGE_SURFACES as readonly string[]).includes(v);
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
  const surface = entry.surface ?? def.surface;
  const textColor = entry.textColor ?? def.textColor;
  return { palette, surface, textColor };
}

/** Parse JSON API → structure typée (permissif). */
export function parseUiBadgeConfig(raw: unknown): UiBadgeConfig | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const out: UiBadgeConfig = {};

  if (
    o.projectTaskStatus &&
    typeof o.projectTaskStatus === 'object' &&
    !Array.isArray(o.projectTaskStatus)
  ) {
    const m: UiBadgeConfig['projectTaskStatus'] = {};
    for (const k of Object.keys(o.projectTaskStatus)) {
      if (!(PROJECT_TASK_STATUSES as readonly string[]).includes(k)) continue;
      const e = (o.projectTaskStatus as Record<string, unknown>)[k];
      if (!e || typeof e !== 'object') continue;
      const ent = e as Record<string, unknown>;
      const row: UiBadgeStyleFields = {};
      if (typeof ent.label === 'string') row.label = ent.label;
      if (isBadgePalette(ent.tone)) row.tone = ent.tone;
      if (isBadgePalette(ent.palette)) row.palette = ent.palette;
      if (isBadgeSurface(ent.surface)) row.surface = ent.surface;
      if (isBadgeTextPreset(ent.textColor)) row.textColor = ent.textColor;
      m[k as ProjectTaskStatusKey] = row;
    }
    out.projectTaskStatus = m;
  }

  if (
    o.projectTaskPriority &&
    typeof o.projectTaskPriority === 'object' &&
    !Array.isArray(o.projectTaskPriority)
  ) {
    const m: UiBadgeConfig['projectTaskPriority'] = {};
    for (const k of Object.keys(o.projectTaskPriority)) {
      if (!(PROJECT_TASK_PRIORITIES as readonly string[]).includes(k)) continue;
      const e = (o.projectTaskPriority as Record<string, unknown>)[k];
      if (!e || typeof e !== 'object') continue;
      const ent = e as Record<string, unknown>;
      const row: UiBadgeStyleFields = {};
      if (typeof ent.label === 'string') row.label = ent.label;
      if (isBadgePalette(ent.tone)) row.tone = ent.tone;
      if (isBadgePalette(ent.palette)) row.palette = ent.palette;
      if (isBadgeSurface(ent.surface)) row.surface = ent.surface;
      if (isBadgeTextPreset(ent.textColor)) row.textColor = ent.textColor;
      m[k as ProjectTaskPriorityKey] = row;
    }
    out.projectTaskPriority = m;
  }

  if (Array.isArray(o.custom)) {
    const custom: NonNullable<UiBadgeConfig['custom']> = [];
    for (const row of o.custom) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (typeof r.key !== 'string' || typeof r.label !== 'string') continue;
      const ent: UiBadgeStyleFields = {};
      if (isBadgePalette(r.tone)) ent.tone = r.tone;
      if (isBadgePalette(r.palette)) ent.palette = r.palette;
      if (isBadgeSurface(r.surface)) ent.surface = r.surface;
      if (isBadgeTextPreset(r.textColor)) ent.textColor = r.textColor;
      const hasStyleHint =
        isBadgePalette(r.tone) ||
        isBadgePalette(r.palette) ||
        isBadgeSurface(r.surface) ||
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
};

export function mergeUiBadgeConfig(
  platformStored: UiBadgeConfig | null | undefined,
  clientStored: UiBadgeConfig | null | undefined,
): MergedUiBadges {
  const projectTaskStatus = {} as Record<ProjectTaskStatusKey, BadgeEntry>;
  for (const key of PROJECT_TASK_STATUSES) {
    const def = DEFAULT_TASK_STATUS[key];
    const p = platformStored?.projectTaskStatus?.[key];
    const c = clientStored?.projectTaskStatus?.[key];
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
      DEFAULT_TASK_STATUS_LABELS[key];

    projectTaskStatus[key] = {
      label,
      ...style,
      className: badgeClassForStyle(style),
    };
  }

  const projectTaskPriority = {} as Record<ProjectTaskPriorityKey, BadgeEntry>;
  for (const key of PROJECT_TASK_PRIORITIES) {
    const def = DEFAULT_TASK_PRIORITY[key];
    const p = platformStored?.projectTaskPriority?.[key];
    const c = clientStored?.projectTaskPriority?.[key];
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
      DEFAULT_TASK_PRIORITY_LABELS[key];

    projectTaskPriority[key] = {
      label,
      ...style,
      className: badgeClassForStyle(style),
    };
  }

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

  return { projectTaskStatus, projectTaskPriority, custom };
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
