import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus, RoleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

export interface UserRoleItem {
  id: string;
  clientId: string | null;
  scope: 'CLIENT' | 'GLOBAL';
  name: string;
  description: string | null;
  isSystem: boolean;
  isInherited: boolean;
  isReadOnly: boolean;
}

@Injectable()
export class UserRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getUserRolesForClient(
    clientId: string,
    userId: string,
  ): Promise<UserRoleItem[]> {
    await this.ensureUserBelongsToClient(clientId, userId);

    const prisma = this.prisma as any;

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          OR: [{ scope: RoleScope.CLIENT, clientId }, { scope: RoleScope.GLOBAL }],
        },
      },
      include: {
        role: true,
      },
      orderBy: {
        role: { name: 'asc' },
      },
    });

    return userRoles.map((ur: any) => ({
      id: ur.role.id,
      clientId: ur.role.clientId ?? null,
      scope: ur.role.scope,
      name: ur.role.name,
      description: ur.role.description ?? null,
      isSystem: ur.role.isSystem,
      isInherited: ur.role.scope === RoleScope.GLOBAL,
      isReadOnly: ur.role.scope === RoleScope.GLOBAL,
    }));
  }

  async replaceUserRolesForClient(
    clientId: string,
    userId: string,
    dto: UpdateUserRolesDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<{ userId: string; roleIds: string[] }> {
    await this.ensureUserBelongsToClient(clientId, userId);

    const prisma = this.prisma as any;

    const roles = await prisma.role.findMany({
      where: {
        id: { in: dto.roleIds },
        OR: [{ scope: RoleScope.CLIENT, clientId }, { scope: RoleScope.GLOBAL }],
      },
      select: { id: true, scope: true, clientId: true },
    });

    const allowedIds = new Set(roles.map((r: any) => r.id));
    const invalidIds = dto.roleIds.filter((id) => !allowedIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        "Certains rôles ne sont pas associés au client actif",
      );
    }

    const allAssignableRoleIds = await (this.prisma as any).role.findMany({
      where: {
        OR: [{ scope: RoleScope.CLIENT, clientId }, { scope: RoleScope.GLOBAL }],
      },
      select: { id: true },
    });
    const assignableRoleIdsSet = new Set(allAssignableRoleIds.map((r: any) => r.id));

    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.userRole.deleteMany({
        where: {
          userId,
          roleId: { in: Array.from(assignableRoleIdsSet) },
        },
      });

      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId,
            roleId,
          })),
        });
      }
    });

    await this.logUserRolesEvent({
      clientId,
      userId,
      roleIds: dto.roleIds,
      context,
    });

    return { userId, roleIds: dto.roleIds };
  }

  private async ensureUserBelongsToClient(
    clientId: string,
    userId: string,
  ): Promise<void> {
    const clientUser = await this.prisma.clientUser.findFirst({
      where: {
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!clientUser) {
      throw new NotFoundException(
        "Utilisateur non trouvé dans le client actif ou inactif",
      );
    }
  }
  private async logUserRolesEvent(params: {
    clientId: string;
    userId: string;
    roleIds: string[];
    context?: { actorUserId?: string; meta?: RequestMeta };
  }): Promise<void> {
    const { clientId, userId, roleIds, context } = params;
    if (!clientId) {
      return;
    }
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'user.roles.updated',
      resourceType: 'user',
      resourceId: userId,
      newValue: { roleIds },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }
}

