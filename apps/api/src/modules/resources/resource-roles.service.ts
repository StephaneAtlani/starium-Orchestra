import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateResourceRoleDto } from './dto/create-resource-role.dto';
import { ListResourceRolesQueryDto } from './dto/list-resource-roles.query.dto';
import { UpdateResourceRoleDto } from './dto/update-resource-role.dto';

export type ResourceRoleListItemDto = {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ResourceRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    query: ListResourceRolesQueryDto,
  ): Promise<{
    items: ResourceRoleListItemDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const where: Prisma.ResourceRoleWhereInput = { clientId };
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.resourceRole.count({ where }),
      this.prisma.resourceRole.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  async create(
    clientId: string,
    dto: CreateResourceRoleDto,
    context: AuditContext,
  ): Promise<ResourceRoleListItemDto> {
    try {
      const created = await this.prisma.resourceRole.create({
        data: {
          clientId,
          name: dto.name.trim(),
          code: dto.code?.trim() || null,
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: 'resource_role.created',
        resourceType: 'resource_role',
        resourceId: created.id,
        newValue: { name: created.name },
        ipAddress: context.meta?.ipAddress,
        userAgent: context.meta?.userAgent,
        requestId: context.meta?.requestId,
      });
      return {
        id: created.id,
        name: created.name,
        code: created.code,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Nom de rôle métier déjà utilisé');
      }
      throw e;
    }
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateResourceRoleDto,
    context: AuditContext,
  ): Promise<ResourceRoleListItemDto> {
    const existing = await this.prisma.resourceRole.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Rôle métier introuvable');
    }
    try {
      const updated = await this.prisma.resourceRole.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: 'resource_role.updated',
        resourceType: 'resource_role',
        resourceId: updated.id,
        oldValue: { name: existing.name },
        newValue: { name: updated.name },
        ipAddress: context.meta?.ipAddress,
        userAgent: context.meta?.userAgent,
        requestId: context.meta?.requestId,
      });
      return {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Nom de rôle métier déjà utilisé');
      }
      throw e;
    }
  }
}
