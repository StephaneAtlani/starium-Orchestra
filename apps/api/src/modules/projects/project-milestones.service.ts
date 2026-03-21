import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import {
  diffAuditSnapshots,
  projectMilestoneEntityAuditSnapshot,
} from './project-audit-serialize';
import { ProjectsService } from './projects.service';
import { CreateProjectMilestoneDto } from './dto/create-project-milestone.dto';
import { CreateRetroplanMacroDto } from './dto/create-retroplan-macro.dto';
import { UpdateProjectMilestoneDto } from './dto/update-project-milestone.dto';
import {
  parseIsoDateOnly,
  subtractCalendarDaysFromUtcNoon,
} from './lib/project-retroplan-macro.util';

@Injectable()
export class ProjectMilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectMilestone.findMany({
      where: { clientId, projectId },
      orderBy: { targetDate: 'asc' },
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectMilestoneDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const created = await this.prisma.projectMilestone.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        targetDate: new Date(dto.targetDate),
        actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        status: dto.status ?? 'PLANNED',
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
      resourceId: created.id,
      newValue: projectMilestoneEntityAuditSnapshot(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return created;
  }

  /**
   * Crée plusieurs jalons à partir d’une date de fin et d’écarts en jours avant cette fin
   * (rétroplanning macro). Chaque jalon est persisté comme un `ProjectMilestone` standard.
   */
  async createRetroplanMacro(
    clientId: string,
    projectId: string,
    dto: CreateRetroplanMacroDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    let anchor: Date;
    try {
      anchor = parseIsoDateOnly(dto.anchorEndDate);
    } catch {
      throw new BadRequestException('Invalid anchorEndDate');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const step of dto.steps) {
        const targetDate = subtractCalendarDaysFromUtcNoon(anchor, step.daysBeforeEnd);
        const row = await tx.projectMilestone.create({
          data: {
            clientId,
            projectId,
            name: step.name.trim(),
            targetDate,
            actualDate: null,
            status: 'PLANNED',
          },
        });
        rows.push(row);
      }
      return rows;
    });

    for (const row of created) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_CREATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
        resourceId: row.id,
        newValue: projectMilestoneEntityAuditSnapshot(row),
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateProjectMilestoneDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Milestone not found');
    }

    const updated = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.targetDate !== undefined && {
          targetDate: new Date(dto.targetDate),
        }),
        ...(dto.actualDate !== undefined && {
          actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    const oldSnap = projectMilestoneEntityAuditSnapshot(existing);
    const newSnap = projectMilestoneEntityAuditSnapshot(updated);
    const { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
        resourceId: milestoneId,
        oldValue,
        newValue,
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return updated;
  }

  async delete(
    clientId: string,
    projectId: string,
    milestoneId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Milestone not found');
    }
    await this.prisma.projectMilestone.delete({ where: { id: milestoneId } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
      resourceId: milestoneId,
      oldValue: projectMilestoneEntityAuditSnapshot(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
