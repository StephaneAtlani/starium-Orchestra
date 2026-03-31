import { describe, expect, it } from 'vitest';
import { guessMappingFromColumnHeaders } from './budget-import-guess-mapping';

describe('guessMappingFromColumnHeaders', () => {
  it('mappe des en-têtes FR typiques export ERP', () => {
    const cols = ['Métier', 'Compte', 'Libellé compte', 'Montant', 'Devise'];
    const g = guessMappingFromColumnHeaders(cols);
    expect(g.amount).toBe('Montant');
    expect(g.currency).toBe('Devise');
    expect(g.name).toBeDefined();
    expect(g.envelopeCode).toBe('Compte');
  });

  it('n’assigne pas deux fois la même colonne', () => {
    const cols = ['Montant'];
    const g = guessMappingFromColumnHeaders(cols);
    expect(Object.values(g).filter((v) => v === 'Montant').length).toBe(1);
  });

  it('reconnaît libellé / intitulé pour le nom', () => {
    expect(guessMappingFromColumnHeaders(['Intitulé ligne']).name).toBe('Intitulé ligne');
    expect(guessMappingFromColumnHeaders(['Libellé']).name).toBe('Libellé');
  });
});
