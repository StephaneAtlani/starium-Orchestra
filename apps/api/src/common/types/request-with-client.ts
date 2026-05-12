import { Request } from 'express';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';

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
}

