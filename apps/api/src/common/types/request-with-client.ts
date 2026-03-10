import { Request } from 'express';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';

export interface ActiveClientContext {
  id: string;
  role: ClientUserRole;
  status: ClientUserStatus;
}

export interface RequestWithClient extends Request {
  activeClient?: ActiveClientContext;
  user?: { userId: string };
  /**
   * Cache request des permissions résolues (RFC-012).
   * Rempli par PermissionsGuard pour éviter plusieurs résolutions Prisma dans la même requête.
   */
  resolvedPermissionCodes?: Set<string>;
}

