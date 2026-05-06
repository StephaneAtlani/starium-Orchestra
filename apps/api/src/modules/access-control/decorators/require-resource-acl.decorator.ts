import { SetMetadata } from '@nestjs/common';

export const RESOURCE_ACL_METADATA_KEY = 'resourceAclRequirement';

export type ResourceAclRequirement = {
  operation: 'read' | 'write' | 'admin';
  /** Nom du paramètre Express contenant le code `resourceType` (whitelist V1). Défaut : `resourceType`. */
  resourceTypeParam?: string;
  /** Nom du paramètre Express contenant le `resourceId` (CUID). Défaut : `resourceId`. */
  resourceIdParam?: string;
};

export const RequireResourceAcl = (requirement: ResourceAclRequirement) =>
  SetMetadata(RESOURCE_ACL_METADATA_KEY, requirement);
