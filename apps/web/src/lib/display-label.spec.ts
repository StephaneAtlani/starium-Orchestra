import { describe, expect, it } from 'vitest';
import { displayLabel, firstDisplayLabel, isTechnicalId } from './display-label';

describe('isTechnicalId', () => {
  it.each([
    '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    'ckl9v1x2h0000qzrmn831i7rn',
    '507f1f77bcf86cd799439011',
    '1048576',
    'V1StGXR8Z5jdHi6BmyT1a2',
  ])('détecte %s comme identifiant technique', (value) => {
    expect(isTechnicalId(value)).toBe(true);
  });

  it.each([
    'Budget informatique 2026',
    'BUD-2026-001',
    'RH',
    'BUDGET_VALIDE',
    'Marie Dupont',
    'Infrastructure réseau et télécoms',
    '2026',
  ])('laisse passer le libellé métier %s', (value) => {
    expect(isTechnicalId(value)).toBe(false);
  });

  it('ignore les valeurs non textuelles', () => {
    expect(isTechnicalId(null)).toBe(false);
    expect(isTechnicalId(42)).toBe(false);
  });
});

describe('displayLabel', () => {
  it('renvoie le libellé métier tel quel', () => {
    expect(displayLabel('  Ligne serveurs  ')).toBe('Ligne serveurs');
  });

  it('remplace un identifiant technique par le repli', () => {
    expect(
      displayLabel('3f2504e0-4f89-11d3-9a0c-0305e82c3301', 'Ligne inconnue'),
    ).toBe('Ligne inconnue');
  });

  it('remplace une valeur vide ou absente par le repli', () => {
    expect(displayLabel('   ', 'Sans nom')).toBe('Sans nom');
    expect(displayLabel(undefined, 'Sans nom')).toBe('Sans nom');
    expect(displayLabel(null)).toBe('Non renseigné');
  });
});

describe('firstDisplayLabel', () => {
  it('retient le premier candidat lisible', () => {
    expect(
      firstDisplayLabel([
        null,
        '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
        'Budget marketing',
      ]),
    ).toBe('Budget marketing');
  });

  it('retombe sur le repli si aucun candidat lisible', () => {
    expect(firstDisplayLabel([null, '', '507f1f77bcf86cd799439011'], 'Inconnu')).toBe(
      'Inconnu',
    );
  });
});
