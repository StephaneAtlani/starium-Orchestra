export const COMPLIANCE_AUDIT_ACTION = {
  FRAMEWORK_CREATED: 'compliance.framework.created',
  FRAMEWORK_UPDATED: 'compliance.framework.updated',
  REQUIREMENT_CREATED: 'compliance.requirement.created',
  STATUS_UPDATED: 'compliance.status.updated',
  EVIDENCE_CREATED: 'compliance.evidence.created',
} as const;

export const COMPLIANCE_AUDIT_RESOURCE_TYPE = {
  COMPLIANCE_FRAMEWORK: 'compliance_framework',
  COMPLIANCE_REQUIREMENT: 'compliance_requirement',
  COMPLIANCE_STATUS: 'compliance_status',
  COMPLIANCE_EVIDENCE: 'compliance_evidence',
} as const;
