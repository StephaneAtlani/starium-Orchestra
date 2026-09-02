import { describe, expect, it } from 'vitest';
import type { PreviewRowResult } from '../types/budget-imports.types';
import {
  countMissingEnvelopeWithoutCode,
  countNoMatchUpdateOnly,
  envelopeCodeFromPreviewRow,
  extractMissingEnvelopeGaps,
} from './budget-import-preview-envelope-gaps';

function row(partial: Partial<PreviewRowResult>): PreviewRowResult {
  return {
    rowIndex: 1,
    status: 'ERROR',
    reason: 'MISSING_ENVELOPE',
    data: {},
    ...partial,
  };
}

describe('envelopeCodeFromPreviewRow', () => {
  it('lit envelopeCode puis envelope', () => {
    expect(envelopeCodeFromPreviewRow(row({ data: { envelopeCode: ' RUN-01 ' } }))).toBe('RUN-01');
    expect(envelopeCodeFromPreviewRow(row({ data: { envelope: 'INFRA' } }))).toBe('INFRA');
    expect(envelopeCodeFromPreviewRow(row({ data: {} }))).toBeNull();
  });
});

describe('extractMissingEnvelopeGaps', () => {
  it('agrège par code et suggère un nom', () => {
    const gaps = extractMissingEnvelopeGaps([
      row({ rowIndex: 2, data: { envelopeCode: 'run-01', name: 'Licences' } }),
      row({ rowIndex: 3, data: { envelope: 'RUN-01' } }),
      row({ rowIndex: 4, data: { envelopeCode: 'PROJ-A' } }),
      row({ rowIndex: 5, reason: 'NO_MATCH_UPDATE_ONLY', status: 'ERROR' }),
    ]);
    expect(gaps).toEqual([
      { code: 'PROJ-A', rowCount: 1, suggestedName: 'Enveloppe PROJ-A' },
      { code: 'RUN-01', rowCount: 2, suggestedName: 'Licences' },
    ]);
  });
});

describe('countMissingEnvelopeWithoutCode', () => {
  it('compte les MISSING_ENVELOPE sans code fichier', () => {
    expect(
      countMissingEnvelopeWithoutCode([
        row({ data: {} }),
        row({ data: { envelopeCode: 'X' } }),
        row({ reason: 'INVALID_AMOUNT' }),
      ]),
    ).toBe(1);
  });
});

describe('countNoMatchUpdateOnly', () => {
  it('compte les NO_MATCH_UPDATE_ONLY', () => {
    expect(
      countNoMatchUpdateOnly([
        row({ reason: 'NO_MATCH_UPDATE_ONLY' }),
        row({ reason: 'NO_MATCH_UPDATE_ONLY' }),
        row({ reason: 'MISSING_ENVELOPE' }),
      ]),
    ).toBe(2);
  });
});
