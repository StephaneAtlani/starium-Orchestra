import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ProjectsService } from './projects.service';
import { CreateProjectRiskDto } from './dto/create-project-risk.dto';
import { UpdateProjectRiskDto } from './dto/update-project-risk.dto';

@Injectable()
export class ProjectRisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectRisk.findMany({
      where: { clientId, projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectRiskDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertClientUser(clientId, dto.ownerUserId);

    const created = await this.prisma.projectRisk.create({
      data: {
        clientId,
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        probability: dto.probability,
        impact: dto.impact,
        actionPlan: dto.actionPlan?.trim() ?? null,
        ownerUserId: dto.ownerUserId ?? null,
        status: dto.status ?? 'OPEN',
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_risk.create',
      resourceType: 'ProjectRisk',
      resourceId: created.id,
      newValue: { projectId, title: created.title },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } satisfies CreateAuditLogInput);

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    riskId: string,
    dto: UpdateProjectRiskDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectRisk.findFirst({
      where: { id: riskId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Risk not found');
    }
    await this.projects.assertClientUser(clientId, dto.ownerUserId);

    const updated = await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.impact !== undefined && { impact: dto.impact }),
        ...(dto.actionPlan !== undefined && {
          actionPlan: dto.actionPlan?.trim() ?? null,
        }),
        ...(dto.ownerUserId !== undefined && {
          ownerUserId: dto.ownerUserId ?? null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.reviewDate !== undefined && {
          reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        }),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_risk.update',
      resourceType: 'ProjectRisk',
      resourceId: riskId,
      newValue: dto,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return updated;
  }

  async delete(
    clientId: string,
    projectId: string,
    riskId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectRisk.findFirst({
      where: { id: riskId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Risk not found');
    }
    await this.prisma.projectRisk.delete({ where: { id: riskId } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_risk.delete',
      resourceType: 'ProjectRisk',
      resourceId: riskId,
      oldValue: { title: existing.title },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
