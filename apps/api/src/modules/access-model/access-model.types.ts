import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';

export type AccessModelIssueCategory =
  | 'missing_owner'
  | 'missing_human'
  | 'atypical_acl'
  | 'policy_review';

export type AccessModelIssueSeverity = 'warning' | 'info';

export type OwnerOrgUnitSource = 'self' | 'parent';

export interface AccessModelCorrectiveAction {
  kind: 'link';
  href: string;
  label: string;
}

export interface AccessModelIssueItem {
  /** Clé stable UI (peut être composite pour atypical_acl / policy_review). */
  id: string;
  /** Identifiant métier exportable (PK ressource ou userId membre). */
  resourceId: string;
  category: AccessModelIssueCategory;
  resourceType?: SupportedDiagnosticResourceType;
  module: string;
  label: string;
  subtitle?: string;
  ownerOrgUnitSource?: OwnerOrgUnitSource;
  severity: AccessModelIssueSeverity;
  correctiveAction: AccessModelCorrectiveAction;
}

export type AccessModelChecklistStepId =
  | 'org_tree'
  | 'backfill_owner'
  | 'backfill_human'
  | 'flag_module'
  | 'smoke';

export type AccessModelChecklistStatus = 'ok' | 'warning' | 'pending';

export interface AccessModelChecklistStep {
  id: AccessModelChecklistStepId;
  label: string;
  status: AccessModelChecklistStatus;
  detail?: string;
  href?: string;
}

export interface AccessModelRolloutEntry {
  module: string;
  flagKey: string;
  enabled: boolean;
}

export interface AccessModelHealthResponse {
  generatedAt: string;
  rollout: AccessModelRolloutEntry[];
  /** Checklist rollout informative — calculée, non persistée (RFC-ACL-026). */
  checklist: AccessModelChecklistStep[];
  kpis: {
    resourcesMissingOwner: { total: number; byModule: Record<string, number> };
    membersMissingHumanWithScopedPerms: { total: number };
    atypicalAclShares: { total: number };
    policyReviewHints: { total: number };
  };
}

export interface AccessModelIssuesExportQuery {
  category: AccessModelIssueCategory;
  module?: string;
  search?: string;
  delimiter?: ',' | ';';
  format?: 'csv';
}

export interface AccessModelExportCsvResult {
  buffer: Buffer;
  filename: string;
  rowCount: number;
}

export interface AccessModelIssuesResponse {
  items: AccessModelIssueItem[];
  page: number;
  limit: number;
  total: number;
  truncated: boolean;
}

export interface AccessModelIssuesQuery {
  category: AccessModelIssueCategory;
  page?: number;
  limit?: number;
  module?: string;
  search?: string;
}
