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
  entries: ResourceAclEntry[];
}

export interface ResourceAclEntryInput {
  subjectType: ResourceAclSubjectType;
  subjectId: string;
  permission: ResourceAclPermission;
}
