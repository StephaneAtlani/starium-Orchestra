import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientModuleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleVisibilityService } from '../../modules/module-visibility/module-visibility.service';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EffectivePermissionsService } from '../services/effective-permissions.service';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Vérifie pour chaque permission décorée :
 * - module actif globalement et activé (ENABLED) pour le client actif ;
 * - module visible pour l’utilisateur (RFC-ACL-004) ;
 * - RBAC : aligné sur PermissionsGuard (RequirePermissions = tout requis,
 *   RequireAnyPermissions = au moins une alternative détenue ET valide sur le même triplet).
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly moduleVisibility: ModuleVisibilityService,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const activeClient = request.activeClient;

    if (!activeClient?.id) {
      throw new ForbiddenException('Contexte client actif requis');
    }

    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
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

    const requiredPerms =
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getClass(),
      );

    if (anyRequired?.length) {
      return this.handleAnyPermissions(
        userId,
        activeClient.id,
        request,
        anyRequired,
      );
    }

    if (!requiredPerms?.length) {
      return true;
    }

    return this.handleAllPermissions(
      userId,
      activeClient.id,
      request,
      requiredPerms,
    );
  }

  private async handleAllPermissions(
    userId: string,
    clientId: string,
    request: RequestWithClient,
    requiredPerms: string[],
  ): Promise<boolean> {
    const permissionCodes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId,
        clientId,
        request,
      });

    for (const code of requiredPerms) {
      if (!permissionCodes.has(code)) {
        throw new ForbiddenException(
          'Permissions insuffisantes pour accéder à cette ressource',
        );
      }
    }

    const moduleCodes = [
      ...new Set(
        requiredPerms
          .map((p) => p.split('.')[0])
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      ),
    ];

    const visMap = await this.moduleVisibility.getVisibilityMap(
      userId,
      clientId,
      moduleCodes,
    );
    await this.assertModulesEnabledForClient(clientId, moduleCodes, visMap);
    return true;
  }

  private async handleAnyPermissions(
    userId: string,
    clientId: string,
    request: RequestWithClient,
    anyRequired: string[],
  ): Promise<boolean> {
    const permissionCodes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId,
        clientId,
        request,
      });

    const candidates = anyRequired.filter((code) => permissionCodes.has(code));
    if (candidates.length === 0) {
      throw new ForbiddenException(
        'Permissions insuffisantes pour accéder à cette ressource',
      );
    }

    const moduleCodes = [
      ...new Set(
        candidates
          .map((p) => p.split('.')[0])
          .filter((c): c is string => typeof c === 'string' && c.length > 0),
      ),
    ];

    const visMap = await this.moduleVisibility.getVisibilityMap(
      userId,
      clientId,
      moduleCodes,
    );

    const modules = await this.prisma.module.findMany({
      where: { code: { in: moduleCodes } },
      include: {
        clientModules: {
          where: {
            clientId,
            status: ClientModuleStatus.ENABLED,
          },
          select: { id: true },
        },
      },
    });
    const byCode = new Map(modules.map((m) => [m.code, m]));

    for (const perm of candidates) {
      const moduleCode = perm.split('.')[0];
      if (!moduleCode) continue;
      const m = byCode.get(moduleCode);
      if (!m?.isActive || m.clientModules.length === 0) {
        continue;
      }
      if (visMap.get(moduleCode) !== false) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Permissions insuffisantes pour accéder à cette ressource',
    );
  }

  private async assertModulesEnabledForClient(
    clientId: string,
    moduleCodes: string[],
    visMap: Map<string, boolean>,
  ): Promise<void> {
    const modules = await this.prisma.module.findMany({
      where: { code: { in: moduleCodes } },
      include: {
        clientModules: {
          where: {
            clientId,
            status: ClientModuleStatus.ENABLED,
          },
          select: { id: true },
        },
      },
    });
    const byCode = new Map(modules.map((m) => [m.code, m]));

    for (const code of moduleCodes) {
      const m = byCode.get(code);
      if (!m || !m.isActive || m.clientModules.length === 0) {
        throw new ForbiddenException('Module inactif ou inexistant');
      }
      if (visMap.get(code) === false) {
        throw new ForbiddenException('Module non visible pour votre profil');
      }
    }
  }
}
