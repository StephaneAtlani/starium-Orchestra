import { describe, expect, it } from 'vitest';
import {
  COMPLIANCE_EVIDENCE_ASSESSMENT_OPTIONS,
  complianceEvidenceAssessmentLabel,
} from './compliance-evidence-assessment';

describe('compliance-evidence-assessment', () => {
  it('expose 4 libellés métier', () => {
    expect(COMPLIANCE_EVIDENCE_ASSESSMENT_OPTIONS).toHaveLength(4);
    expect(complianceEvidenceAssessmentLabel('RELEVANT')).toBe('Pertinente');
    expect(complianceEvidenceAssessmentLabel('INSUFFICIENT')).toBe(
      'Insuffisante',
    );
    expect(complianceEvidenceAssessmentLabel(undefined)).toBe('À examiner');
  });
});
