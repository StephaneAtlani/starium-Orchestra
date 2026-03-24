import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Vérifie que l'utilisateur possède les permissions requises
 * via ses rôles métier dans le client actif.
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

    // Cohérence avec ModuleAccessGuard : une route protégée doit référencer un seul module.
    const requiredModuleCodes = new Set(
      required
        .map((p) => p.split('.')[0])
        .filter((code) => typeof code === 'string' && code.length > 0),
    );
    if (requiredModuleCodes.size > 1) {
      throw new ForbiddenException(
        'Permissions invalides: une route ne doit référencer qu’un seul module',
      );
    }

    const permissionCodes =
      request.resolvedPermissionCodes ??
      (await this.resolvePermissionCodesForRequest({
        userId: user.userId,
        clientId: activeClient.id,
        request,
      }));

    const missing = required.filter((code) => !permissionCodes.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(
        "Permissions insuffisantes pour accéder à cette ressource",
      );
    }

    return true;
  }

  private async resolvePermissionCodesForRequest(params: {
    userId: string;
    clientId: string;
    request: RequestWithClient;
  }): Promise<Set<string>> {
    const { userId, clientId, request } = params;
    const prisma = this.prisma as any;

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          OR: [
            { scope: RoleScope.CLIENT, clientId },
            { scope: RoleScope.GLOBAL },
          ],
        },
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

    const codes = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        if (rp.permission?.code) {
          codes.add(rp.permission.code);
        }
      }
    }

    request.resolvedPermissionCodes = codes;
    return codes;
  }
}

