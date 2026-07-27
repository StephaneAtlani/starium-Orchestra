import { describe, expect, it } from 'vitest';
import {
  isBlankSupplierRating,
  parseSupplierRating,
  supplierRatingPayloadValue,
} from './supplier-rating';

describe('parseSupplierRating', () => {
  it('accepte les entiers et décimales dans la plage 1–5', () => {
    expect(parseSupplierRating('1')).toBe(1);
    expect(parseSupplierRating('5')).toBe(5);
    expect(parseSupplierRating('4.2')).toBe(4.2);
  });

  it('accepte la virgule décimale française', () => {
    expect(parseSupplierRating('4,6')).toBe(4.6);
    expect(parseSupplierRating(' 3,0 ')).toBe(3);
  });

  it('refuse les valeurs hors plage', () => {
    expect(parseSupplierRating('0')).toBeNull();
    expect(parseSupplierRating('0,9')).toBeNull();
    expect(parseSupplierRating('6')).toBeNull();
  });

  it('refuse plus d’un chiffre après la virgule', () => {
    expect(parseSupplierRating('4,25')).toBeNull();
  });

  it('refuse les saisies non numériques', () => {
    expect(parseSupplierRating('abc')).toBeNull();
    expect(parseSupplierRating('4/5')).toBeNull();
    expect(parseSupplierRating('-3')).toBeNull();
  });

  it('renvoie null sur une saisie vide', () => {
    expect(parseSupplierRating('')).toBeNull();
    expect(parseSupplierRating('   ')).toBeNull();
  });
});

describe('isBlankSupplierRating', () => {
  it('distingue le vide de la valeur invalide', () => {
    expect(isBlankSupplierRating('')).toBe(true);
    expect(isBlankSupplierRating('  ')).toBe(true);
    expect(isBlankSupplierRating('abc')).toBe(false);
  });
});

describe('supplierRatingPayloadValue', () => {
  it('envoie null pour effacer la note', () => {
    expect(supplierRatingPayloadValue('')).toBeNull();
  });

  it('envoie le nombre pour une saisie valide', () => {
    expect(supplierRatingPayloadValue('4,2')).toBe(4.2);
  });

  it('renvoie undefined pour une saisie invalide', () => {
    expect(supplierRatingPayloadValue('12')).toBeUndefined();
  });
});
