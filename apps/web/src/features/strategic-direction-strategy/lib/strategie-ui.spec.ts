import { describe, expect, it } from 'vitest';
import {
  computeOkrProgressPct,
  formatOkrValueWithUnit,
  parseOkrMetricNumber,
} from './strategie-ui';

describe('parseOkrMetricNumber', () => {
  it('parse les formats FR courants', () => {
    expect(parseOkrMetricNumber('80')).toBe(80);
    expect(parseOkrMetricNumber('12,5 %')).toBe(12.5);
    expect(parseOkrMetricNumber('1 200')).toBe(1200);
    expect(parseOkrMetricNumber('50k')).toBe(50_000);
  });

  it('rejette le texte libre', () => {
    expect(parseOkrMetricNumber('—')).toBeNull();
    expect(parseOkrMetricNumber('en cours')).toBeNull();
    expect(parseOkrMetricNumber('≤ 5')).toBeNull();
  });
});

describe('computeOkrProgressPct', () => {
  it('calcule actuel / cible', () => {
    expect(computeOkrProgressPct('40', '80')).toBe(50);
    expect(computeOkrProgressPct('80', '80')).toBe(100);
    expect(computeOkrProgressPct('100', '80')).toBe(100);
  });

  it('retourne null si non numérique', () => {
    expect(computeOkrProgressPct('en cours', '80')).toBeNull();
    expect(computeOkrProgressPct('40', '0')).toBeNull();
  });
});

describe('formatOkrValueWithUnit', () => {
  it('suffixe l’unité', () => {
    expect(formatOkrValueWithUnit('5', 'jours', '—')).toBe('5 jours');
    expect(formatOkrValueWithUnit('80', '%', '—')).toBe('80 %');
  });

  it('évite le double %', () => {
    expect(formatOkrValueWithUnit('80 %', '%', '—')).toBe('80 %');
  });
});
