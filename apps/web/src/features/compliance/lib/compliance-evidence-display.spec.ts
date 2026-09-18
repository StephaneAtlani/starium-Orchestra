import { describe, expect, it } from 'vitest';
import {
  complianceEvidenceKindLabel,
  formatComplianceEvidenceMeta,
} from '../lib/compliance-evidence-display';

describe('compliance-evidence-display', () => {
  it('libellés kind métier', () => {
    expect(complianceEvidenceKindLabel('URL')).toBe('Lien externe');
    expect(complianceEvidenceKindLabel('OBSERVATION')).toBe('Note / constat');
    expect(complianceEvidenceKindLabel('REFERENCE')).toBe('Référence interne');
    expect(complianceEvidenceKindLabel('FILE')).toBe('Fichier');
    expect(complianceEvidenceKindLabel(undefined)).toBe('Preuve');
  });

  it('compose méta type · date · auteur · version', () => {
    const meta = formatComplianceEvidenceMeta({
      kind: 'REFERENCE',
      collectedAt: '2026-03-15T12:00:00.000Z',
      createdByLabel: 'Ada Lovelace',
      version: 2,
    });
    expect(meta).toContain('Référence interne');
    expect(meta).toContain('Ada Lovelace');
    expect(meta).toContain('v2');
    expect(meta).toMatch(/15/);
  });
});
