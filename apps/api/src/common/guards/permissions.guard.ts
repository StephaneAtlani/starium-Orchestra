import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EffectivePermissionsService } from '../services/effective-permissions.service';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Vérifie que l'utilisateur possède les permissions requises
 * via ses rôles métier dans le client actif.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const user = request.user;
    const activeClient = request.activeClient;

    if (!user?.userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    if (!activeClient?.id) {
      throw new ForbiddenException('Contexte client actif requis');
    }

    const anyRequired =
      this.reflector.get<string[]>(
        REQUIRE_ANY_PERMISSIONS_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string[]>(
        REQUIRE_ANY_PERMISSIONS_KEY,
        context.getClass(),
      );

    const permissionCodes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId: user.userId,
        clientId: activeClient.id,
        request,
      });

    if (anyRequired?.length) {
      const ok = anyRequired.some((code) => permissionCodes.has(code));
      if (!ok) {
        throw new ForbiddenException(
          'Permissions insuffisantes pour accéder à cette ressource',
        );
      }
      return true;
    }

    const required =
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getClass(),
      );

    if (!required || required.length === 0) {
      return true;
    }

    const missing = required.filter((code) => !permissionCodes.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(
        "Permissions insuffisantes pour accéder à cette ressource",
      );
    }

    return true;
  }
}
