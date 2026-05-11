/**
 * Query keys tenant-aware pour les ACL ressource (RFC-ACL-005 / RFC-ACL-013).
 * `activeClientId` doit être passé **explicitement** par tout consommateur — pas de
 * préfixe global implicite. Au switch de client actif, la clé change → React Query
 * crée une nouvelle entrée de cache, l'ancienne devient orpheline.
 */

import type { ResourceAclResourceType } from './api/resource-acl.types';

export const resourceAclKeys = {
  all: (activeClientId: string) =>
    ['resource-acl', activeClientId] as const,
  list: (
    activeClientId: string,
    resourceType: ResourceAclResourceType,
    resourceId: string,
  ) =>
    ['resource-acl', activeClientId, resourceType, resourceId] as const,
};
