'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  addResourceAclEntry,
  removeResourceAclEntry,
} from '../api/resource-acl';
import type {
  ResourceAclEntry,
  ResourceAclEntryInput,
  ResourceAclResourceType,
} from '../api/resource-acl.types';
import { resourceAclKeys } from '../query-keys';

interface MutationArgs {
  resourceType: ResourceAclResourceType;
  resourceId: string;
}

/**
 * Mutation `add` (mutation one-shot via UI add-form).
 * Pas d'optimistic update : `onSuccess` invalide la query liste, le composant
 * orchestre les refetch quand il a besoin d'attendre la donnée serveur.
 */
export function useAddResourceAclEntry({ resourceType, resourceId }: MutationArgs) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation<ResourceAclEntry, Error, ResourceAclEntryInput>({
    mutationFn: (entry) =>
      addResourceAclEntry(authFetch, resourceType, resourceId, entry),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: resourceAclKeys.list(activeClientId, resourceType, resourceId),
      });
    },
  });
}

/**
 * Mutation `remove` unitaire.
 * ⚠ Pour le retour mode public (suppression en série), utiliser `runSequentialDelete`
 * qui attend explicitement `await refetch()` entre chaque DELETE — ne pas chaîner
 * cette mutation dans une boucle (invalidateQueries ne bloque pas l'itération).
 */
export function useRemoveResourceAclEntry({
  resourceType,
  resourceId,
}: MutationArgs) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';

  return useMutation<void, Error, string>({
    mutationFn: (entryId) =>
      removeResourceAclEntry(authFetch, resourceType, resourceId, entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: resourceAclKeys.list(activeClientId, resourceType, resourceId),
      });
    },
  });
}
