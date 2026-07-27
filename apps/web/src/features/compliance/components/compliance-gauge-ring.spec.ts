import { describe, expect, it } from 'vitest';
import { complianceTone } from './compliance-gauge-ring';

describe('complianceTone', () => {
  it('classe 80 % et plus en succès', () => {
    expect(complianceTone(80)).toBe('success');
    expect(complianceTone(100)).toBe('success');
  });

  it('classe 50–79 % en progression', () => {
    expect(complianceTone(50)).toBe('progress');
    expect(complianceTone(79)).toBe('progress');
  });

  it('classe sous 50 % en risque', () => {
    expect(complianceTone(49)).toBe('risk');
    expect(complianceTone(0)).toBe('risk');
  });

  it('distingue l’absence d’évaluation d’un taux nul', () => {
    expect(complianceTone(null)).toBe('unknown');
    expect(complianceTone(0)).toBe('risk');
  });
});
