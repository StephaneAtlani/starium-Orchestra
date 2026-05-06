import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus, Prisma, ResourceAclSubjectType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { CreateAccessGroupDto } from './dto/create-access-group.dto';
import { UpdateAccessGroupDto } from './dto/update-access-group.dto';

export type AccessGroupListItem = {
  id: string;
  name: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessGroupMemberRow = {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
};

@Injectable()
export class AccessGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listGroups(clientId: string): Promise<AccessGroupListItem[]> {
    const groups = await this.prisma.accessGroup.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true } } },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g._count.members,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  async getGroupById(
    clientId: string,
    id: string,
  ): Promise<AccessGroupListItem> {
    const g = await this.prisma.accessGroup.findFirst({
      where: { id, clientId },
      include: { _count: { select: { members: true } } },
    });
    if (!g) {
      throw new NotFoundException('Groupe non trouvé pour ce client');
    }
    return {
      id: g.id,
      name: g.name,
      memberCount: g._count.members,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }

  async createGroup(
    clientId: string,
    dto: CreateAccessGroupDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<AccessGroupListItem> {
    try {
      const g = await this.prisma.accessGroup.create({
        data: { clientId, name: dto.name.trim() },
        include: { _count: { select: { members: true } } },
      });
      const item: AccessGroupListItem = {
        id: g.id,
        name: g.name,
        memberCount: g._count.members,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      };
      await this.logEvent('access_group.created', {
        clientId,
        groupId: g.id,
        input: {
          newValue: { name: g.name },
        },
        context,
      });
      return item;
    } catch (e) {
      this.rethrowUniqueName(e);
      throw e;
    }
  }

  async updateGroup(
    clientId: string,
    id: string,
    dto: UpdateAccessGroupDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<AccessGroupListItem> {
    const existing = await this.prisma.accessGroup.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Groupe non trouvé pour ce client');
    }
    if (dto.name === undefined) {
      return this.getGroupById(clientId, id);
    }
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new BadRequestException('Le nom ne peut pas être vide');
    }
    try {
      const g = await this.prisma.accessGroup.update({
        where: { id: existing.id },
        data: { name: trimmed },
        include: { _count: { select: { members: true } } },
      });
      await this.logEvent('access_group.updated', {
        clientId,
        groupId: g.id,
        input: {
          oldValue: { name: existing.name },
          newValue: { name: g.name },
        },
        context,
      });
      return {
        id: g.id,
        name: g.name,
        memberCount: g._count.members,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      };
    } catch (e) {
      this.rethrowUniqueName(e);
      throw e;
    }
  }

  /**
   * Audite le nom du groupe **avant** suppression (cascade DB des membres).
   */
  async deleteGroup(
    clientId: string,
    id: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    const existing = await this.prisma.accessGroup.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Groupe non trouvé pour ce client');
    }
    await this.logEvent('access_group.deleted', {
      clientId,
      groupId: existing.id,
      input: {
        oldValue: { name: existing.name, id: existing.id },
      },
      context,
    });
    await this.prisma.$transaction([
      this.prisma.resourceAcl.deleteMany({
        where: {
          clientId,
          subjectType: ResourceAclSubjectType.GROUP,
          subjectId: existing.id,
        },
      }),
      this.prisma.accessGroup.delete({ where: { id: existing.id } }),
    ]);
  }

  async listMembers(
    clientId: string,
    groupId: string,
  ): Promise<AccessGroupMemberRow[]> {
    await this.assertGroupInClient(clientId, groupId);
    const members = await this.prisma.accessGroupMember.findMany({
      where: { groupId, clientId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      createdAt: m.createdAt,
    }));
  }

  async addMember(
    clientId: string,
    groupId: string,
    userId: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<AccessGroupMemberRow> {
    const group = await this.assertGroupInClient(clientId, groupId);
    await this.assertActiveClientUser(clientId, userId);
    try {
      const m = await this.prisma.accessGroupMember.create({
        data: {
          groupId: group.id,
          userId,
          clientId: group.clientId,
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      });
      await this.logEvent('access_group.member_added', {
        clientId,
        groupId: group.id,
        input: {
          newValue: {
            userId: m.userId,
            email: m.user.email,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
          },
        },
        context,
      });
      return {
        membershipId: m.id,
        userId: m.userId,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        createdAt: m.createdAt,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Cet utilisateur est déjà membre du groupe');
      }
      throw e;
    }
  }

  async removeMember(
    clientId: string,
    groupId: string,
    userId: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    await this.assertGroupInClient(clientId, groupId);
    const member = await this.prisma.accessGroupMember.findFirst({
      where: { groupId, userId, clientId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!member) {
      throw new NotFoundException('Membre non trouvé dans ce groupe');
    }
    await this.logEvent('access_group.member_removed', {
      clientId,
      groupId,
      input: {
        oldValue: {
          userId: member.userId,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
        },
      },
      context,
    });
    await this.prisma.accessGroupMember.delete({
      where: { id: member.id },
    });
  }

  private async assertGroupInClient(
    clientId: string,
    groupId: string,
  ): Promise<{ id: string; clientId: string }> {
    const g = await this.prisma.accessGroup.findFirst({
      where: { id: groupId, clientId },
      select: { id: true, clientId: true },
    });
    if (!g) {
      throw new NotFoundException('Groupe non trouvé pour ce client');
    }
    return g;
  }

  private async assertActiveClientUser(
    clientId: string,
    userId: string,
  ): Promise<void> {
    const cu = await this.prisma.clientUser.findFirst({
      where: {
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!cu) {
      throw new ForbiddenException(
        "L'utilisateur n'est pas un membre actif de ce client",
      );
    }
  }

  private rethrowUniqueName(e: unknown): void {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Un groupe portant ce nom existe déjà');
    }
  }

  private async logEvent(
    action: string,
    params: {
      clientId: string;
      groupId: string;
      input: Pick<CreateAuditLogInput, 'oldValue' | 'newValue'>;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, groupId, input, context } = params;
    const base: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'access_group',
      resourceId: groupId,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
      ...input,
    };
    await this.auditLogs.create(base);
  }
}
