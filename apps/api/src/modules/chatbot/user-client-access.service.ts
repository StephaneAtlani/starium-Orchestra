import { Injectable } from '@nestjs/common';
import { ClientUserRole, ClientUserStatus, RoleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Résolution permissions / modules activés / rôle ClientUser pour le chatbot (RFC-AI-001).
 * Aligné sur GET /me/permissions (MeService.getPermissionCodes).
 */
@Injectable()
export class UserClientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientUserRole(
    userId: string,
    clientId: string,
  ): Promise<ClientUserRole | null> {
    const row = await this.prisma.clientUser.findFirst({
      where: { userId, clientId, status: ClientUserStatus.ACTIVE },
      select: { role: true },
    });
    return row?.role ?? null;
  }

  async resolvePermissionCodes(
    userId: string,
    clientId: string,
  ): Promise<Set<string>> {
    const enabledClientModules = await this.prisma.clientModule.findMany({
      where: { clientId, status: 'ENABLED' },
      select: { moduleId: true },
    });
    const enabledModuleIds = new Set(
      enabledClientModules.map((cm) => cm.moduleId),
    );

    const userRoles = await this.prisma.userRole.findMany({
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
              include: {
                permission: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    });

    const codes = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const p = rp.permission;
        if (!p?.code || !p.module) continue;
        if (!p.module.isActive) continue;
        if (!enabledModuleIds.has(p.moduleId)) continue;
        codes.add(p.code);
      }
    }
    return codes;
  }

  /** true si le module est actif globalement et activé pour ce client. */
  async isModuleEnabledForClient(
    clientId: string,
    moduleCode: string,
  ): Promise<boolean> {
    const mod = await this.prisma.module.findUnique({
      where: { code: moduleCode },
      include: {
        clientModules: {
          where: { clientId, status: 'ENABLED' },
          select: { id: true },
        },
      },
    });
    if (!mod?.isActive) return false;
    return mod.clientModules.length > 0;
  }
}
