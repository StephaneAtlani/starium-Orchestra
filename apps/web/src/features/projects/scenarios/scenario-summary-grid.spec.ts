import { describe, expect, it } from 'vitest';
import { summaryToDisplayValue } from './ScenarioSummaryGrid';

describe('summaryToDisplayValue', () => {
  it('retourne un fallback lisible si summary est null', () => {
    expect(summaryToDisplayValue(null)).toBe('Non calculé');
  });

  it('retourne "Non disponible" si objet vide', () => {
    expect(summaryToDisplayValue({})).toBe('Non disponible');
  });

  it('n effectue pas de recalcul métier et affiche la première paire clé/valeur', () => {
    expect(summaryToDisplayValue({ costDelta: 42, riskDelta: 2 })).toBe('costDelta: 42');
  });
});
