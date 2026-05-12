import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrgUnitStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { AddOrgUnitMemberDto } from './dto/add-org-unit-member.dto';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { buildOrgUnitTree, wouldSetParentCreateCycle } from './org-hierarchy.util';
import { ORGANIZATION_AUDIT, ORG_AUDIT_RESOURCE_TYPES } from './organization-audit.constants';
import {
  assertHumanResourceForOrgMembership,
  assertOrgUnitActive,
  isPrismaUniqueViolation,
  resolveLinkedUserEmailForResource,
} from './organization-membership.helpers';

@Injectable()
export class OrganizationUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listTree(clientId: string) {
    const units = await this.prisma.orgUnit.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return buildOrgUnitTree(units);
  }

  async create(clientId: string, dto: CreateOrgUnitDto, ctx: AuditContext) {
    if (dto.parentId) {
      const parent = await this.prisma.orgUnit.findFirst({
        where: { id: dto.parentId, clientId },
        select: { id: true, status: true },
      });
      if (!parent) throw new NotFoundException('Unité parente introuvable');
      if (parent.status === OrgUnitStatus.ARCHIVED) {
        throw new BadRequestException('Impossible de rattacher une unité à un parent archivé');
      }
    }
    try {
      const row = await this.prisma.orgUnit.create({
        data: {
          clientId,
          name: dto.name.trim(),
          code: dto.code?.trim() || null,
          description: dto.description?.trim() || null,
          type: dto.type,
          parentId: dto.parentId ?? null,
          sortOrder: dto.sortOrder ?? 0,
          metadata: dto.metadata === undefined ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: ctx.actorUserId,
        action: ORGANIZATION_AUDIT.UNIT_CREATED,
        resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_UNIT,
        resourceId: row.id,
        newValue: { id: row.id, name: row.name, code: row.code, type: row.type, parentId: row.parentId },
        ipAddress: ctx.meta?.ipAddress,
        userAgent: ctx.meta?.userAgent,
        requestId: ctx.meta?.requestId,
      });
      return row;
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        throw new ConflictException('Ce code est déjà utilisé pour une autre unité de ce client');
      }
      throw e;
    }
  }

  async update(clientId: string, id: string, dto: UpdateOrgUnitDto, ctx: AuditContext) {
    const existing = await this.prisma.orgUnit.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Unité introuvable');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Une unité ne peut pas être son propre parent');
      }
      const parent = await this.prisma.orgUnit.findFirst({
        where: { id: dto.parentId, clientId },
        select: { id: true, status: true },
      });
      if (!parent) throw new NotFoundException('Unité parente introuvable');
      if (parent.status === OrgUnitStatus.ARCHIVED) {
        throw new BadRequestException('Impossible de rattacher une unité à un parent archivé');
      }
      const all = await this.prisma.orgUnit.findMany({
        where: { clientId },
        select: { id: true, parentId: true },
      });
      const parentById = new Map(all.map((u) => [u.id, u.parentId]));
      if (wouldSetParentCreateCycle({ unitId: id, newParentId: dto.parentId, parentById })) {
        throw new BadRequestException('Hiérarchie circulaire interdite');
      }
    }

    const data: Prisma.OrgUnitUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.parentId !== undefined) {
      data.parent =
        dto.parentId === null
          ? { disconnect: true }
          : { connect: { id: dto.parentId } };
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue);
    }

    try {
      const row = await this.prisma.orgUnit.update({
        where: { id },
        data,
      });
      await this.auditLogs.create({
        clientId,
        userId: ctx.actorUserId,
        action: ORGANIZATION_AUDIT.UNIT_UPDATED,
        resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_UNIT,
        resourceId: row.id,
        oldValue: {
          name: existing.name,
          code: existing.code,
          type: existing.type,
          parentId: existing.parentId,
          status: existing.status,
        },
        newValue: {
          name: row.name,
          code: row.code,
          type: row.type,
          parentId: row.parentId,
          status: row.status,
        },
        ipAddress: ctx.meta?.ipAddress,
        userAgent: ctx.meta?.userAgent,
        requestId: ctx.meta?.requestId,
      });
      return row;
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        throw new ConflictException('Ce code est déjà utilisé pour une autre unité de ce client');
      }
      throw e;
    }
  }

  async archive(clientId: string, id: string, ctx: AuditContext) {
    const existing = await this.prisma.orgUnit.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Unité introuvable');
    if (existing.status === OrgUnitStatus.ARCHIVED) {
      return existing;
    }
    const row = await this.prisma.orgUnit.update({
      where: { id },
      data: { status: OrgUnitStatus.ARCHIVED, archivedAt: new Date() },
    });
    await this.auditLogs.create({
      clientId,
      userId: ctx.actorUserId,
      action: ORGANIZATION_AUDIT.UNIT_ARCHIVED,
      resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_UNIT,
      resourceId: row.id,
      oldValue: { status: existing.status },
      newValue: { status: row.status, archivedAt: row.archivedAt },
      ipAddress: ctx.meta?.ipAddress,
      userAgent: ctx.meta?.userAgent,
      requestId: ctx.meta?.requestId,
    });
    return row;
  }

  async listMembers(clientId: string, unitId: string) {
    const unit = await this.prisma.orgUnit.findFirst({
      where: { id: unitId, clientId },
      select: { id: true },
    });
    if (!unit) throw new NotFoundException('Unité introuvable');

    const rows = await this.prisma.orgUnitMembership.findMany({
      where: { clientId, orgUnitId: unitId },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            firstName: true,
            type: true,
            email: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const out = [];
    for (const m of rows) {
      const linkedUserEmail = await resolveLinkedUserEmailForResource(this.prisma, clientId, m.resource);
      out.push({
        id: m.id,
        orgUnitId: m.orgUnitId,
        memberType: m.memberType,
        roleTitle: m.roleTitle,
        startsAt: m.startsAt?.toISOString() ?? null,
        endsAt: m.endsAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        resource: m.resource,
        linkedUserEmail,
      });
    }
    return out;
  }

  async addMember(clientId: string, unitId: string, dto: AddOrgUnitMemberDto, ctx: AuditContext) {
    await assertOrgUnitActive(this.prisma, clientId, unitId);
    const resource = await assertHumanResourceForOrgMembership(this.prisma, clientId, dto.resourceId);

    try {
      const row = await this.prisma.orgUnitMembership.create({
        data: {
          clientId,
          orgUnitId: unitId,
          resourceId: dto.resourceId,
          memberType: dto.memberType ?? undefined,
          roleTitle: dto.roleTitle?.trim() || null,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: ctx.actorUserId,
        action: ORGANIZATION_AUDIT.UNIT_MEMBER_ADDED,
        resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_UNIT_MEMBERSHIP,
        resourceId: row.id,
        newValue: { orgUnitId: unitId, resourceId: dto.resourceId, memberType: row.memberType },
        ipAddress: ctx.meta?.ipAddress,
        userAgent: ctx.meta?.userAgent,
        requestId: ctx.meta?.requestId,
      });
      const linkedUserEmail = await resolveLinkedUserEmailForResource(this.prisma, clientId, resource);
      return { ...row, resource, linkedUserEmail };
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        throw new ConflictException('Cette ressource est déjà rattachée à cette unité');
      }
      throw e;
    }
  }

  async removeMember(clientId: string, unitId: string, membershipId: string, ctx: AuditContext) {
    const unit = await this.prisma.orgUnit.findFirst({
      where: { id: unitId, clientId },
      select: { id: true },
    });
    if (!unit) throw new NotFoundException('Unité introuvable');

    const m = await this.prisma.orgUnitMembership.findFirst({
      where: { id: membershipId },
      include: { resource: { select: { id: true, name: true, type: true, email: true } } },
    });
    if (!m || m.clientId !== clientId || m.orgUnitId !== unitId) {
      throw new NotFoundException('Rattachement introuvable');
    }

    await this.prisma.orgUnitMembership.delete({ where: { id: membershipId } });
    await this.auditLogs.create({
      clientId,
      userId: ctx.actorUserId,
      action: ORGANIZATION_AUDIT.UNIT_MEMBER_REMOVED,
      resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_UNIT_MEMBERSHIP,
      resourceId: membershipId,
      oldValue: { orgUnitId: unitId, resourceId: m.resourceId },
      ipAddress: ctx.meta?.ipAddress,
      userAgent: ctx.meta?.userAgent,
      requestId: ctx.meta?.requestId,
    });
    return { ok: true };
  }
}
