import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ClientUserRole } from '@prisma/client';
import { ModuleAccessGuard } from './module-access.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Accès aux routes de configuration Microsoft 365 :
 * - **CLIENT_ADMIN** du client actif (paramétrage depuis l’administration client) ;
 * - sinon même chaîne que le module Projets : `ModuleAccessGuard` + `PermissionsGuard`
 *   (ex. `projects.update` si décoré ainsi).
 *
 * Les métadonnées `@RequirePermissions` restent nécessaires pour la branche non admin.
 */
@Injectable()
export class MicrosoftIntegrationAccessGuard implements CanActivate {
  constructor(
    private readonly moduleAccessGuard: ModuleAccessGuard,
    private readonly permissionsGuard: PermissionsGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithClient>();
    if (request.activeClient?.role === ClientUserRole.CLIENT_ADMIN) {
      return true;
    }
    const moduleOk = await this.moduleAccessGuard.canActivate(context);
    if (!moduleOk) {
      return false;
    }
    return this.permissionsGuard.canActivate(context);
  }
}
