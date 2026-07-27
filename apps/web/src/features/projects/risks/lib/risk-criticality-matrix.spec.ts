import { describe, expect, it } from 'vitest';
import {
  buildRiskMatrix,
  criticalityLevelFromPiScore,
  RISK_MATRIX_IMPACT_COLS,
  RISK_MATRIX_PROBABILITY_ROWS,
} from './risk-criticality-matrix';

describe('criticalityLevelFromPiScore', () => {
  it('reproduit les seuils serveur (4 / 9 / 16)', () => {
    expect(criticalityLevelFromPiScore(1)).toBe('LOW');
    expect(criticalityLevelFromPiScore(4)).toBe('LOW');
    expect(criticalityLevelFromPiScore(5)).toBe('MEDIUM');
    expect(criticalityLevelFromPiScore(9)).toBe('MEDIUM');
    expect(criticalityLevelFromPiScore(10)).toBe('HIGH');
    expect(criticalityLevelFromPiScore(16)).toBe('HIGH');
    expect(criticalityLevelFromPiScore(17)).toBe('CRITICAL');
    expect(criticalityLevelFromPiScore(25)).toBe('CRITICAL');
  });
});

describe('buildRiskMatrix', () => {
  it('rend une grille 5×5 orientée vraisemblance décroissante / gravité croissante', () => {
    const { cells } = buildRiskMatrix([]);
    expect(cells).toHaveLength(RISK_MATRIX_PROBABILITY_ROWS.length);
    expect(cells[0]).toHaveLength(RISK_MATRIX_IMPACT_COLS.length);
    expect(cells[0][0].probability).toBe(5);
    expect(cells[0][0].impact).toBe(1);
    expect(cells[4][4].probability).toBe(1);
    expect(cells[4][4].impact).toBe(5);
  });

  it('compte les risques sur la bonne case', () => {
    const { cells, total, outOfScale } = buildRiskMatrix([
      { probability: 5, impact: 5 },
      { probability: 5, impact: 5 },
      { probability: 1, impact: 1 },
    ]);

    const topRight = cells[0][4];
    expect(topRight.probability).toBe(5);
    expect(topRight.impact).toBe(5);
    expect(topRight.count).toBe(2);
    expect(topRight.score).toBe(25);
    expect(topRight.level).toBe('CRITICAL');

    const bottomLeft = cells[4][0];
    expect(bottomLeft.count).toBe(1);
    expect(bottomLeft.level).toBe('LOW');

    expect(total).toBe(3);
    expect(outOfScale).toBe(0);
  });

  it('isole les valeurs hors échelle 1–5 au lieu de les compter', () => {
    const { total, outOfScale, cells } = buildRiskMatrix([
      { probability: 0, impact: 3 },
      { probability: 3, impact: 9 },
      { probability: Number.NaN, impact: 2 },
      { probability: 2, impact: 2 },
    ]);

    expect(total).toBe(1);
    expect(outOfScale).toBe(3);
    expect(cells.flat().reduce((sum, c) => sum + c.count, 0)).toBe(1);
  });
});
