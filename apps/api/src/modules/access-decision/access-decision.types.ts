import type { ResourceAccessPolicyMode } from '@prisma/client';
import type { OrgScopeVerdict } from '../../common/organization/organization-scope.types';
import type { ResourceAclCanonicalResourceType } from '../access-control/resource-acl.constants';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';

/** RFC-ACL-018 (V1 read/list) ; RFC-ACL-020 ajoute write/admin. */
export type AccessIntent = 'read' | 'list' | 'write' | 'admin';

export type AccessDecisionRbacDetail = {
  allowed: boolean;
  matchedPermission?: string;
  requiredCandidates: string[];
};

export type AccessDecisionOrgDetail = {
  required: boolean;
  verdict?: OrgScopeVerdict;
};

export type AccessDecisionAclDetail = {
  allowed: boolean;
  reasonCode: string;
  mode: ResourceAccessPolicyMode;
  effectiveAccessMode: string;
  aclRank?: number;
};

/** Verdict stable pour RFC-019 — codes RFC-018 dans `reasonCodes`. */
export type AccessDecisionResult = {
  allowed: boolean;
  reasonCodes: string[];
  resourceType: SupportedDiagnosticResourceType;
  resourceId?: string;
  intent: AccessIntent;
  rbac: AccessDecisionRbacDetail;
  orgScope?: AccessDecisionOrgDetail;
  acl?: AccessDecisionAclDetail;
  floorAllowed: boolean;
};

export type AccessResourceScopeRow = {
  ownerOrgUnitId: string | null;
  /** Provenance de l'ownership (utile pour les diagnostics RFC-019). */
  ownerOrgUnitSource?: 'self' | 'parent';
  /** Type ACL réellement appliqué (peut différer du resourceType métier — ex. BUDGET_LINE → BUDGET). */
  aclResourceType: ResourceAclCanonicalResourceType;
  /** Id ACL réellement appliqué (peut différer du resourceId métier — ex. BUDGET_LINE → budgetId parent). */
  aclResourceId: string;
  ownHints?: { subjectResourceId?: string | null };
};
