import type { ComplianceEvidenceAssessmentApi } from '../api/compliance.api';

export const COMPLIANCE_EVIDENCE_ASSESSMENT_OPTIONS: Array<{
  value: ComplianceEvidenceAssessmentApi;
  label: string;
}> = [
  { value: 'TO_REVIEW', label: 'À examiner' },
  { value: 'RELEVANT', label: 'Pertinente' },
  { value: 'PARTIAL', label: 'Partielle' },
  { value: 'INSUFFICIENT', label: 'Insuffisante' },
];

export function complianceEvidenceAssessmentLabel(
  value: string | null | undefined,
): string {
  const hit = COMPLIANCE_EVIDENCE_ASSESSMENT_OPTIONS.find(
    (o) => o.value === value,
  );
  return hit?.label ?? 'À examiner';
}
