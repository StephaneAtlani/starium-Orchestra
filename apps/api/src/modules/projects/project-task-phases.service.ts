import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PROJECT_AUDIT_ACTION, PROJECT_AUDIT_RESOURCE_TYPE } from './project-audit.constants';
import { CreateProjectTaskPhaseDto } from './dto/create-project-task-phase.dto';
import { ReorderProjectTaskPhasesDto } from './dto/reorder-project-task-phases.dto';
import { UpdateProjectTaskPhaseDto } from './dto/update-project-task-phase.dto';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectTaskPhasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectTaskPhase.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTaskPhaseDto,
    actorUserId?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const maxSort = await this.prisma.projectTaskPhase.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });
    const created = await this.prisma.projectTaskPhase.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_PHASE_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK_PHASE,
      resourceId: created.id,
      newValue: created,
      ...meta,
    });
    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    phaseId: string,
    dto: UpdateProjectTaskPhaseDto,
    actorUserId?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTaskPhase.findFirst({
      where: { id: phaseId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Task phase not found');
    const updated = await this.prisma.projectTaskPhase.update({
      where: { id: phaseId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_PHASE_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK_PHASE,
      resourceId: updated.id,
      oldValue: existing,
      newValue: updated,
      ...meta,
    });
    return updated;
  }

  async reorder(
    clientId: string,
    projectId: string,
    dto: ReorderProjectTaskPhasesDto,
    actorUserId?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const ids = dto.items.map((i) => i.id);
    const phases = await this.prisma.projectTaskPhase.findMany({
      where: { clientId, projectId, id: { in: ids } },
      select: { id: true },
    });
    if (phases.length !== ids.length) {
      throw new BadRequestException('One or more phases are not in this project');
    }
    await this.prisma.$transaction(
      dto.items.map((i) =>
        this.prisma.projectTaskPhase.update({
          where: { id: i.id },
          data: { sortOrder: i.sortOrder },
        }),
      ),
    );
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_PHASE_REORDERED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK_PHASE,
      newValue: { items: dto.items },
      ...meta,
    });
    return { success: true };
  }

  async delete(
    clientId: string,
    projectId: string,
    phaseId: string,
    actorUserId?: string,
    meta?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTaskPhase.findFirst({
      where: { id: phaseId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Task phase not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTask.updateMany({
        where: { clientId, projectId, phaseId },
        data: { phaseId: null },
      });
      await tx.projectTaskPhase.delete({ where: { id: phaseId } });
      const remaining = await tx.projectTaskPhase.findMany({
        where: { clientId, projectId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      for (const [idx, phase] of remaining.entries()) {
        await tx.projectTaskPhase.update({
          where: { id: phase.id },
          data: { sortOrder: idx },
        });
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_PHASE_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK_PHASE,
      resourceId: phaseId,
      oldValue: existing,
      ...meta,
    });
    return { success: true };
  }
}
