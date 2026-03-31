import { describe, expect, it } from 'vitest';
import { validateMappingForPreview } from './budget-import-mapping-validation';
import type { MappingConfig } from '../types/budget-imports.types';

const baseMapping = (): MappingConfig => ({
  fields: {
    amount: 'M',
    currency: 'D',
  },
});

describe('validateMappingForPreview — enveloppes', () => {
  it('from_file_columns : accepte colonne enveloppe sans défaut', () => {
    const r = validateMappingForPreview(
      {
        ...baseMapping(),
        fields: { ...baseMapping().fields, envelopeCode: 'E' },
      },
      { defaultCurrency: 'EUR' },
      'EUR',
      'from_file_columns',
    );
    expect(r).toEqual({ ok: true });
  });

  it('single_envelope : exige defaultEnvelopeId', () => {
    const r = validateMappingForPreview(baseMapping(), { defaultCurrency: 'EUR' }, 'EUR', 'single_envelope');
    expect(r.ok).toBe(false);
  });

  it('single_envelope : refuse si colonnes enveloppe encore mappées', () => {
    const r = validateMappingForPreview(
      {
        ...baseMapping(),
        fields: { ...baseMapping().fields, envelopeCode: 'X' },
      },
      { defaultCurrency: 'EUR', defaultEnvelopeId: 'env-1' },
      'EUR',
      'single_envelope',
    );
    expect(r.ok).toBe(false);
  });
});
