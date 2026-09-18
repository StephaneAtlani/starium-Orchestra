import { describe, expect, it } from 'vitest';
import {
  complianceEvidenceKindLabel,
  formatComplianceEvidenceMeta,
} from '../lib/compliance-evidence-display';

describe('compliance-evidence-display', () => {
  it('libellés kind métier', () => {
    expect(complianceEvidenceKindLabel('URL')).toBe('Lien externe');
    expect(complianceEvidenceKindLabel('OBSERVATION')).toBe('Note / constat');
    expect(complianceEvidenceKindLabel('FILE')).toBe('Fichier');
    expect(complianceEvidenceKindLabel(undefined)).toBe('Preuve');
  });

  it('compose méta type · date · version', () => {
    const meta = formatComplianceEvidenceMeta({
      kind: 'URL',
      collectedAt: '2026-03-15T12:00:00.000Z',
      version: 2,
    });
    expect(meta).toContain('Lien externe');
    expect(meta).toContain('v2');
    expect(meta).toMatch(/15/);
  });
});
