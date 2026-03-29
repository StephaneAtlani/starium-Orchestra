/**
 * Registre unique des badges Starium (tons Tailwind + libellés par défaut dans le code).
 * Fusion : défauts code → `PlatformUiBadgeSettings.badgeConfig` → `Client.uiBadgeConfig`.
 */
import { cn } from '@/lib/utils';

/**
 * Tons disponibles (neutres + palette Tailwind complète pour libellés / pastilles).
 * Garder aligné avec `ui-badge-config.parse.ts` côté API.
 */
export const BADGE_TONES = [
  'neutral',
  // Neutres
  'slate',
  'gray',
  'zinc',
  'stone',
  // Rouges / oranges / jaunes
  'red',
  'orange',
  'amber',
  'yellow',
  'rose',
  // Violets / roses / fuchsia
  'pink',
  'fuchsia',
  'purple',
  'violet',
  // Bleus
  'indigo',
  'blue',
  'sky',
  'cyan',
  // Verts / bleus-verts
  'teal',
  'emerald',
  'green',
  'lime',
] as const;

export type BadgeTone = (typeof BADGE_TONES)[number];

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

/** Classes Tailwind complètes par ton (pastel clair + texte foncé ; dark : fond dense + texte clair). */
export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    'border-border bg-background text-foreground dark:border-border dark:bg-muted/50 dark:text-foreground',
  slate:
    'border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-50',
  gray: 'border-gray-200 bg-gray-100 text-gray-900 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-50',
  zinc: 'border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-50',
  stone:
    'border-stone-200 bg-stone-100 text-stone-900 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-50',
  red: 'border-red-200 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/70 dark:text-red-50',
  orange:
    'border-orange-200 bg-orange-100 text-orange-950 dark:border-orange-800 dark:bg-orange-950/70 dark:text-orange-50',
  amber:
    'border-amber-200 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-50',
  yellow:
    'border-yellow-200 bg-yellow-100 text-yellow-950 dark:border-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-50',
  rose: 'border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-50',
  pink: 'border-pink-200 bg-pink-100 text-pink-900 dark:border-pink-800 dark:bg-pink-950/70 dark:text-pink-50',
  fuchsia:
    'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-800 dark:bg-fuchsia-950/70 dark:text-fuchsia-50',
  purple:
    'border-purple-200 bg-purple-100 text-purple-900 dark:border-purple-800 dark:bg-purple-950/70 dark:text-purple-50',
  violet:
    'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-800 dark:bg-violet-950/70 dark:text-violet-50',
  indigo:
    'border-indigo-200 bg-indigo-100 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-50',
  blue: 'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-50',
  sky: 'border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-50',
  cyan: 'border-cyan-200 bg-cyan-100 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-50',
  teal: 'border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-800 dark:bg-teal-950/70 dark:text-teal-50',
  emerald:
    'border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-50',
  green:
    'border-green-200 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/70 dark:text-green-50',
  lime: 'border-lime-200 bg-lime-100 text-lime-900 dark:border-lime-800 dark:bg-lime-950/70 dark:text-lime-50',
};

export function badgeClassForTone(tone: BadgeTone): string {
  return cn('font-normal', BADGE_TONE_CLASSES[tone]);
}

const DEFAULT_TASK_STATUS: Record<
  ProjectTaskStatusKey,
  { label: string; tone: BadgeTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'slate' },
  TODO: { label: 'À faire', tone: 'neutral' },
  IN_PROGRESS: { label: 'En cours', tone: 'sky' },
  BLOCKED: { label: 'Bloquée', tone: 'red' },
  DONE: { label: 'Terminée', tone: 'emerald' },
  CANCELLED: { label: 'Annulée', tone: 'slate' },
};

const DEFAULT_TASK_PRIORITY: Record<
  ProjectTaskPriorityKey,
  { label: string; tone: BadgeTone }
> = {
  LOW: { label: 'Basse', tone: 'neutral' },
  MEDIUM: { label: 'Moyenne', tone: 'slate' },
  HIGH: { label: 'Haute', tone: 'amber' },
  CRITICAL: { label: 'Critique', tone: 'red' },
};

export type BadgeEntry = { label: string; tone: BadgeTone; className: string };

