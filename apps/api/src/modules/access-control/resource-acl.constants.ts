/** Whitelist stricte V1 — extension en RFC-ACL-006 avec branchement modules. */
export const RESOURCE_ACL_RESOURCE_TYPE_WHITELIST = [
  'PROJECT',
  'BUDGET',
  'RISK',
  'DOCUMENT',
  'GOVERNANCE_CYCLE',
  'STRATEGIC_OBJECTIVE',
] as const;

export type ResourceAclCanonicalResourceType =
  (typeof RESOURCE_ACL_RESOURCE_TYPE_WHITELIST)[number];

/** Prisma `@default(cuid())` — identifiant 25 caractères, préfixe `c`. */
export const RESOURCE_ACL_CUID_REGEX = /^c[a-z0-9]{24}$/;

export const RESOURCE_ACL_RESOURCE_ID_MAX_LENGTH = 32;

export const RESOURCE_ACL_RESOURCE_TYPE_MAX_LENGTH = 64;
