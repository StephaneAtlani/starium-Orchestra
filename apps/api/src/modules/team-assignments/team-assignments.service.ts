import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityTaxonomyKind,
  CollaboratorStatus,
  Prisma,
  TeamResourceAssignment,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateTeamResourceAssignmentDto } from './dto/create-team-resource-assignment.dto';
import { ListTeamResourceAssignmentsQueryDto } from './dto/list-team-resource-assignments.query.dto';
import { UpdateTeamResourceAssignmentDto } from './dto/update-team-resource-assignment.dto';

export type TeamResourceAssignmentResponse = {
  id: string;
  clientId: string;
  collaboratorId: string;
  collaboratorDisplayName: string;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeKind: ActivityTaxonomyKind;
  projectTeamRoleId: string | null;
  roleLabel: string;
  startDate: string;
  endDate: string | null;
  allocationPercent: number;
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

function startOfUtcDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function endOfUtcDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

@Injectable()
export class TeamAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private toResponse(
    row: TeamResourceAssignment & {
      collaborator: { displayName: string };
      project: { name: string; code: string } | null;
      activityType: { name: string; kind: ActivityTaxonomyKind };
    },
  ): TeamResourceAssignmentResponse {
    return {
      id: row.id,
      clientId: row.clientId,
      collaboratorId: row.collaboratorId,
      collaboratorDisplayName: row.collaborator.displayName,
      projectId: row.projectId,
      projectName: row.project?.name ?? null,
      projectCode: row.project?.code ?? null,
      activityTypeId: row.activityTypeId,
      activityTypeName: row.activityType.name,
      activityTypeKind: row.activityType.kind,
      projectTeamRoleId: row.projectTeamRoleId,
      roleLabel: row.roleLabel,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate ? row.endDate.toISOString() : null,
      allocationPercent: Number(row.allocationPercent),
      notes: row.notes,
      cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private assertActivityKindMatchesProject(
    projectId: string | undefined | null,
    kind: ActivityTaxonomyKind,
  ): void {
    if (projectId) {
      if (kind !== ActivityTaxonomyKind.PROJECT) {
        throw new BadRequestException({
          error: 'ActivityTypeKindMismatch',
          message: 'With projectId, activityType.kind must be PROJECT',
        });
      }
    } else {
      if (
        kind === ActivityTaxonomyKind.PROJECT
      ) {
        throw new BadRequestException({
          error: 'ActivityTypeKindMismatch',
          message:
            'Without projectId, activityType.kind must not be PROJECT',
        });
      }
    }
  }

  private validateListTemporalQuery(
    query: ListTeamResourceAssignmentsQueryDto,
  ): void {
    const hasFrom = query.from !== undefined && query.from !== '';
    const hasTo = query.to !== undefined && query.to !== '';
    if (hasFrom !== hasTo) {
      throw new BadRequestException({
        error: 'InvalidDateWindow',
        message: 'from and to must be provided together or omitted',
      });
    }
    if (query.activeOn && (hasFrom || hasTo)) {
      throw new BadRequestException({
        error: 'TemporalFilterConflict',
        message: 'activeOn cannot be combined with from/to',
      });
    }
    if (hasFrom && hasTo && query.from! > query.to!) {
      throw new BadRequestException({
        error: 'InvalidDateWindow',
        message: 'from must be <= to',
      });
    }
  }

  async list(clientId: string, query: ListTeamResourceAssignmentsQueryDto) {
    this.validateListTemporalQuery(query);

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const where: Prisma.TeamResourceAssignmentWhereInput = { clientId };

    if (query.collaboratorId) {
      where.collaboratorId = query.collaboratorId;
    }
    if (query.projectId) {
      where.projectId = query.projectId;
    }
    if (query.activityTypeId) {
      where.activityTypeId = query.activityTypeId;
    }
    if (!query.includeCancelled) {
      where.cancelledAt = null;
    }

    if (query.activeOn) {
      const rangeStart = startOfUtcDay(query.activeOn);
      const rangeEnd = endOfUtcDay(query.activeOn);
      where.AND = [
        { startDate: { lte: rangeEnd } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: rangeStart } },
          ],
        },
      ];
    } else if (query.from && query.to) {
      const rangeStart = startOfUtcDay(query.from);
      const rangeEnd = endOfUtcDay(query.to);
      where.AND = [
        { startDate: { lte: rangeEnd } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: rangeStart } },
          ],
        },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.teamResourceAssignment.count({ where }),
      this.prisma.teamResourceAssignment.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
        include: {
          collaborator: { select: { displayName: true } },
          project: { select: { name: true, code: true } },
          activityType: { select: { name: true, kind: true } },
        },
      }),
    ]);

    return {
      items: rows.map((r) => this.toResponse(r)),
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
  ): Promise<TeamResourceAssignmentResponse> {
    const row = await this.prisma.teamResourceAssignment.findFirst({
      where: { id, clientId },
      include: {
        collaborator: { select: { displayName: true } },
        project: { select: { name: true, code: true } },
        activityType: { select: { name: true, kind: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Team resource assignment not found',
      });
    }
    return this.toResponse(row);
  }

  async create(
    clientId: string,
    dto: CreateTeamResourceAssignmentDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<TeamResourceAssignmentResponse> {
    const collaborator = await this.prisma.collaborator.findFirst({
      where: { id: dto.collaboratorId, clientId },
    });
    if (!collaborator) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Collaborator not found',
      });
    }
    if (collaborator.status !== CollaboratorStatus.ACTIVE) {
      throw new BadRequestException({
        error: 'CollaboratorNotActive',
        message: 'Collaborator must be ACTIVE',
      });
    }

    const activityType = await this.prisma.activityType.findFirst({
      where: { id: dto.activityTypeId, clientId },
    });
    if (!activityType) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Activity type not found',
      });
    }

    if (dto.projectId) {
      const p = await this.prisma.project.findFirst({
        where: { id: dto.projectId, clientId },
        select: { id: true },
      });
      if (!p) {
        throw new NotFoundException({
          error: 'NotFound',
          message: 'Project not found',
        });
      }
    }

    if (dto.projectTeamRoleId) {
      if (!dto.projectId) {
        throw new BadRequestException({
          error: 'ProjectTeamRoleRequiresProject',
          message: 'projectTeamRoleId requires projectId',
        });
      }
      const role = await this.prisma.projectTeamRole.findFirst({
        where: { id: dto.projectTeamRoleId, clientId },
        select: { id: true },
      });
      if (!role) {
        throw new NotFoundException({
          error: 'NotFound',
          message: 'Project team role not found',
        });
      }
    }

    this.assertActivityKindMatchesProject(dto.projectId ?? null, activityType.kind);

    const startDate = new Date(dto.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException({
        error: 'InvalidDate',
        message: 'startDate is invalid',
      });
    }
    let endDate: Date | null = null;
    if (dto.endDate !== undefined && dto.endDate !== '') {
      endDate = new Date(dto.endDate);
      if (Number.isNaN(endDate.getTime())) {
        throw new BadRequestException({
          error: 'InvalidDate',
          message: 'endDate is invalid',
        });
      }
      if (endDate < startDate) {
        throw new BadRequestException({
          error: 'InvalidDateRange',
          message: 'endDate must be >= startDate',
        });
      }
    }

    const created = await this.prisma.teamResourceAssignment.create({
      data: {
        clientId,
        collaboratorId: dto.collaboratorId,
        projectId: dto.projectId ?? null,
        activityTypeId: dto.activityTypeId,
        projectTeamRoleId: dto.projectTeamRoleId ?? null,
        roleLabel: dto.roleLabel.trim(),
        startDate,
        endDate,
        allocationPercent: new Prisma.Decimal(dto.allocationPercent),
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
      },
      include: {
        collaborator: { select: { displayName: true } },
        project: { select: { name: true, code: true } },
        activityType: { select: { name: true, kind: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'team_resource_assignment.created',
      resourceType: 'team_resource_assignment',
      resourceId: created.id,
      newValue: {
        collaboratorId: created.collaboratorId,
        projectId: created.projectId,
        activityTypeId: created.activityTypeId,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate?.toISOString() ?? null,
        allocationPercent: dto.allocationPercent,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateTeamResourceAssignmentDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<TeamResourceAssignmentResponse> {
    const existing = await this.prisma.teamResourceAssignment.findFirst({
      where: { id, clientId },
      include: {
        collaborator: { select: { displayName: true } },
        project: { select: { name: true, code: true } },
        activityType: { select: { name: true, kind: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Team resource assignment not found',
      });
    }
    if (existing.cancelledAt !== null) {
      throw new ConflictException({
        error: 'AssignmentCancelled',
        message: 'Cannot update a cancelled assignment',
      });
    }

    const collaboratorIdNext =
      dto.collaboratorId !== undefined ? dto.collaboratorId : existing.collaboratorId;
    const collaborator = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorIdNext, clientId },
    });
    if (!collaborator) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Collaborator not found',
      });
    }
    if (collaborator.status !== CollaboratorStatus.ACTIVE) {
      throw new BadRequestException({
        error: 'CollaboratorNotActive',
        message: 'Collaborator must be ACTIVE',
      });
    }

    const activityTypeIdNext =
      dto.activityTypeId !== undefined
        ? dto.activityTypeId
        : existing.activityTypeId;
    const activityType = await this.prisma.activityType.findFirst({
      where: { id: activityTypeIdNext, clientId },
    });
    if (!activityType) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Activity type not found',
      });
    }

    const projectIdNext =
      dto.projectId !== undefined ? dto.projectId ?? null : existing.projectId;

    if (projectIdNext) {
      const p = await this.prisma.project.findFirst({
        where: { id: projectIdNext, clientId },
        select: { id: true },
      });
      if (!p) {
        throw new NotFoundException({
          error: 'NotFound',
          message: 'Project not found',
        });
      }
    }

    const projectTeamRoleIdNext =
      dto.projectTeamRoleId !== undefined
        ? dto.projectTeamRoleId ?? null
        : existing.projectTeamRoleId;

    if (projectTeamRoleIdNext) {
      if (!projectIdNext) {
        throw new BadRequestException({
          error: 'ProjectTeamRoleRequiresProject',
          message: 'projectTeamRoleId requires projectId',
        });
      }
      const role = await this.prisma.projectTeamRole.findFirst({
        where: { id: projectTeamRoleIdNext, clientId },
        select: { id: true },
      });
      if (!role) {
        throw new NotFoundException({
          error: 'NotFound',
          message: 'Project team role not found',
        });
      }
    }

    this.assertActivityKindMatchesProject(projectIdNext, activityType.kind);

    const startDateNext =
      dto.startDate !== undefined ? new Date(dto.startDate) : existing.startDate;
    if (dto.startDate !== undefined && Number.isNaN(startDateNext.getTime())) {
      throw new BadRequestException({
        error: 'InvalidDate',
        message: 'startDate is invalid',
      });
    }

    let endDateNext: Date | null =
      dto.endDate !== undefined
        ? dto.endDate === '' || dto.endDate === null
          ? null
          : new Date(dto.endDate)
        : existing.endDate;
    if (dto.endDate !== undefined && dto.endDate !== '' && dto.endDate !== null) {
      if (Number.isNaN((endDateNext as Date).getTime())) {
        throw new BadRequestException({
          error: 'InvalidDate',
          message: 'endDate is invalid',
        });
      }
    }
    if (endDateNext && endDateNext < startDateNext) {
      throw new BadRequestException({
        error: 'InvalidDateRange',
        message: 'endDate must be >= startDate',
      });
    }

    const data: Prisma.TeamResourceAssignmentUpdateInput = {};
    if (dto.collaboratorId !== undefined) data.collaborator = { connect: { id: dto.collaboratorId } };
    if (dto.activityTypeId !== undefined) {
      data.activityType = { connect: { id: dto.activityTypeId } };
    }
    if (dto.projectId !== undefined) {
      data.project = dto.projectId
        ? { connect: { id: dto.projectId } }
        : { disconnect: true };
    }
    if (dto.projectTeamRoleId !== undefined) {
      data.projectTeamRole = dto.projectTeamRoleId
        ? { connect: { id: dto.projectTeamRoleId } }
        : { disconnect: true };
    }
    if (dto.roleLabel !== undefined) data.roleLabel = dto.roleLabel.trim();
    if (dto.startDate !== undefined) data.startDate = startDateNext;
    if (dto.endDate !== undefined) data.endDate = endDateNext;
    if (dto.allocationPercent !== undefined) {
      data.allocationPercent = new Prisma.Decimal(dto.allocationPercent);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() ? dto.notes.trim() : null;
    }

    const updated = await this.prisma.teamResourceAssignment.update({
      where: { id: existing.id },
      data,
      include: {
        collaborator: { select: { displayName: true } },
        project: { select: { name: true, code: true } },
        activityType: { select: { name: true, kind: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'team_resource_assignment.updated',
      resourceType: 'team_resource_assignment',
      resourceId: updated.id,
      oldValue: {
        startDate: existing.startDate.toISOString(),
        endDate: existing.endDate?.toISOString() ?? null,
        allocationPercent: Number(existing.allocationPercent),
      },
      newValue: {
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate?.toISOString() ?? null,
        allocationPercent: Number(updated.allocationPercent),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toResponse(updated);
  }

  async cancel(
    clientId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<TeamResourceAssignmentResponse> {
    const existing = await this.prisma.teamResourceAssignment.findFirst({
      where: { id, clientId },
      include: {
        collaborator: { select: { displayName: true } },
        project: { select: { name: true, code: true } },
        activityType: { select: { name: true, kind: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'NotFound',
        message: 'Team resource assignment not found',
      });
    }
    if (existing.cancelledAt !== null) {
      return this.toResponse(existing);
    }

    const updated = await this.prisma.teamResourceAssignment.update({
      where: { id: existing.id },
      data: { cancelledAt: new Date() },
      include: {
        collaborator: { select: { displayName: true } },
        project: { select: { name: true, code: true } },
        activityType: { select: { name: true, kind: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'team_resource_assignment.cancelled',
      resourceType: 'team_resource_assignment',
      resourceId: updated.id,
      oldValue: { cancelledAt: null },
      newValue: { cancelledAt: updated.cancelledAt?.toISOString() ?? null },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toResponse(updated);
  }
}
