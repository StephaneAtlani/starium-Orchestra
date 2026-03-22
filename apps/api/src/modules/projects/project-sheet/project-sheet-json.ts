import { Prisma } from '@prisma/client';

/** V2 : possibilité d'intégrer SWOT/TOWS dans le scoring automatique — MVP : descriptif uniquement. */

export type TowsActionsShape = {
  SO: string[];
  ST: string[];
  WO: string[];
  WT: string[];
};

export function parseJsonStringArray(
  v: Prisma.JsonValue | null | undefined,
): string[] | null {
  if (v === null || v === undefined) return null;
  if (!Array.isArray(v)) return null;
  const out = v.filter((x): x is string => typeof x === 'string');
  return out.length ? out : null;
}

export function parseTowsActions(
  v: Prisma.JsonValue | null | undefined,
): TowsActionsShape | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object' || Array.isArray(v) || v === null) return null;
  const o = v as Record<string, unknown>;
  const keys = ['SO', 'ST', 'WO', 'WT'] as const;
  const result: TowsActionsShape = { SO: [], ST: [], WO: [], WT: [] };
  let any = false;
  for (const k of keys) {
    const a = o[k];
    if (!Array.isArray(a)) continue;
    const s = a.filter((x): x is string => typeof x === 'string');
    result[k] = s;
    if (s.length) any = true;
  }
  return any ? result : null;
}
