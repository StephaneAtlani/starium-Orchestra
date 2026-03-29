import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Aligné sur `apps/web/src/lib/ui/badge-registry.ts` → BADGE_TONES */
const BADGE_TONES = new Set([
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

const TASK_STATUS_KEYS = new Set([
  'DRAFT',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
]);

const TASK_PRIORITY_KEYS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
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
      const tone = item.tone;
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
      if (typeof tone !== 'string' || !BADGE_TONES.has(tone)) {
        throw new BadRequestException(`custom[${i}].tone invalide`);
      }
      custom.push({ key, label, tone });
    }
    out.custom = custom;
  }

  return out as Prisma.InputJsonValue;
}

function parseEntry(entry: unknown, path: string): Record<string, unknown> {
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
    if (typeof entry.tone !== 'string' || !BADGE_TONES.has(entry.tone)) {
      throw new BadRequestException(`${path}.tone invalide`);
    }
    out.tone = entry.tone;
  }
  return out;
}
