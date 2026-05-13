/**
 * Types miroir backend RFC-ACL-005.
 * Whitelist V1 UI : `PROJECT`, `BUDGET`, `CONTRACT`, `SUPPLIER`, `STRATEGIC_OBJECTIVE`.
 * `RISK`, `DOCUMENT`, `GOVERNANCE_CYCLE` whitelistés backend mais hors scope V1 UI.
 */

export type ResourceAclSubjectType = 'USER' | 'GROUP';

export type ResourceAclPermission = 'READ' | 'WRITE' | 'ADMIN';

export type ResourceAclResourceType =
  | 'PROJECT'
  | 'BUDGET'
  | 'CONTRACT'
  | 'SUPPLIER'
  | 'STRATEGIC_OBJECTIVE';

/** RFC-ACL-017 — aligné Prisma / API. */
export type ResourceAccessPolicyMode = 'DEFAULT' | 'RESTRICTIVE' | 'SHARING';

/** RFC-ACL-017 — dérivé serveur pour l’UI. */
export type EffectiveResourceAccessMode =
  | 'PUBLIC_DEFAULT'
  | 'ACL_RESTRICTED'
  | 'RESTRICTIVE_EMPTY_DENY'
  | 'SHARING_FLOOR_ALLOW'
  | 'SHARING_FLOOR_DENY'
  | 'SHARING_ACL_PLUS_FLOOR';

export interface ResourceAclEntry {
  id: string;
  subjectType: ResourceAclSubjectType;
  subjectId: string;
  permission: ResourceAclPermission;
  /** Libellé métier prêt à afficher (jamais l'UUID). */
  subjectLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAclListResponse {
  restricted: boolean;
  accessPolicy: ResourceAccessPolicyMode;
  effectiveAccessMode: EffectiveResourceAccessMode;
  entries: ResourceAclEntry[];
}

export interface ResourceAclEntryInput {
  subjectType: ResourceAclSubjectType;
  subjectId: string;
  permission: ResourceAclPermission;
}
