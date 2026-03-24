import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleScope } from '@prisma/client';
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
  clientId: string | null;
  scope: 'CLIENT' | 'GLOBAL';
  name: string;
  description: string | null;
  isSystem: boolean;
  isInherited: boolean;
  isReadOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RoleDetail = RoleItem & { permissionIds: string[] };

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
    const roles = await (this.prisma as any).role.findMany({
      where: {
        OR: [{ scope: RoleScope.CLIENT, clientId }, { scope: RoleScope.GLOBAL }],
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        clientId: true,
        scope: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return roles.map((role: any) => this.toRoleItem(role, clientId));
  }

  async createRole(
    clientId: string,
    dto: CreateRoleDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<RoleItem> {
    await this.ensureClientRoleNameUnique(clientId, dto.name);
    const role = await (this.prisma as any).role.create({
      data: {
        clientId,
        scope: RoleScope.CLIENT,
        name: dto.name,
        description: dto.description ?? null,
      },
    });
    const item = this.toRoleItem(role, clientId);
    await this.logRoleEvent('role.created', {
      clientId,
      roleId: item.id,
      payload: { name: item.name, description: item.description, scope: item.scope },
      context,
    });
    return item;
  }

  async getRoleById(clientId: string, id: string): Promise<RoleDetail> {
    const role = await (this.prisma as any).role.findFirst({
      where: {
        id,
        OR: [{ scope: RoleScope.CLIENT, clientId }, { scope: RoleScope.GLOBAL }],
      },
      include: { rolePermissions: { select: { permissionId: true } } },
    });
    if (!role) throw new NotFoundException('Rôle non trouvé pour ce client');
    const permissionIds =
      (role as any).rolePermissions?.map((rp: { permissionId: string }) => rp.permissionId) ?? [];
    return { ...this.toRoleItem(role, clientId), permissionIds };
  }

  async updateRole(
    clientId: string,
    id: string,
    dto: UpdateRoleDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<RoleItem> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id, clientId, scope: RoleScope.CLIENT },
    });
    if (!role) {
      const globalRole = await (this.prisma as any).role.findFirst({
        where: { id, scope: RoleScope.GLOBAL },
        select: { id: true },
      });
      if (globalRole) {
        throw new ForbiddenException('Impossible de modifier un rôle global via ce endpoint');
      }
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }
    if ((role as any).isSystem) {
      throw new ForbiddenException('Impossible de modifier un rôle système');
    }
    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined && dto.name !== role.name) {
      await this.ensureClientRoleNameUnique(clientId, dto.name, id);
      data.name = dto.name;
    }
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (Object.keys(data).length === 0) return this.toRoleItem(role, clientId);
    const updated = await (this.prisma as any).role.update({ where: { id: role.id }, data });
    const item = this.toRoleItem(updated, clientId);
    await this.logRoleEvent('role.updated', {
      clientId,
      roleId: item.id,
      payload: { name: item.name, description: item.description, scope: item.scope },
      context,
    });
    return item;
  }

  async deleteRole(
    clientId: string,
    id: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id, clientId, scope: RoleScope.CLIENT },
      include: { userRoles: true },
    });
    if (!role) {
      const globalRole = await (this.prisma as any).role.findFirst({
        where: { id, scope: RoleScope.GLOBAL },
        select: { id: true },
      });
      if (globalRole) {
        throw new ForbiddenException('Impossible de supprimer un rôle global via ce endpoint');
      }
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }
    if ((role as any).isSystem) {
      throw new ForbiddenException('Impossible de supprimer un rôle système');
    }
    if ((role as any).userRoles?.length > 0) {
      throw new ConflictException(
        'Impossible de supprimer : rôle encore assigné à au moins un utilisateur',
      );
    }
    await (this.prisma as any).role.delete({ where: { id: role.id } });
    await this.logRoleEvent('role.deleted', {
      clientId,
      roleId: role.id,
      payload: { name: role.name, scope: role.scope },
      context,
    });
  }

  async listPermissionsForClient(clientId: string): Promise<PermissionItem[]> {
    const permissions = await (this.prisma as any).permission.findMany({
      where: {
        module: {
          isActive: true,
          clientModules: { some: { clientId, status: 'ENABLED' } },
        },
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
        module: { select: { code: true, name: true } },
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

  async listAllPermissions(): Promise<PermissionItem[]> {
    const permissions = await (this.prisma as any).permission.findMany({
      where: { module: { isActive: true } },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
        module: { select: { code: true, name: true } },
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
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<{ role: RoleItem; permissionIds: string[] }> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id: roleId, clientId, scope: RoleScope.CLIENT },
    });
    if (!role) {
      const globalRole = await (this.prisma as any).role.findFirst({
        where: { id: roleId, scope: RoleScope.GLOBAL },
        select: { id: true },
      });
      if (globalRole) {
        throw new ForbiddenException(
          'Impossible de modifier les permissions d’un rôle global via ce endpoint',
        );
      }
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }
    if ((role as any).isSystem) {
      throw new ForbiddenException('Impossible de modifier les permissions d’un rôle système');
    }
    const allowedPermissions = await (this.prisma as any).permission.findMany({
      where: {
        id: { in: dto.permissionIds },
        module: {
          isActive: true,
          clientModules: { some: { clientId, status: 'ENABLED' } },
        },
      },
      select: { id: true },
    });
    const allowedIds = new Set(allowedPermissions.map((p: any) => p.id));
    if (dto.permissionIds.some((id) => !allowedIds.has(id))) {
      throw new BadRequestException(
        'Certaines permissions ne sont pas disponibles pour les modules activés',
      );
    }
    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        });
      }
    });
    await this.logRoleEvent('role.permissions.updated', {
      clientId,
      roleId: role.id,
      payload: { permissionIds: dto.permissionIds },
      context,
    });
    return { role: this.toRoleItem(role, clientId), permissionIds: dto.permissionIds };
  }

  async listGlobalRoles(): Promise<RoleItem[]> {
    await this.removeSystemFlagEverywhere();
    await this.backfillLegacySystemRolesToGlobal();

    const roles = await (this.prisma as any).role.findMany({
      where: { scope: RoleScope.GLOBAL },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        clientId: true,
        scope: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return roles.map((role: any) => this.toRoleItem(role, undefined, 'platform'));
  }

  /**
   * Backfill one-shot:
   * - anciennes versions stockaient des rôles système en scope CLIENT par client
   * - on migre ces rôles vers GLOBAL (1 rôle global par nom)
   * - on fusionne permissions + assignations userRole vers le rôle global canonique
   */
  private async backfillLegacySystemRolesToGlobal(): Promise<void> {
    const prisma = this.prisma as any;

    const globalCount = await prisma.role.count({
      where: { scope: RoleScope.GLOBAL },
    });
    if (globalCount > 0) return;

    const legacySystemRoles = await prisma.role.findMany({
      where: { scope: RoleScope.CLIENT, isSystem: true },
      include: {
        rolePermissions: { select: { permissionId: true } },
        userRoles: { select: { userId: true } },
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });
    if (legacySystemRoles.length === 0) return;

    const byName = new Map<string, any[]>();
    for (const role of legacySystemRoles) {
      const list = byName.get(role.name) ?? [];
      list.push(role);
      byName.set(role.name, list);
    }

    await prisma.$transaction(async (tx: any) => {
      for (const roles of byName.values()) {
        const canonical = roles[0];

        await tx.role.update({
          where: { id: canonical.id },
          data: {
            scope: RoleScope.GLOBAL,
            clientId: null,
            isSystem: false,
          },
        });

        const duplicates = roles.slice(1);
        for (const duplicate of duplicates) {
          const duplicatePermissionIds = (duplicate.rolePermissions ?? []).map(
            (rp: { permissionId: string }) => rp.permissionId,
          );
          if (duplicatePermissionIds.length > 0) {
            await tx.rolePermission.createMany({
              data: duplicatePermissionIds.map((permissionId: string) => ({
                roleId: canonical.id,
                permissionId,
              })),
              skipDuplicates: true,
            });
          }

          const duplicateUserIds = (duplicate.userRoles ?? []).map(
            (ur: { userId: string }) => ur.userId,
          );
          if (duplicateUserIds.length > 0) {
            await tx.userRole.createMany({
              data: duplicateUserIds.map((userId: string) => ({
                userId,
                roleId: canonical.id,
              })),
              skipDuplicates: true,
            });
          }

          await tx.userRole.deleteMany({ where: { roleId: duplicate.id } });
          await tx.rolePermission.deleteMany({ where: { roleId: duplicate.id } });
          await tx.role.delete({ where: { id: duplicate.id } });
        }
      }
    });
  }

  async createGlobalRole(
    dto: CreateRoleDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<RoleItem> {
    await this.ensureGlobalRoleNameUnique(dto.name);
    const role = await (this.prisma as any).role.create({
      data: {
        clientId: null,
        scope: RoleScope.GLOBAL,
        name: dto.name,
        description: dto.description ?? null,
        isSystem: false,
      },
    });
    const item = this.toRoleItem(role, undefined, 'platform');
    await this.logRoleEvent('platform.role.created', {
      clientId: null,
      roleId: item.id,
      payload: { name: item.name, description: item.description, scope: item.scope },
      context,
    });
    return item;
  }

  async getGlobalRoleById(id: string): Promise<RoleDetail> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id, scope: RoleScope.GLOBAL },
      include: { rolePermissions: { select: { permissionId: true } } },
    });
    if (!role) throw new NotFoundException('Rôle global non trouvé');
    const permissionIds =
      (role as any).rolePermissions?.map((rp: { permissionId: string }) => rp.permissionId) ?? [];
    return { ...this.toRoleItem(role, undefined, 'platform'), permissionIds };
  }

  async updateGlobalRole(
    id: string,
    dto: UpdateRoleDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<RoleItem> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id, scope: RoleScope.GLOBAL },
    });
    if (!role) throw new NotFoundException('Rôle global non trouvé');
    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined && dto.name !== role.name) {
      await this.ensureGlobalRoleNameUnique(dto.name, id);
      data.name = dto.name;
    }
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (Object.keys(data).length === 0) return this.toRoleItem(role, undefined, 'platform');
    const updated = await (this.prisma as any).role.update({ where: { id: role.id }, data });
    const item = this.toRoleItem(updated, undefined, 'platform');
    await this.logRoleEvent('platform.role.updated', {
      clientId: null,
      roleId: item.id,
      payload: { name: item.name, description: item.description, scope: item.scope },
      context,
    });
    return item;
  }

  async replaceGlobalRolePermissions(
    roleId: string,
    dto: UpdateRolePermissionsDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<{ role: RoleItem; permissionIds: string[] }> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id: roleId, scope: RoleScope.GLOBAL },
    });
    if (!role) throw new NotFoundException('Rôle global non trouvé');
    const existingPermissions = await (this.prisma as any).permission.findMany({
      where: { id: { in: dto.permissionIds } },
      select: { id: true },
    });
    if (existingPermissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('Certaines permissions sont invalides');
    }
    await (this.prisma as any).$transaction(async (tx: any) => {
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        });
      }
    });
    await this.logRoleEvent('platform.role.permissions.updated', {
      clientId: null,
      roleId: role.id,
      payload: { permissionIds: dto.permissionIds },
      context,
    });
    return { role: this.toRoleItem(role, undefined, 'platform'), permissionIds: dto.permissionIds };
  }

  async deleteGlobalRole(
    id: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    const role = await (this.prisma as any).role.findFirst({
      where: { id, scope: RoleScope.GLOBAL },
      include: { userRoles: true },
    });
    if (!role) throw new NotFoundException('Rôle global non trouvé');
    if ((role as any).userRoles?.length > 0) {
      throw new ConflictException(
        'Impossible de supprimer : rôle global encore assigné à au moins un utilisateur',
      );
    }
    await (this.prisma as any).role.delete({ where: { id: role.id } });
    await this.logRoleEvent('platform.role.deleted', {
      clientId: null,
      roleId: role.id,
      payload: { name: role.name, scope: RoleScope.GLOBAL },
      context,
    });
  }

  private async logRoleEvent(
    action:
      | 'role.created'
      | 'role.updated'
      | 'role.deleted'
      | 'role.permissions.updated'
      | 'platform.role.created'
      | 'platform.role.updated'
      | 'platform.role.deleted'
      | 'platform.role.permissions.updated',
    params: {
      clientId: string | null;
      roleId: string;
      payload: Record<string, unknown>;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, roleId, payload, context } = params;
    if (!clientId) return;
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

  private async ensureClientRoleNameUnique(
    clientId: string,
    name: string,
    ignoreRoleId?: string,
  ): Promise<void> {
    const existing = await (this.prisma as any).role.findFirst({
      where: {
        clientId,
        scope: RoleScope.CLIENT,
        name,
        ...(ignoreRoleId && { id: { not: ignoreRoleId } }),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Un rôle avec ce nom existe déjà pour ce client');
  }

  private async ensureGlobalRoleNameUnique(name: string, ignoreRoleId?: string): Promise<void> {
    const existing = await (this.prisma as any).role.findFirst({
      where: {
        scope: RoleScope.GLOBAL,
        name,
        ...(ignoreRoleId && { id: { not: ignoreRoleId } }),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Un rôle global avec ce nom existe déjà');
  }

  private async removeSystemFlagEverywhere(): Promise<void> {
    await (this.prisma as any).role.updateMany({
      where: { isSystem: true },
      data: { isSystem: false },
    });
  }

  private toRoleItem(
    role: {
      id: string;
      clientId: string | null;
      scope: RoleScope;
      name: string;
      description: string | null;
      isSystem: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    activeClientId?: string,
    view: 'client' | 'platform' = 'client',
  ): RoleItem {
    const isGlobal = role.scope === RoleScope.GLOBAL;
    const isPlatformView = view === 'platform';
    return {
      id: role.id,
      clientId: role.clientId ?? null,
      scope: role.scope,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      isInherited: isPlatformView ? false : isGlobal,
      isReadOnly: isPlatformView
        ? false
        : isGlobal || (role.scope === RoleScope.CLIENT && role.clientId !== activeClientId),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

