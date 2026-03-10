import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  moduleCode: string;
  moduleName: string;
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listRoles(clientId: string): Promise<RoleItem[]> {
    const prisma = this.prisma as any;

    const roles = await prisma.role.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return roles;
  }

  async createRole(
    clientId: string,
    dto: CreateRoleDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<RoleItem> {
    await this.ensureRoleNameUnique(clientId, dto.name);

    const prisma = this.prisma as any;

    const role = await prisma.role.create({
      data: {
        clientId,
        name: dto.name,
        description: dto.description ?? null,
      },
    });

    const item = this.toRoleItem(role);
    await this.logRoleEvent('role.created', {
      clientId,
      roleId: item.id,
      payload: { name: item.name, description: item.description },
      context,
    });
    return item;
  }

  async getRoleById(clientId: string, id: string): Promise<RoleItem> {
    const prisma = this.prisma as any;

    const role = await prisma.role.findFirst({
      where: { id, clientId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }
    return this.toRoleItem(role);
  }

  async updateRole(
    clientId: string,
    id: string,
    dto: UpdateRoleDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<RoleItem> {
    const prisma = this.prisma as any;

    const role = await prisma.role.findFirst({
      where: { id, clientId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }

    const data: { name?: string; description?: string | null } = {};

    if (dto.name !== undefined && dto.name !== role.name) {
      await this.ensureRoleNameUnique(clientId, dto.name, id);
      data.name = dto.name;
    }
    if (dto.description !== undefined) {
      data.description = dto.description ?? null;
    }

    if (Object.keys(data).length === 0) {
      return this.toRoleItem(role);
    }

    const updated = await (this.prisma as any).role.update({
      where: { id: role.id },
      data,
    });

    const item = this.toRoleItem(updated);
    await this.logRoleEvent('role.updated', {
      clientId,
      roleId: item.id,
      payload: { name: item.name, description: item.description },
      context,
    });
    return item;
  }

  async deleteRole(
    clientId: string,
    id: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    const prisma = this.prisma as any;

    const role = await prisma.role.findFirst({
      where: { id, clientId },
      include: { userRoles: true },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }
    if (role.isSystem) {
      throw new ConflictException('Impossible de supprimer un rôle système');
    }
    if (role.userRoles.length > 0) {
      throw new ConflictException(
        'Impossible de supprimer un rôle encore assigné à au moins un utilisateur',
      );
    }

    await (this.prisma as any).role.delete({
      where: { id: role.id },
    });
    await this.logRoleEvent('role.deleted', {
      clientId,
      roleId: role.id,
      payload: { name: role.name },
      context,
    });
  }

  async listPermissionsForClient(clientId: string): Promise<PermissionItem[]> {
    const prisma = this.prisma as any;

    const permissions = await prisma.permission.findMany({
      where: {
        module: {
          isActive: true,
          clientModules: {
            some: { clientId, status: 'ENABLED' },
          },
        },
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
        module: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    return permissions.map((p: any) => ({
      id: p.id,
      code: p.code,
      label: p.label,
      description: p.description ?? null,
      moduleCode: p.module.code,
      moduleName: p.module.name,
    }));
  }

  async replaceRolePermissions(
    clientId: string,
    roleId: string,
    dto: UpdateRolePermissionsDto,
  ): Promise<{ role: RoleItem; permissionIds: string[] }> {
    const prisma = this.prisma as any;

    const role = await prisma.role.findFirst({
      where: { id: roleId, clientId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }

    const allowedPermissions = await (this.prisma as any).permission.findMany({
      where: {
        id: { in: dto.permissionIds },
        module: {
          isActive: true,
          clientModules: {
            some: { clientId, status: 'ENABLED' },
          },
        },
      },
      select: { id: true },
    });

    const allowedIds = new Set(allowedPermissions.map((p: any) => p.id));
    const invalidIds = dto.permissionIds.filter((id) => !allowedIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Certaines permissions ne sont pas disponibles pour les modules activés',
      );
    }

    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      if (dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    });

    return {
      role: this.toRoleItem(role),
      permissionIds: dto.permissionIds,
    };
  }

  private async logRoleEvent(
    action: 'role.created' | 'role.updated' | 'role.deleted',
    params: {
      clientId: string;
      roleId: string;
      payload: Record<string, unknown>;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, roleId, payload, context } = params;
    if (!clientId) {
      return;
    }
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'role',
      resourceId: roleId,
      newValue: payload,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }

  private async ensureRoleNameUnique(
    clientId: string,
    name: string,
    ignoreRoleId?: string,
  ): Promise<void> {
    const existing = await (this.prisma as any).role.findFirst({
      where: {
        clientId,
        name,
        ...(ignoreRoleId && { id: { not: ignoreRoleId } }),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Un rôle avec ce nom existe déjà pour ce client',
      );
    }
  }

  private toRoleItem(role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): RoleItem {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

