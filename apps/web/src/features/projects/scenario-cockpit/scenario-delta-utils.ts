export type DeltaTrend = 'up' | 'down' | 'flat';

export type DeltaResult =
  | { kind: 'unavailable' }
  | { kind: 'absolute'; abs: number; pct: number | null; trend: DeltaTrend };

/**
 * Valeurs numériques pour deltas uniquement — cast explicite, pas de NaN en sortie utilisable.
 */
export function parseDeltaNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    return raw;
  }
  if (typeof raw === 'string') {
    const n = Number(raw.trim().replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return n;
  }
  return null;
}

export function computeDelta(baselineRaw: unknown, comparedRaw: unknown): DeltaResult {
  const b = parseDeltaNumber(baselineRaw);
  const c = parseDeltaNumber(comparedRaw);
  if (b === null || c === null) return { kind: 'unavailable' };
  const abs = c - b;
  if (!Number.isFinite(abs)) return { kind: 'unavailable' };
  if (abs === 0) return { kind: 'absolute', abs: 0, pct: 0, trend: 'flat' };
  let pct: number | null = null;
  if (b !== 0) {
    pct = (abs / b) * 100;
    if (!Number.isFinite(pct)) pct = null;
  }
  const trend: DeltaTrend = abs > 0 ? 'up' : 'down';
  return { kind: 'absolute', abs, pct, trend };
}
