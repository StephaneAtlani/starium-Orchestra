import { describe, expect, it } from 'vitest';
import {
  formatAlertDate,
  paginateStrategicAlerts,
  STRATEGIC_ALERTS_PAGE_SIZE,
} from './strategic-alerts-panel';
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

  it('paginate 5 alertes par page par défaut', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({ id: String(index) }));
    const page1 = paginateStrategicAlerts(items, 1);
    const page3 = paginateStrategicAlerts(items, 3);

    expect(STRATEGIC_ALERTS_PAGE_SIZE).toBe(5);
    expect(page1.pageItems).toHaveLength(5);
    expect(page1.safePage).toBe(1);
    expect(page1.totalPages).toBe(3);
    expect(page3.pageItems).toHaveLength(2);
    expect(page3.start).toBe(10);
  });

  it('borne la page demandée au nombre total de pages', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const out = paginateStrategicAlerts(items, 99);

    expect(out.safePage).toBe(1);
    expect(out.pageItems).toHaveLength(2);
  });
});
