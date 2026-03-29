import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Aligné sur `apps/web/src/lib/ui/badge-registry.ts` */
const BADGE_PALETTES = new Set([
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
]);

const BADGE_SURFACES = new Set(['pastel', 'dark', 'vivid']);

function coerceSurface(s: string): string | undefined {
  if (BADGE_SURFACES.has(s)) return s;
  const legacy: Record<string, string> = {
    soft: 'pastel',
    solid: 'vivid',
    dark: 'dark',
    outline: 'pastel',
  };
  return legacy[s];
}

const BADGE_TEXT_PRESETS = new Set(['auto', 'dark', 'light', 'muted']);

const TASK_STATUS_KEYS = new Set([
  'DRAFT',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
]);

const TASK_PRIORITY_KEYS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const PROJECT_KIND_KEYS = new Set(['PROJECT', 'ACTIVITY']);

const PROJECT_LIFECYCLE_KEYS = new Set([
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);

const PROJECT_ENTITY_PRIORITY_KEYS = new Set(['LOW', 'MEDIUM', 'HIGH']);

const PROJECT_COMPUTED_HEALTH_KEYS = new Set(['RED', 'ORANGE', 'GREEN']);

const PROJECT_PORTFOLIO_SIGNAL_KEYS = new Set([
  'late',
  'blocked',
  'critical',
  'norisk',
  'noowner',
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseBadgeMapSection(
  raw: Record<string, unknown>,
  prop: string,
  keySet: Set<string>,
  unknownKeyMessage: (k: string) => string,
): Record<string, unknown> | undefined {
  if (!(prop in raw)) {
    return undefined;
  }
  const v = raw[prop];
  if (v == null) {
    return undefined;
  }
  if (!isPlainObject(v)) {
    throw new BadRequestException(`${prop} invalide`);
  }
  const m: Record<string, unknown> = {};
  for (const [k, entry] of Object.entries(v)) {
    if (!keySet.has(k)) {
      throw new BadRequestException(unknownKeyMessage(k));
    }
    m[k] = parseEntry(entry, `${prop}.${k}`);
  }
  return m;
}

/**
 * Valide le corps JSON des badges UI (client ou plateforme).
 */
export function parseUiBadgeConfigPayload(raw: unknown): Prisma.InputJsonValue {
  if (raw == null) {
    return {};
  }
  if (!isPlainObject(raw)) {
    throw new BadRequestException('uiBadgeConfig doit être un objet JSON');
  }

  const allowedTop = new Set([
    'projectTaskStatus',
    'projectTaskPriority',
    'custom',
    'projectKind',
    'projectLifecycleStatus',
    'projectEntityPriority',
    'projectComputedHealth',
    'projectPortfolioSignal',
  ]);
  for (const k of Object.keys(raw)) {
    if (!allowedTop.has(k)) {
      throw new BadRequestException(`Clé inconnue dans uiBadgeConfig: ${k}`);
    }
  }

  const out: Record<string, unknown> = {};

  if ('projectTaskStatus' in raw) {
    const v = raw.projectTaskStatus;
    if (v != null && !isPlainObject(v)) {
      throw new BadRequestException('projectTaskStatus invalide');
    }
    if (v) {
      const m: Record<string, unknown> = {};
      for (const [k, entry] of Object.entries(v)) {
        if (!TASK_STATUS_KEYS.has(k)) {
          throw new BadRequestException(`Statut tâche inconnu: ${k}`);
        }
        m[k] = parseEntry(entry, `projectTaskStatus.${k}`);
      }
      out.projectTaskStatus = m;
    }
  }

  if ('projectTaskPriority' in raw) {
    const v = raw.projectTaskPriority;
    if (v != null && !isPlainObject(v)) {
      throw new BadRequestException('projectTaskPriority invalide');
    }
    if (v) {
      const m: Record<string, unknown> = {};
      for (const [k, entry] of Object.entries(v)) {
        if (!TASK_PRIORITY_KEYS.has(k)) {
          throw new BadRequestException(`Priorité tâche inconnue: ${k}`);
        }
        m[k] = parseEntry(entry, `projectTaskPriority.${k}`);
      }
      out.projectTaskPriority = m;
    }
  }

  if ('custom' in raw && raw.custom != null) {
    if (!Array.isArray(raw.custom)) {
      throw new BadRequestException('custom doit être un tableau');
    }
    const custom: unknown[] = [];
    for (let i = 0; i < raw.custom.length; i++) {
      const item = raw.custom[i];
      if (!isPlainObject(item)) {
        throw new BadRequestException(`custom[${i}] invalide`);
      }
      const key = item.key;
      const label = item.label;
      if (typeof key !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(key)) {
        throw new BadRequestException(
          `custom[${i}].key : slug requis (a-z, 2-64 car.)`,
        );
      }
      if (typeof label !== 'string' || label.length < 1 || label.length > 80) {
        throw new BadRequestException(
          `custom[${i}].label : chaîne 1–80 caractères`,
        );
      }
      const style = parseEntry(item, `custom[${i}]`, true);
      custom.push({ key, label, ...style });
    }
    out.custom = custom;
  }

  const projectKind = parseBadgeMapSection(
    raw,
    'projectKind',
    PROJECT_KIND_KEYS,
    (k) => `projectKind inconnu: ${k}`,
  );
  if (projectKind) {
    out.projectKind = projectKind;
  }

  const projectLifecycleStatus = parseBadgeMapSection(
    raw,
    'projectLifecycleStatus',
    PROJECT_LIFECYCLE_KEYS,
    (k) => `projectLifecycleStatus inconnu: ${k}`,
  );
  if (projectLifecycleStatus) {
    out.projectLifecycleStatus = projectLifecycleStatus;
  }

  const projectEntityPriority = parseBadgeMapSection(
    raw,
    'projectEntityPriority',
    PROJECT_ENTITY_PRIORITY_KEYS,
    (k) => `projectEntityPriority inconnu: ${k}`,
  );
  if (projectEntityPriority) {
    out.projectEntityPriority = projectEntityPriority;
  }

  const projectComputedHealth = parseBadgeMapSection(
    raw,
    'projectComputedHealth',
    PROJECT_COMPUTED_HEALTH_KEYS,
    (k) => `projectComputedHealth inconnu: ${k}`,
  );
  if (projectComputedHealth) {
    out.projectComputedHealth = projectComputedHealth;
  }

  const projectPortfolioSignal = parseBadgeMapSection(
    raw,
    'projectPortfolioSignal',
    PROJECT_PORTFOLIO_SIGNAL_KEYS,
    (k) => `projectPortfolioSignal inconnu: ${k}`,
  );
  if (projectPortfolioSignal) {
    out.projectPortfolioSignal = projectPortfolioSignal;
  }

  return out as Prisma.InputJsonValue;
}

function parseEntry(
  entry: unknown,
  path: string,
  isCustomRow = false,
): Record<string, unknown> {
  if (entry == null) {
    return {};
  }
  if (!isPlainObject(entry)) {
    throw new BadRequestException(`${path} : objet attendu`);
  }
  const out: Record<string, unknown> = {};
  if ('label' in entry && entry.label != null) {
    if (typeof entry.label !== 'string' || entry.label.length > 120) {
      throw new BadRequestException(`${path}.label invalide`);
    }
    out.label = entry.label;
  }
  if ('tone' in entry && entry.tone != null) {
    if (typeof entry.tone !== 'string' || !BADGE_PALETTES.has(entry.tone)) {
      throw new BadRequestException(`${path}.tone invalide`);
    }
    out.tone = entry.tone;
  }
  if ('palette' in entry && entry.palette != null) {
    if (typeof entry.palette !== 'string' || !BADGE_PALETTES.has(entry.palette)) {
      throw new BadRequestException(`${path}.palette invalide`);
    }
    out.palette = entry.palette;
  }
  if ('surface' in entry && entry.surface != null) {
    if (typeof entry.surface !== 'string') {
      throw new BadRequestException(`${path}.surface invalide`);
    }
    const coerced = coerceSurface(entry.surface);
    if (coerced == null) {
      throw new BadRequestException(`${path}.surface invalide`);
    }
    out.surface = coerced;
  }
  if ('textColor' in entry && entry.textColor != null) {
    if (
      typeof entry.textColor !== 'string' ||
      !BADGE_TEXT_PRESETS.has(entry.textColor)
    ) {
      throw new BadRequestException(`${path}.textColor invalide`);
    }
    out.textColor = entry.textColor;
  }

  if (isCustomRow) {
    const hasLegacy = out.tone != null;
    const hasPalette = out.palette != null;
    if (hasPalette) {
      if (out.surface == null || out.textColor == null) {
        throw new BadRequestException(
          `${path} : surface et textColor requis avec palette`,
        );
      }
    } else if (!hasLegacy) {
      throw new BadRequestException(
        `${path} : tone ou (palette + surface + textColor) requis`,
      );
    }
  }

  return out;
}
