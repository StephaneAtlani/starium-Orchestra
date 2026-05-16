'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  evaluateAccessIntentForUi,
  satisfiesPermission,
  type AccessIntentKindUi,
} from '@starium-orchestra/rbac-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getMyPermissions } from '@/services/me';

/** Clé partagée pour invalider le cache après changement de rôles (ex. client RBAC). */
export const PERMISSIONS_QUERY_KEY = ['me', 'permissions'] as const;

export type HasIntentOptions = {
  /**
   * Route / écran migré RFC-ACL-024 (service AccessDecision).
   * Sans `true`, l’UI reste conservative sur les codes scoped.
   */
  serviceEnforced?: boolean;
};

/**
 * Hook générique : charge les codes de permission de l'utilisateur pour le client actif
 * et expose has(code) / hasIntent(module, intent) pour afficher/masquer des actions.
 */
export function usePermissions() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data, isLoading, isSuccess, isError } = useQuery({
    queryKey: [...PERMISSIONS_QUERY_KEY, clientId],
    queryFn: () => getMyPermissions(authFetch),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const permissionCodes = useMemo(
    () => data?.permissionCodes ?? [],
    [data?.permissionCodes],
  );
  const uiPermissionHints = useMemo(
    () => data?.uiPermissionHints ?? [],
    [data?.uiPermissionHints],
  );
  const accessDecisionV2 = useMemo(
    () => data?.accessDecisionV2 ?? {},
    [data?.accessDecisionV2],
  );
  const permissionSet = useMemo(() => new Set(permissionCodes), [permissionCodes]);

  const has = useCallback(
    (code: string): boolean => satisfiesPermission(permissionSet, code),
    [permissionSet],
  );

  const hasIntent = useCallback(
    (module: string, intent: AccessIntentKindUi, options?: HasIntentOptions): boolean => {
      const v2Enabled = accessDecisionV2[module] === true;
      const result = evaluateAccessIntentForUi(module, intent, permissionSet, {
        v2Enabled,
        serviceEnforced: options?.serviceEnforced === true,
      });
      return result.allowed;
    },
    [permissionSet, accessDecisionV2],
  );

  const treatAllModulesVisible = data?.visibleModuleCodes === undefined;
  const visibleModuleCodes = useMemo(
    () => data?.visibleModuleCodes ?? [],
    [data?.visibleModuleCodes],
  );
  const visibleModulesSet = useMemo(
    () => new Set(visibleModuleCodes),
    [visibleModuleCodes],
  );

  const isModuleVisible = (moduleCode: string): boolean =>
    treatAllModulesVisible || visibleModulesSet.has(moduleCode);

  const roles = useMemo(() => data?.roles ?? [], [data?.roles]);

  return {
    permissionCodes,
    uiPermissionHints,
    accessDecisionV2,
    visibleModuleCodes,
    roles,
    has,
    hasIntent,
    isModuleVisible,
    isLoading,
    /** True only after a successful GET /me/permissions for le client actif (requis pour la nav filtrée). */
    isSuccess,
    isError,
  };
}
