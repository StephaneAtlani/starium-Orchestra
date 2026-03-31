import { describe, expect, it } from 'vitest';
import {
  countBudgetPilotageDataColumns,
  getBudgetPilotageColumnHeaders,
} from './budget-table-columns.factory';

const M12 = Array.from({ length: 12 }, (_, i) => `M${i + 1}`);

describe('budget-table-columns.factory', () => {
  it('prévisionnel mensuel : 12 mois + total', () => {
    const h = getBudgetPilotageColumnHeaders('previsionnel', 'mensuel', M12);
    expect(h).toHaveLength(13);
    expect(h[12]?.id).toBe('total');
  });

  it('prévisionnel condensé : T1–T4 + total', () => {
    const h = getBudgetPilotageColumnHeaders('previsionnel', 'condense', M12);
    expect(h.map((x) => x.id)).toEqual(['t1', 't2', 't3', 't4', 'total']);
  });

  it('atterrissage : 6 colonnes', () => {
    const h = getBudgetPilotageColumnHeaders('atterrissage', 'mensuel', M12);
    expect(h).toHaveLength(6);
    expect(h[0]?.id).toBe('revised');
  });

  it('forecast : 4 colonnes baseline', () => {
    const h = getBudgetPilotageColumnHeaders('forecast', 'mensuel', M12);
    expect(h).toHaveLength(4);
    expect(h[1]?.id).toBe('forecastBaseline');
  });

  it('countBudgetPilotageDataColumns cohérent', () => {
    expect(countBudgetPilotageDataColumns('previsionnel', 'mensuel')).toBe(13);
    expect(countBudgetPilotageDataColumns('previsionnel', 'condense')).toBe(5);
    expect(countBudgetPilotageDataColumns('atterrissage', 'mensuel')).toBe(6);
    expect(countBudgetPilotageDataColumns('forecast', 'condense')).toBe(4);
  });

  it('dashboard : pas de colonnes pilotage (vue dédiée)', () => {
    expect(() => getBudgetPilotageColumnHeaders('dashboard', 'mensuel', M12)).toThrow();
    expect(() => countBudgetPilotageDataColumns('dashboard', 'mensuel')).toThrow();
  });
});
