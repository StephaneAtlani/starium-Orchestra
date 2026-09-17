import {
  fingerprintImportRows,
  mapImportStatus,
  parseEvaluationsCsv,
} from './campaign-evaluations-import';
import { ComplianceAssessmentStatus } from '@prisma/client';

describe('campaign-evaluations-import', () => {
  it('parse un CSV FR avec alias de statut', () => {
    const csv = [
      'code;status;comment;lastAssessmentDate;evidenceNote',
      'A.1;PARTIEL;En cours;2026-09-01;',
      'A.2;CONFORME;OK;2026-09-02;Vu sur site',
    ].join('\n');
    const { rows, delimiter } = parseEvaluationsCsv(csv);
    expect(delimiter).toBe(';');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe(
      ComplianceAssessmentStatus.PARTIALLY_COMPLIANT,
    );
    expect(rows[0]?.error).toBeNull();
    expect(rows[1]?.status).toBe(ComplianceAssessmentStatus.COMPLIANT);
    expect(rows[1]?.evidenceNote).toBe('Vu sur site');
  });

  it('signale commentaire manquant', () => {
    const csv = 'code;status;comment\nA.1;NA;\n';
    const { rows } = parseEvaluationsCsv(csv);
    expect(rows[0]?.error).toMatch(/Commentaire/);
  });

  it('mappe les alias', () => {
    expect(mapImportStatus('écart')).toBe(
      ComplianceAssessmentStatus.NON_COMPLIANT,
    );
    expect(mapImportStatus('n/a')).toBe(
      ComplianceAssessmentStatus.NOT_APPLICABLE,
    );
  });

  it('empreinte stable', () => {
    const a = fingerprintImportRows([
      {
        code: 'A.1',
        status: 'COMPLIANT',
        comment: 'x',
        lastAssessmentDate: null,
        evidenceNote: null,
      },
    ]);
    const b = fingerprintImportRows([
      {
        code: 'A.1',
        status: 'COMPLIANT',
        comment: 'x',
        lastAssessmentDate: null,
        evidenceNote: null,
      },
    ]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
