import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientModuleStatus } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Vérifie que le module associé à la route est actif globalement
 * et activé (ENABLED) pour le client actif.
 *
 * Le code module est déduit du premier code de permission défini
 * via @RequirePermissions('<module>.<action>').
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

    const permissions =
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<string[]>(
        REQUIRE_PERMISSIONS_KEY,
        context.getClass(),
      );

    if (!permissions || permissions.length === 0) {
      // Pas de permissions explicites → pas de contrôle module.
      return true;
    }

    const first = permissions[0];
    const moduleCode = first.split('.')[0];

    if (!moduleCode) {
      return true;
    }

    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
      include: {
        clientModules: {
          where: {
            clientId: activeClient.id,
            status: ClientModuleStatus.ENABLED,
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

