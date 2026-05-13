import { Injectable } from '@nestjs/common';
import { RoleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Résolution des codes permission **bruts** issus des rôles (UserRole → Permission.code).
 * Les guards utilisent `satisfiesPermission` (@starium-orchestra/rbac-permissions) sur ce set :
 * ne pas faire de `Set.has(required)` directement sur les décorateurs.
 */
@Injectable()
export class EffectivePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePermissionCodesForRequest(params: {
    userId: string;
    clientId: string;
    /** Absent hors requête HTTP : pas de cache `resolvedPermissionCodes`. */
    request?: RequestWithClient;
  }): Promise<Set<string>> {
    const { userId, clientId, request } = params;
    if (request?.resolvedPermissionCodes) {
      return request.resolvedPermissionCodes;
    }
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

    if (request) {
      request.resolvedPermissionCodes = codes;
    }
    return codes;
  }
}
