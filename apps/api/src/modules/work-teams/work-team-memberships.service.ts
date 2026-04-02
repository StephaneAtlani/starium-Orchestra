import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkTeamStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditMeta } from './work-teams.service';
import { AddWorkTeamMemberDto } from './dto/add-work-team-member.dto';
import { ListCollaboratorWorkTeamsQueryDto } from './dto/list-collaborator-work-teams.query.dto';
import { ListWorkTeamMembersQueryDto } from './dto/list-work-team-members.query.dto';
import { UpdateWorkTeamMemberDto } from './dto/update-work-team-member.dto';
import { WorkTeamsService } from './work-teams.service';

@Injectable()
export class WorkTeamMembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly workTeams: WorkTeamsService,
  ) {}

  async listMembers(
    clientId: string,
    workTeamId: string,
    query: ListWorkTeamMembersQueryDto,
  ) {
    await this.workTeams.assertTeamInClient(clientId, workTeamId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where: Prisma.WorkTeamMembershipWhereInput = {
      clientId,
      workTeamId,
    };

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.collaborator = {
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workTeamMembership.count({ where }),
      this.prisma.workTeamMembership.findMany({
        where,
        orderBy: { collaborator: { displayName: 'asc' } },
        skip: offset,
        take: limit,
        include: {
          collaborator: {
            select: { displayName: true, email: true },
          },
        },
      }),
    ]);

    const items = rows.map((m) => ({
      id: m.id,
      workTeamId: m.workTeamId,
      collaboratorId: m.collaboratorId,
      role: m.role,
      clientId: m.clientId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      collaboratorDisplayName: m.collaborator.displayName,
      collaboratorEmail: m.collaborator.email,
    }));

    return { items, total, limit, offset };
  }

  async addMember(
    clientId: string,
    workTeamId: string,
    dto: AddWorkTeamMemberDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const team = await this.prisma.workTeam.findFirst({
      where: { id: workTeamId, clientId },
    });
    if (!team) {
      throw new NotFoundException('Equipe introuvable');
    }
    if (team.status === WorkTeamStatus.ARCHIVED) {
      throw new ConflictException('Equipe archivee');
    }

    const collab = await this.prisma.collaborator.findFirst({
      where: { id: dto.collaboratorId, clientId },
      select: { id: true },
    });
    if (!collab) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    try {
      const created = await this.prisma.workTeamMembership.create({
        data: {
          clientId,
          workTeamId,
          collaboratorId: dto.collaboratorId,
          role: dto.role,
        },
        include: {
          collaborator: {
            select: { displayName: true, email: true },
          },
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: actorUserId,
        action: 'work_team.member_added',
        resourceType: 'work_team_membership',
        resourceId: created.id,
        newValue: {
          workTeamId,
          collaboratorId: dto.collaboratorId,
          role: dto.role,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });

      return {
        id: created.id,
        workTeamId: created.workTeamId,
        collaboratorId: created.collaboratorId,
        role: created.role,
        clientId: created.clientId,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        collaboratorDisplayName: created.collaborator.displayName,
        collaboratorEmail: created.collaborator.email,
      };
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Membre deja present dans cette equipe');
      }
      throw e;
    }
  }

  async updateMember(
    clientId: string,
    workTeamId: string,
    membershipId: string,
    dto: UpdateWorkTeamMemberDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const m = await this.prisma.workTeamMembership.findFirst({
      where: { id: membershipId, clientId, workTeamId },
    });
    if (!m) {
      throw new NotFoundException('Rattachement introuvable');
    }

    const updated = await this.prisma.workTeamMembership.update({
      where: { id: m.id },
      data: { role: dto.role },
      include: {
        collaborator: { select: { displayName: true, email: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'work_team.member_updated',
      resourceType: 'work_team_membership',
      resourceId: updated.id,
      oldValue: { role: m.role },
      newValue: { role: dto.role },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return {
      id: updated.id,
      workTeamId: updated.workTeamId,
      collaboratorId: updated.collaboratorId,
      role: updated.role,
      clientId: updated.clientId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      collaboratorDisplayName: updated.collaborator.displayName,
      collaboratorEmail: updated.collaborator.email,
    };
  }

  async removeMember(
    clientId: string,
    workTeamId: string,
    membershipId: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const m = await this.prisma.workTeamMembership.findFirst({
      where: { id: membershipId, clientId, workTeamId },
    });
    if (!m) {
      throw new NotFoundException('Rattachement introuvable');
    }

    await this.prisma.workTeamMembership.delete({ where: { id: m.id } });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'work_team.member_removed',
      resourceType: 'work_team_membership',
      resourceId: m.id,
      oldValue: {
        workTeamId: m.workTeamId,
        collaboratorId: m.collaboratorId,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
  }

  async listTeamsForCollaborator(
    clientId: string,
    collaboratorId: string,
    query: ListCollaboratorWorkTeamsQueryDto,
  ) {
    const collab = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorId, clientId },
      select: { id: true },
    });
    if (!collab) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where: Prisma.WorkTeamMembershipWhereInput = {
      clientId,
      collaboratorId,
    };

    if (!query.includeArchived) {
      where.workTeam = { status: WorkTeamStatus.ACTIVE };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workTeamMembership.count({ where }),
      this.prisma.workTeamMembership.findMany({
        where,
        orderBy: { workTeam: { name: 'asc' } },
        skip: offset,
        take: limit,
        include: { workTeam: true },
      }),
    ]);

    const items = rows.map((m) => ({
      id: m.workTeam.id,
      clientId: m.workTeam.clientId,
      name: m.workTeam.name,
      code: m.workTeam.code,
      parentId: m.workTeam.parentId,
      status: m.workTeam.status,
      archivedAt: m.workTeam.archivedAt,
      sortOrder: m.workTeam.sortOrder,
      leadCollaboratorId: m.workTeam.leadCollaboratorId,
      createdAt: m.workTeam.createdAt,
      updatedAt: m.workTeam.updatedAt,
      membershipId: m.id,
      membershipRole: m.role,
    }));

    return { items, total, limit, offset };
  }
}
