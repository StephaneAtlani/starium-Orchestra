import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ProjectRiskStatus, ProjectRiskTreatmentStrategy } from '@prisma/client';
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
import { applyCriticalityFromProbabilityImpact } from './lib/project-risk-criticality.util';
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

  private async assertComplianceRequirementForClient(
    clientId: string,
    requirementId: string | null | undefined,
  ): Promise<void> {
    if (requirementId == null || requirementId === '') return;
    const req = await this.prisma.complianceRequirement.findFirst({
      where: { id: requirementId, framework: { clientId } },
      select: { id: true },
    });
    if (!req) {
      throw new BadRequestException('Exigence de conformité invalide pour ce client');
    }
  }

  private async nextRiskCode(clientId: string, projectId: string): Promise<string> {
    const existing = await this.prisma.projectRisk.findMany({
      where: { clientId, projectId },
      select: { code: true },
    });
    let maxN = 0;
    for (const r of existing) {
      const m = /^R-(\d+)$/.exec(r.code);
      if (m) maxN = Math.max(maxN, parseInt(m[1]!, 10));
    }
    return `R-${String(maxN + 1).padStart(3, '0')}`;
  }

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectRisk.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(clientId: string, projectId: string, riskId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const risk = await this.prisma.projectRisk.findFirst({
      where: { id: riskId, clientId, projectId },
    });
    if (!risk) throw new NotFoundException('Risk not found');
    return risk;
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectRiskDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertClientUser(clientId, dto.ownerUserId);
    await this.assertComplianceRequirementForClient(clientId, dto.complianceRequirementId);

    const code =
      dto.code?.trim() ||
      (await this.nextRiskCode(clientId, projectId));
    const dup = await this.prisma.projectRisk.findFirst({
      where: { projectId, code },
      select: { id: true },
    });
    if (dup) {
      throw new BadRequestException('Code risque déjà utilisé sur ce projet');
    }

    const { criticalityScore, criticalityLevel } = applyCriticalityFromProbabilityImpact(
      dto.probability,
      dto.impact,
    );
    const status = dto.status ?? 'OPEN';
    const closedAt =
      status === 'CLOSED' ? new Date() : null;

    const data: Prisma.ProjectRiskCreateInput = {
      client: { connect: { id: clientId } },
      project: { connect: { id: projectId } },
      code,
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category?.trim() ?? null,
      threatSource: dto.threatSource.trim(),
      businessImpact: dto.businessImpact.trim(),
      likelihoodJustification: dto.likelihoodJustification?.trim() ?? null,
      ...(dto.impactCategory != null
        ? { impactCategory: dto.impactCategory }
        : {}),
      probability: dto.probability,
      impact: dto.impact,
      criticalityScore,
      criticalityLevel,
      mitigationPlan: dto.mitigationPlan?.trim() ?? null,
      contingencyPlan: dto.contingencyPlan?.trim() ?? null,
      ...(dto.ownerUserId
        ? { owner: { connect: { id: dto.ownerUserId } } }
        : {}),
      status,
      reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      detectedAt: dto.detectedAt ? new Date(dto.detectedAt) : null,
      closedAt,
      sortOrder: dto.sortOrder ?? 0,
      treatmentStrategy: dto.treatmentStrategy,
      residualRiskLevel: dto.residualRiskLevel ?? null,
      residualJustification: dto.residualJustification?.trim() ?? null,
    };
    if (dto.complianceRequirementId) {
      data.complianceRequirement = {
        connect: { id: dto.complianceRequirementId },
      };
    }

    const created = await this.prisma.projectRisk.create({ data });

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
    if (dto.complianceRequirementId !== undefined) {
      await this.assertComplianceRequirementForClient(clientId, dto.complianceRequirementId);
    }

    if (dto.description !== undefined && dto.description.trim() === '') {
      throw new BadRequestException('Le scénario structuré ne peut pas être vide.');
    }
    if (dto.threatSource !== undefined && dto.threatSource.trim() === '') {
      throw new BadRequestException('La source de menace ne peut pas être vide.');
    }
    if (dto.businessImpact !== undefined && dto.businessImpact.trim() === '') {
      throw new BadRequestException('L’impact métier ne peut pas être vide.');
    }

    const mergedStatus = dto.status ?? existing.status;
    const mergedTreatment: ProjectRiskTreatmentStrategy =
      dto.treatmentStrategy !== undefined ? dto.treatmentStrategy : existing.treatmentStrategy;
    if (mergedStatus !== ProjectRiskStatus.CLOSED && mergedTreatment == null) {
      throw new BadRequestException(
        'Stratégie de traitement obligatoire pour un risque non clôturé.',
      );
    }

    const prob = dto.probability ?? existing.probability;
    const imp = dto.impact ?? existing.impact;
    const { criticalityScore, criticalityLevel } =
      applyCriticalityFromProbabilityImpact(prob, imp);

    let closedAt = existing.closedAt;
    if (dto.status !== undefined) {
      if (dto.status === 'CLOSED' && existing.status !== 'CLOSED') {
        closedAt = new Date();
      } else if (dto.status !== 'CLOSED') {
        closedAt = null;
      }
    }

    if (dto.code !== undefined && dto.code.trim() !== existing.code) {
      const dup = await this.prisma.projectRisk.findFirst({
        where: { projectId, code: dto.code.trim(), NOT: { id: riskId } },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('Code risque déjà utilisé sur ce projet');
    }

    const updated = await this.prisma.projectRisk.update({
      where: { id: riskId },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.category !== undefined && {
          category: dto.category?.trim() ?? null,
        }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.impact !== undefined && { impact: dto.impact }),
        criticalityScore,
        criticalityLevel,
        ...(dto.mitigationPlan !== undefined && {
          mitigationPlan: dto.mitigationPlan?.trim() ?? null,
        }),
        ...(dto.contingencyPlan !== undefined && {
          contingencyPlan: dto.contingencyPlan?.trim() ?? null,
        }),
        ...(dto.ownerUserId !== undefined &&
          (dto.ownerUserId
            ? { owner: { connect: { id: dto.ownerUserId } } }
            : { owner: { disconnect: true } })),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.reviewDate !== undefined && {
          reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.detectedAt !== undefined && {
          detectedAt: dto.detectedAt ? new Date(dto.detectedAt) : null,
        }),
        ...(dto.status !== undefined && { closedAt }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.treatmentStrategy !== undefined && {
          treatmentStrategy: dto.treatmentStrategy,
        }),
        ...(dto.residualRiskLevel !== undefined && {
          residualRiskLevel: dto.residualRiskLevel ?? null,
        }),
        ...(dto.residualJustification !== undefined && {
          residualJustification: dto.residualJustification?.trim() ?? null,
        }),
        ...(dto.complianceRequirementId !== undefined &&
          (dto.complianceRequirementId
            ? {
                complianceRequirement: {
                  connect: { id: dto.complianceRequirementId },
                },
              }
            : { complianceRequirement: { disconnect: true } })),
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
      existing.criticalityScore !== updated.criticalityScore ||
      existing.criticalityLevel !== updated.criticalityLevel;
    if (levelChanged) {
      ({ oldValue, newValue } = omitKeysFromDiff(oldValue, newValue, [
        'probability',
        'impact',
        'criticalityScore',
        'criticalityLevel',
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

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_RISK_STATUS_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
        resourceId: riskId,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        ...meta,
      });
      if (updated.status === 'CLOSED' && existing.status !== 'CLOSED') {
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: PROJECT_AUDIT_ACTION.PROJECT_RISK_CLOSED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
          resourceId: riskId,
          newValue: { closedAt: updated.closedAt?.toISOString() ?? null },
          ...meta,
        });
      }
      if (updated.status !== 'CLOSED' && existing.status === 'CLOSED') {
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: PROJECT_AUDIT_ACTION.PROJECT_RISK_REOPENED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_RISK,
          resourceId: riskId,
          newValue: { status: updated.status },
          ...meta,
        });
      }
    }

    return updated;
  }

  async updateStatus(
    clientId: string,
    projectId: string,
    riskId: string,
    status: ProjectRiskStatus,
    context?: AuditContext,
  ) {
    return this.update(clientId, projectId, riskId, { status }, context);
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
