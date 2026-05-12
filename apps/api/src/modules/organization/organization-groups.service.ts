import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgGroupStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { AddOrgGroupMemberDto } from './dto/add-org-group-member.dto';
import { CreateOrgGroupDto } from './dto/create-org-group.dto';
import { UpdateOrgGroupDto } from './dto/update-org-group.dto';
import { ORGANIZATION_AUDIT, ORG_AUDIT_RESOURCE_TYPES } from './organization-audit.constants';
import {
  assertHumanResourceForOrgMembership,
  assertOrgGroupActive,
  isPrismaUniqueViolation,
  resolveLinkedUserEmailForResource,
} from './organization-membership.helpers';

@Injectable()
export class OrganizationGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(clientId: string) {
    return this.prisma.orgGroup.findMany({
      where: { clientId },
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(clientId: string, dto: CreateOrgGroupDto, ctx: AuditContext) {
    try {
      const row = await this.prisma.orgGroup.create({
        data: {
          clientId,
          name: dto.name.trim(),
          code: dto.code?.trim() || null,
          description: dto.description?.trim() || null,
          type: dto.type,
          metadata: dto.metadata === undefined ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: ctx.actorUserId,
        action: ORGANIZATION_AUDIT.GROUP_CREATED,
        resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_GROUP,
        resourceId: row.id,
        newValue: { id: row.id, name: row.name, code: row.code, type: row.type },
        ipAddress: ctx.meta?.ipAddress,
        userAgent: ctx.meta?.userAgent,
        requestId: ctx.meta?.requestId,
      });
      return row;
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        throw new ConflictException('Ce code est déjà utilisé pour un autre groupe de ce client');
      }
      throw e;
    }
  }

  async update(clientId: string, id: string, dto: UpdateOrgGroupDto, ctx: AuditContext) {
    const existing = await this.prisma.orgGroup.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Groupe introuvable');

    const data: Prisma.OrgGroupUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue);
    }

    try {
      const row = await this.prisma.orgGroup.update({ where: { id }, data });
      await this.auditLogs.create({
        clientId,
        userId: ctx.actorUserId,
        action: ORGANIZATION_AUDIT.GROUP_UPDATED,
        resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_GROUP,
        resourceId: row.id,
        oldValue: { name: existing.name, code: existing.code, type: existing.type, status: existing.status },
        newValue: { name: row.name, code: row.code, type: row.type, status: row.status },
        ipAddress: ctx.meta?.ipAddress,
        userAgent: ctx.meta?.userAgent,
        requestId: ctx.meta?.requestId,
      });
      return row;
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        throw new ConflictException('Ce code est déjà utilisé pour un autre groupe de ce client');
      }
      throw e;
    }
  }

  async archive(clientId: string, id: string, ctx: AuditContext) {
    const existing = await this.prisma.orgGroup.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Groupe introuvable');
    if (existing.status === OrgGroupStatus.ARCHIVED) {
      return existing;
    }
    const row = await this.prisma.orgGroup.update({
      where: { id },
      data: { status: OrgGroupStatus.ARCHIVED, archivedAt: new Date() },
    });
    await this.auditLogs.create({
      clientId,
      userId: ctx.actorUserId,
      action: ORGANIZATION_AUDIT.GROUP_ARCHIVED,
      resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_GROUP,
      resourceId: row.id,
      oldValue: { status: existing.status },
      newValue: { status: row.status, archivedAt: row.archivedAt },
      ipAddress: ctx.meta?.ipAddress,
      userAgent: ctx.meta?.userAgent,
      requestId: ctx.meta?.requestId,
    });
    return row;
  }

  async listMembers(clientId: string, groupId: string) {
    const group = await this.prisma.orgGroup.findFirst({
      where: { id: groupId, clientId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const rows = await this.prisma.orgGroupMembership.findMany({
      where: { clientId, groupId },
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
        groupId: m.groupId,
        memberType: m.memberType,
        createdAt: m.createdAt.toISOString(),
        resource: m.resource,
        linkedUserEmail,
      });
    }
    return out;
  }

  async addMember(clientId: string, groupId: string, dto: AddOrgGroupMemberDto, ctx: AuditContext) {
    await assertOrgGroupActive(this.prisma, clientId, groupId);
    const resource = await assertHumanResourceForOrgMembership(this.prisma, clientId, dto.resourceId);

    try {
      const row = await this.prisma.orgGroupMembership.create({
        data: {
          clientId,
          groupId,
          resourceId: dto.resourceId,
          memberType: dto.memberType ?? undefined,
        },
      });
      await this.auditLogs.create({
        clientId,
        userId: ctx.actorUserId,
        action: ORGANIZATION_AUDIT.GROUP_MEMBER_ADDED,
        resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_GROUP_MEMBERSHIP,
        resourceId: row.id,
        newValue: { groupId, resourceId: dto.resourceId, memberType: row.memberType },
        ipAddress: ctx.meta?.ipAddress,
        userAgent: ctx.meta?.userAgent,
        requestId: ctx.meta?.requestId,
      });
      const linkedUserEmail = await resolveLinkedUserEmailForResource(this.prisma, clientId, resource);
      return { ...row, resource, linkedUserEmail };
    } catch (e) {
      if (isPrismaUniqueViolation(e)) {
        throw new ConflictException('Cette ressource est déjà rattachée à ce groupe');
      }
      throw e;
    }
  }

  async removeMember(clientId: string, groupId: string, membershipId: string, ctx: AuditContext) {
    const group = await this.prisma.orgGroup.findFirst({
      where: { id: groupId, clientId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const m = await this.prisma.orgGroupMembership.findFirst({
      where: { id: membershipId },
      include: { resource: { select: { id: true, name: true, type: true, email: true } } },
    });
    if (!m || m.clientId !== clientId || m.groupId !== groupId) {
      throw new NotFoundException('Rattachement introuvable');
    }

    await this.prisma.orgGroupMembership.delete({ where: { id: membershipId } });
    await this.auditLogs.create({
      clientId,
      userId: ctx.actorUserId,
      action: ORGANIZATION_AUDIT.GROUP_MEMBER_REMOVED,
      resourceType: ORG_AUDIT_RESOURCE_TYPES.ORG_GROUP_MEMBERSHIP,
      resourceId: membershipId,
      oldValue: { groupId, resourceId: m.resourceId },
      ipAddress: ctx.meta?.ipAddress,
      userAgent: ctx.meta?.userAgent,
      requestId: ctx.meta?.requestId,
    });
    return { ok: true };
  }
}
