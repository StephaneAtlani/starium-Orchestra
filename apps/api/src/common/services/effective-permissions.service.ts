import { Injectable } from '@nestjs/common';
import { RoleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithClient } from '../types/request-with-client';

/**
 * Résolution des codes permission effectifs (même logique que PermissionsGuard).
 * Centralise pour éviter toute divergence avec ModuleAccessGuard (ordre des guards).
 */
@Injectable()
export class EffectivePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePermissionCodesForRequest(params: {
    userId: string;
    clientId: string;
    request: RequestWithClient;
  }): Promise<Set<string>> {
    const { userId, clientId, request } = params;
    if (request.resolvedPermissionCodes) {
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

    request.resolvedPermissionCodes = codes;
    return codes;
  }
}
