import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { satisfiesAnyPermission, satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import {
  ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES,
} from '../../modules/access-decision/access-intent.registry';
import { FeatureFlagsService } from '../../modules/feature-flags/feature-flags.service';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import {
  REQUIRE_ACCESS_INTENT_KEY,
  type RequireAccessIntentMetadata,
} from '../decorators/require-access-intent.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EffectivePermissionsService } from '../services/effective-permissions.service';
import { RequestWithClient } from '../types/request-with-client';
import {
  buildV2EnabledByModuleMap,
  resolveAccessIntentAllowed,
  resolveHandlerKeyFromContext,
  resolveLegacyPermissionAllowed,
} from './access-intent-permission.resolver';

/**
 * Vérifie que l'utilisateur possède les permissions requises
 * via ses rôles métier dans le client actif.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly featureFlags: FeatureFlagsService,
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

    const handlerKey = resolveHandlerKeyFromContext(
      context.getClass().name,
      context.getHandler().name,
    );

    const permissionCodes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId: user.userId,
        clientId: activeClient.id,
        request,
      });

    const v2EnabledByModule = await buildV2EnabledByModuleMap(
      activeClient.id,
      ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES,
      (clientId, flagKey) =>
        this.featureFlags.isEnabled(
          clientId,
          flagKey as Parameters<FeatureFlagsService['isEnabled']>[1],
          request,
        ),
    );

    const resolverInput = {
      permissionCodes,
      handlerKey,
      v2EnabledByModule,
    };

    const accessIntent =
      this.reflector.get<RequireAccessIntentMetadata>(
        REQUIRE_ACCESS_INTENT_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<RequireAccessIntentMetadata>(
        REQUIRE_ACCESS_INTENT_KEY,
        context.getClass(),
      );

    if (accessIntent) {
      const key = resolveHandlerKeyFromContext(
        context.getClass().name,
        context.getHandler().name,
        accessIntent.handlerKey,
      );
      const ok = resolveAccessIntentAllowed(
        accessIntent.module,
        accessIntent.intent,
        permissionCodes,
        { ...resolverInput, handlerKey: key },
      );
      if (!ok) {
        throw new ForbiddenException(
          'Permissions insuffisantes pour accéder à cette ressource',
        );
      }
      return true;
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

    if (anyRequired?.length) {
      const ok = anyRequired.some(
        (code) =>
          satisfiesPermission(permissionCodes, code) ||
          resolveLegacyPermissionAllowed(permissionCodes, code, resolverInput),
      );
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

    const missing = required.filter(
      (code) =>
        !satisfiesPermission(permissionCodes, code) &&
        !resolveLegacyPermissionAllowed(permissionCodes, code, resolverInput),
    );
    if (missing.length > 0) {
      throw new ForbiddenException(
        'Permissions insuffisantes pour accéder à cette ressource',
      );
    }

    return true;
  }
}
