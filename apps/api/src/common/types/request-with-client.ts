import { Request } from 'express';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import type {
  OrgScopeOrgUnitTree,
  OrgScopeUserContext,
} from '../organization/organization-scope.types';

export interface ActiveClientContext {
  id: string;
  role: ClientUserRole;
  status: ClientUserStatus;
  /**
   * Contexte client résolu pour un PLATFORM_ADMIN sans ClientUser (mutations ACL uniquement).
   * Ne doit pas être interprété comme un rôle métier CLIENT_ADMIN.
   */
  platformResolvedOnly?: boolean;
}

export interface RequestWithClient extends Request {
  activeClient?: ActiveClientContext;
  user?: { userId: string; platformRole?: string | null };
  /**
   * Cache request des permissions résolues (RFC-012).
   * Rempli par PermissionsGuard pour éviter plusieurs résolutions Prisma dans la même requête.
   */
  resolvedPermissionCodes?: Set<string>;
  /**
   * Cache request du contexte HUMAN de l'utilisateur pour la résolution scope (RFC-ACL-016).
   * Clé : `${userId}:${clientId}`. Rempli par `OrganizationScopeService.resolveOrgScope`.
   */
  resolvedOrgScopeContext?: Map<string, OrgScopeUserContext>;
  /**
   * Cache request de l'arbre `OrgUnit` actif par client (RFC-ACL-016).
   * Clé : `clientId`. Stocke uniquement la structure pour BFS, pas un verdict ni un set pré-calculé
   * de descendants : le BFS s'exécute à chaque appel à partir des `membershipOrgUnitIds` reçus.
   */
  resolvedOrgUnitTreeByClient?: Map<string, OrgScopeOrgUnitTree>;
}

