import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import {
  diffAuditSnapshots,
  omitKeysFromDiff,
  projectRiskEntityAuditSnapshot,
  projectRiskLevelSnapshot,
} from './project-audit-serialize';
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
      action: PROJECT_AUDIT_ACTION.PROJECT_RISK_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
      resourceId: created.id,
      newValue: projectRiskEntityAuditSnapshot(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

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
    if (dto.ownerUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }

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

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    const oldSnap = projectRiskEntityAuditSnapshot(existing);
    const newSnap = projectRiskEntityAuditSnapshot(updated);
    let { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);
    const levelChanged =
      existing.probability !== updated.probability ||
      existing.impact !== updated.impact;
    if (levelChanged) {
      ({ oldValue, newValue } = omitKeysFromDiff(oldValue, newValue, [
        'probability',
        'impact',
      ]));
    }

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
        resourceId: riskId,
        oldValue,
        newValue,
        ...meta,
      });
    }

    if (levelChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_LEVEL_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
        resourceId: riskId,
        oldValue: projectRiskLevelSnapshot(existing),
        newValue: projectRiskLevelSnapshot(updated),
        ...meta,
      });
    }

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
      action: PROJECT_AUDIT_ACTION.PROJECT_RISK_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
      resourceId: riskId,
      oldValue: projectRiskEntityAuditSnapshot(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
