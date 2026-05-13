import type { ResourceAccessPolicyMode } from '@prisma/client';
import type { OrgScopeVerdict } from '../../common/organization/organization-scope.types';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';

/** RFC-ACL-018 V1 : lecture (+ liste) ; write/admin typés sans matrice produit. */
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
  ownHints?: { subjectResourceId?: string | null };
};