export type UiBadgeConfig = {
  projectTaskStatus?: Partial<
    Record<ProjectTaskStatusKey, { label?: string; tone?: BadgeTone }>
  >;
  projectTaskPriority?: Partial<
    Record<ProjectTaskPriorityKey, { label?: string; tone?: BadgeTone }>
  >;
  custom?: Array<{ key: string; label: string; tone: BadgeTone }>;
};

function isBadgeTone(v: unknown): v is BadgeTone {
  return typeof v === 'string' && (BADGE_TONES as readonly string[]).includes(v);
}

/** Parse JSON API → structure typée (permissif). */
export function parseUiBadgeConfig(raw: unknown): UiBadgeConfig | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const out: UiBadgeConfig = {};

  if (o.projectTaskStatus && typeof o.projectTaskStatus === 'object' && !Array.isArray(o.projectTaskStatus)) {
    const m: UiBadgeConfig['projectTaskStatus'] = {};
    for (const k of Object.keys(o.projectTaskStatus)) {
      if (!(PROJECT_TASK_STATUSES as readonly string[]).includes(k)) continue;
      const e = (o.projectTaskStatus as Record<string, unknown>)[k];
      if (!e || typeof e !== 'object') continue;
      const ent = e as Record<string, unknown>;
      const label = typeof ent.label === 'string' ? ent.label : undefined;
      const tone = isBadgeTone(ent.tone) ? ent.tone : undefined;
      m[k as ProjectTaskStatusKey] = { label, tone };
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
      const label = typeof ent.label === 'string' ? ent.label : undefined;
      const tone = isBadgeTone(ent.tone) ? ent.tone : undefined;
      m[k as ProjectTaskPriorityKey] = { label, tone };
    }
    out.projectTaskPriority = m;
  }

  if (Array.isArray(o.custom)) {
    const custom: NonNullable<UiBadgeConfig['custom']> = [];
    for (const row of o.custom) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (
        typeof r.key === 'string' &&
        typeof r.label === 'string' &&
        isBadgeTone(r.tone)
      ) {
        custom.push({ key: r.key, label: r.label, tone: r.tone });
      }
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

/**
 * Fusion : défauts code → surcharges **plateforme** → surcharges **client**.
 */
export function mergeUiBadgeConfig(
  platformStored: UiBadgeConfig | null | undefined,
  clientStored: UiBadgeConfig | null | undefined,
): MergedUiBadges {
  const projectTaskStatus = {} as Record<ProjectTaskStatusKey, BadgeEntry>;
  for (const key of PROJECT_TASK_STATUSES) {
    const def = DEFAULT_TASK_STATUS[key];
    const p = platformStored?.projectTaskStatus?.[key];
    const c = clientStored?.projectTaskStatus?.[key];
    const label = c?.label?.trim() || p?.label?.trim() || def.label;
    const tone = c?.tone ?? p?.tone ?? def.tone;
    projectTaskStatus[key] = {
      label,
      tone,
      className: badgeClassForTone(tone),
    };
  }

  const projectTaskPriority = {} as Record<ProjectTaskPriorityKey, BadgeEntry>;
  for (const key of PROJECT_TASK_PRIORITIES) {
    const def = DEFAULT_TASK_PRIORITY[key];
    const p = platformStored?.projectTaskPriority?.[key];
    const c = clientStored?.projectTaskPriority?.[key];
    const label = c?.label?.trim() || p?.label?.trim() || def.label;
    const tone = c?.tone ?? p?.tone ?? def.tone;
    projectTaskPriority[key] = {
      label,
      tone,
      className: badgeClassForTone(tone),
    };
  }

  const byKey = new Map<
    string,
    { key: string; label: string; tone: BadgeTone }
  >();
  for (const row of platformStored?.custom ?? []) {
    byKey.set(row.key, row);
  }
  for (const row of clientStored?.custom ?? []) {
    byKey.set(row.key, row);
  }
  const custom = [...byKey.values()].map((c) => ({
    key: c.key,
    label: c.label,
    tone: c.tone,
    className: badgeClassForTone(c.tone),
  }));

  return { projectTaskStatus, projectTaskPriority, custom };
}

/** Libellés par code (fallback code brut si inconnu). */
export function taskStatusLabel(
  merged: MergedUiBadges,
  status: string,
): string {
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
