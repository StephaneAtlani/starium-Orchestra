import { describe, expect, it } from 'vitest';
import { suggestStrategicAxisIconKeyFromTitle } from './strategic-axis-icon-suggest-from-title';

describe('suggestStrategicAxisIconKeyFromTitle', () => {
  it('retourne null si titre vide', () => {
    expect(suggestStrategicAxisIconKeyFromTitle('')).toBeNull();
    expect(suggestStrategicAxisIconKeyFromTitle('   ')).toBeNull();
  });

  it('ignore les accents', () => {
    expect(suggestStrategicAxisIconKeyFromTitle('Axe Sécurité')).toBe('shield');
    expect(suggestStrategicAxisIconKeyFromTitle('Performance opérationnelle')).toBe('barChart');
  });

  it('matche des mots-clés', () => {
    expect(suggestStrategicAxisIconKeyFromTitle('Croissance 2026')).toBe('trendingUp');
    expect(suggestStrategicAxisIconKeyFromTitle('Processus internes')).toBe('workflow');
  });
});
