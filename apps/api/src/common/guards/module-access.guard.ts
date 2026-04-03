import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Vérifie que le module associé à la route est actif globalement
 * et activé (ENABLED) pour le client actif.
 *
 * Le code module est déduit des permissions :
 * @RequirePermissions('module.action') ou, à défaut,
 * @RequireAnyPermissions('module.a', 'module.b') (un seul module par route).
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const activeClient = request.activeClient;

    if (!activeClient?.id) {
      throw new ForbiddenException('Contexte client actif requis');
    }

    const requiredPerms =
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getClass(),
      );

    const anyPerms =
      this.reflector.get<string[]>(
        REQUIRE_ANY_PERMISSIONS_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string[]>(
        REQUIRE_ANY_PERMISSIONS_KEY,
        context.getClass(),
      );

    const permissions =
      requiredPerms?.length ? requiredPerms : anyPerms;

    if (!permissions || permissions.length === 0) {
      // Pas de permissions explicites → pas de contrôle module.
      return true;
    }

    const moduleCodes = new Set(
      permissions
        .map((p) => p.split('.')[0])
        .filter((code): code is string => typeof code === 'string' && code.length > 0),
    );
    if (moduleCodes.size > 1) {
      throw new ForbiddenException(
        'Permissions invalides: une route ne doit référencer qu’un seul module',
      );
    }

    const first = permissions[0];
    const moduleCode = first.split('.')[0];

    if (!moduleCode) {
      return true;
    }

    const prisma = this.prisma as any;

    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
      include: {
        clientModules: {
          where: {
            clientId: activeClient.id,
            status: 'ENABLED',
          },
          select: { id: true },
        },
      },
    });

    if (!module || !module.isActive) {
      throw new ForbiddenException('Module inactif ou inexistant');
    }

    if (module.clientModules.length === 0) {
      throw new ForbiddenException(
        'Module désactivé pour le client actif',
      );
    }

    return true;
  }
}

