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
  id: string;
  category: AccessModelIssueCategory;
  resourceType?: SupportedDiagnosticResourceType;
  module: string;
  label: string;
  subtitle?: string;
  ownerOrgUnitSource?: OwnerOrgUnitSource;
  severity: AccessModelIssueSeverity;
  correctiveAction: AccessModelCorrectiveAction;
}

export interface AccessModelRolloutEntry {
  module: string;
  flagKey: string;
  enabled: boolean;
}

export interface AccessModelHealthResponse {
  generatedAt: string;
  rollout: AccessModelRolloutEntry[];
  kpis: {
    resourcesMissingOwner: { total: number; byModule: Record<string, number> };
    membersMissingHumanWithScopedPerms: { total: number };
    atypicalAclShares: { total: number };
    policyReviewHints: { total: number };
  };
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
