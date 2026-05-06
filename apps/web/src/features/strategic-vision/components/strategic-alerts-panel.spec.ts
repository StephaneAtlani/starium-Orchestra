import { describe, expect, it } from 'vitest';
import { formatAlertDate } from './strategic-alerts-panel';
import { getAlertSeverityLabel, getAlertTypeLabel } from '../lib/strategic-vision-labels';

describe('strategic-alerts-panel helpers', () => {
  it('formate les dates valides en locale fr', () => {
    expect(formatAlertDate('2026-05-01T00:00:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('retourne la valeur brute si date invalide', () => {
    expect(formatAlertDate('not-a-date')).toBe('not-a-date');
  });

  it('mappe les enums alertes vers des libellés métier FR', () => {
    expect(getAlertTypeLabel('OBJECTIVE_OVERDUE')).toBe('Objectif en retard');
    expect(getAlertSeverityLabel('CRITICAL')).toBe('Critique');
  });
});
