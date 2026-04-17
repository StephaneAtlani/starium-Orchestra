import { describe, expect, it } from 'vitest';
import { computeDelta, parseDeltaNumber } from './scenario-delta-utils';

describe('parseDeltaNumber', () => {
  it('retourne null pour undefined / NaN', () => {
    expect(parseDeltaNumber(undefined)).toBe(null);
    expect(parseDeltaNumber(Number.NaN)).toBe(null);
  });

  it('parse les chaînes numériques', () => {
    expect(parseDeltaNumber('12,5')).toBe(12.5);
    expect(parseDeltaNumber(' 100 ')).toBe(100);
  });
});

describe('computeDelta', () => {
  it('baseline null => indisponible', () => {
    expect(computeDelta(null, 5).kind).toBe('unavailable');
  });

  it('baseline 0 => delta absolu sans % utilisable (pct null si division impossible)', () => {
    const d = computeDelta(0, 10);
    expect(d.kind).toBe('absolute');
    if (d.kind === 'absolute') {
      expect(d.abs).toBe(10);
      expect(d.pct).toBe(null);
    }
  });

  it('baseline non nulle => pourcentage', () => {
    const d = computeDelta(100, 150);
    expect(d.kind).toBe('absolute');
    if (d.kind === 'absolute') {
      expect(d.abs).toBe(50);
      expect(d.pct).toBe(50);
    }
  });
});
