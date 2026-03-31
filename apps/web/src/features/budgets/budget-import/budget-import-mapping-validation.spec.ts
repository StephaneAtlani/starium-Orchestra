import { describe, expect, it } from 'vitest';
import { validateMappingForPreview } from './budget-import-mapping-validation';
import type { MappingConfig } from '../types/budget-imports.types';

const defaultCtx = {
  sourceType: 'CSV' as const,
  ordersSectionEnabled: false,
  invoicesSectionEnabled: false,
};

const baseMapping = (): MappingConfig => ({
  fields: {
    amount: 'M',
    currency: 'D',
    name: 'Lib',
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
      defaultCtx,
    );
    expect(r).toEqual({ ok: true });
  });

  it('single_envelope : exige defaultEnvelopeId', () => {
    const r = validateMappingForPreview(
      baseMapping(),
      { defaultCurrency: 'EUR' },
      'EUR',
      'single_envelope',
      defaultCtx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.block).toBe('envelope');
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
      defaultCtx,
    );
    expect(r.ok).toBe(false);
  });
});

describe('validateMappingForPreview — identité ligne', () => {
  it('refuse sans name ni label', () => {
    const m: MappingConfig = {
      fields: { amount: 'A', currency: 'C' },
    };
    const r = validateMappingForPreview(m, { defaultCurrency: 'EUR' }, 'EUR', 'from_file_columns', defaultCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.block).toBe('budget_line');
  });
});

describe('validateMappingForPreview — XLSX', () => {
  it('exige une feuille si XLSX', () => {
    const r = validateMappingForPreview(
      baseMapping(),
      { defaultCurrency: 'EUR' },
      'EUR',
      'from_file_columns',
      {
        sourceType: 'XLSX',
        activeSheetName: '',
        ordersSectionEnabled: false,
        invoicesSectionEnabled: false,
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.block).toBe('file_sheet');
  });
});
