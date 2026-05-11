'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listResourceAcl } from '../api/resource-acl';
import type { ResourceAclResourceType } from '../api/resource-acl.types';
import { resourceAclKeys } from '../query-keys';

interface UseResourceAclArgs {
  resourceType: ResourceAclResourceType;
  resourceId: string;
  /** Désactivable depuis le composant pour éviter tout fetch quand non-CLIENT_ADMIN. */
  enabled?: boolean;
}

export function useResourceAcl({
  resourceType,
  resourceId,
  enabled = true,
}: UseResourceAclArgs) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: resourceAclKeys.list(activeClientId, resourceType, resourceId),
    queryFn: () => listResourceAcl(authFetch, resourceType, resourceId),
    enabled: enabled && !!activeClientId && !!resourceType && !!resourceId,
    staleTime: 30_000,
  });
}
