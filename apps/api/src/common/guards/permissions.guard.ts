import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientUserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Vérifie que l'utilisateur possède les permissions requises
 * via ses rôles métier dans le client actif.
 *
 * Court-circuite si le rôle client actif est CLIENT_ADMIN.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
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

    if (activeClient.role === ClientUserRole.CLIENT_ADMIN) {
      // L'admin client dispose de tous les droits fonctionnels.
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
      // Aucune permission spécifique requise.
      return true;
    }

    const prisma = this.prisma as any;

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: user.userId,
        role: { clientId: activeClient.id },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissionCodes = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        if (rp.permission?.code) {
          permissionCodes.add(rp.permission.code);
        }
      }
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

