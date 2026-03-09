import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientModuleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async listRoles(clientId: string): Promise<RoleItem[]> {
    const roles = await this.prisma.role.findMany({
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

  async createRole(clientId: string, dto: CreateRoleDto): Promise<RoleItem> {
    await this.ensureRoleNameUnique(clientId, dto.name);

    const role = await this.prisma.role.create({
      data: {
        clientId,
        name: dto.name,
        description: dto.description ?? null,
      },
    });

    return this.toRoleItem(role);
  }

  async getRoleById(clientId: string, id: string): Promise<RoleItem> {
    const role = await this.prisma.role.findFirst({
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
  ): Promise<RoleItem> {
    const role = await this.prisma.role.findFirst({
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

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data,
    });

    return this.toRoleItem(updated);
  }

  async deleteRole(clientId: string, id: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
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

    await this.prisma.role.delete({
      where: { id: role.id },
    });
  }

  async listPermissionsForClient(clientId: string): Promise<PermissionItem[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        module: {
          isActive: true,
          clientModules: {
            some: { clientId, status: ClientModuleStatus.ENABLED },
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

    return permissions.map((p) => ({
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
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, clientId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé pour ce client');
    }

    const allowedPermissions = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permissionIds },
        module: {
          isActive: true,
          clientModules: {
            some: { clientId, status: ClientModuleStatus.ENABLED },
          },
        },
      },
      select: { id: true },
    });

    const allowedIds = new Set(allowedPermissions.map((p) => p.id));
    const invalidIds = dto.permissionIds.filter((id) => !allowedIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Certaines permissions ne sont pas disponibles pour les modules activés',
      );
    }

    await this.prisma.$transaction(async (tx) => {
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

  private async ensureRoleNameUnique(
    clientId: string,
    name: string,
    ignoreRoleId?: string,
  ): Promise<void> {
    const existing = await this.prisma.role.findFirst({
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

