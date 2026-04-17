import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectScenarioStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { RiskTaxonomyService } from '../risk-taxonomy/risk-taxonomy.service';
import { CreateProjectScenarioRiskDto } from './dto/create-project-scenario-risk.dto';
import { ListProjectScenarioRisksQueryDto } from './dto/list-project-scenario-risks.query.dto';
import { type ProjectScenarioRiskDto } from './dto/project-scenario-risk.dto';
import { type ProjectScenarioRiskSummaryDto } from './dto/project-scenario-risk-summary.dto';
import { UpdateProjectScenarioRiskDto } from './dto/update-project-scenario-risk.dto';

@Injectable()
export class ProjectScenarioRisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly riskTaxonomy: RiskTaxonomyService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    scenarioId: string,
    query: ListProjectScenarioRisksQueryDto,
  ): Promise<{
    items: ProjectScenarioRiskDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const where = { clientId, scenarioId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectScenarioRisk.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          riskType: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.projectScenarioRisk.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      limit,
      offset,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: CreateProjectScenarioRiskDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioRiskDto> {
    await this.assertScenarioMutable(clientId, projectId, scenarioId);
    const riskTypeId = this.normalizeNullableText(dto.riskTypeId);
    if (riskTypeId) {
      await this.riskTaxonomy.assertUsableRiskTypeForWrite(clientId, riskTypeId);
    }

    const created = await this.prisma.projectScenarioRisk.create({
      data: {
        clientId,
        scenarioId,
        riskTypeId,
        title: dto.title.trim(),
        description: this.normalizeNullableText(dto.description),
        probability: dto.probability,
        impact: dto.impact,
        criticalityScore: this.computeCriticalityScore(dto.probability, dto.impact),
        mitigationPlan: this.normalizeNullableText(dto.mitigationPlan),
        ownerLabel: this.normalizeNullableText(dto.ownerLabel),
      },
      include: {
        riskType: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_RISK_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_RISK,
      resourceId: created.id,
      newValue: {
        scenarioId,
        riskTypeId: created.riskTypeId,
        title: created.title,
        probability: created.probability,
        impact: created.impact,
        criticalityScore: created.criticalityScore,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toDto(created);
  }

  async update(
    clientId: string,
    projectId: string,
    scenarioId: string,
    riskId: string,
    dto: UpdateProjectScenarioRiskDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioRiskDto> {
    await this.assertScenarioMutable(clientId, projectId, scenarioId);
    const existing = await this.prisma.projectScenarioRisk.findFirst({
      where: { id: riskId, clientId, scenarioId },
    });
    if (!existing) {
      throw new NotFoundException('Project scenario risk not found');
    }

    let riskTypeId = existing.riskTypeId;
    if (dto.riskTypeId !== undefined) {
      riskTypeId = this.normalizeNullableText(dto.riskTypeId);
      if (riskTypeId) {
        await this.riskTaxonomy.assertUsableRiskTypeForWrite(clientId, riskTypeId);
      }
    }

    const nextProbability = dto.probability ?? existing.probability;
    const nextImpact = dto.impact ?? existing.impact;

    const updated = await this.prisma.projectScenarioRisk.update({
      where: { id: riskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: this.normalizeNullableText(dto.description) }
          : {}),
        ...(dto.probability !== undefined ? { probability: dto.probability } : {}),
        ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
        ...(dto.riskTypeId !== undefined ? { riskTypeId } : {}),
        ...(dto.mitigationPlan !== undefined
          ? { mitigationPlan: this.normalizeNullableText(dto.mitigationPlan) }
          : {}),
        ...(dto.ownerLabel !== undefined
          ? { ownerLabel: this.normalizeNullableText(dto.ownerLabel) }
          : {}),
        criticalityScore: this.computeCriticalityScore(nextProbability, nextImpact),
      },
      include: {
        riskType: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_RISK_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_RISK,
      resourceId: updated.id,
      oldValue: {
        riskTypeId: existing.riskTypeId,
        title: existing.title,
        probability: existing.probability,
        impact: existing.impact,
        criticalityScore: existing.criticalityScore,
      },
      newValue: {
        riskTypeId: updated.riskTypeId,
        title: updated.title,
        probability: updated.probability,
        impact: updated.impact,
        criticalityScore: updated.criticalityScore,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toDto(updated);
  }

  async remove(
    clientId: string,
    projectId: string,
    scenarioId: string,
    riskId: string,
    context?: AuditContext,
  ): Promise<void> {
    await this.assertScenarioMutable(clientId, projectId, scenarioId);
    const existing = await this.prisma.projectScenarioRisk.findFirst({
      where: { id: riskId, clientId, scenarioId },
    });
    if (!existing) {
      throw new NotFoundException('Project scenario risk not found');
    }
    await this.prisma.projectScenarioRisk.delete({ where: { id: riskId } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_RISK_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_RISK,
      resourceId: riskId,
      oldValue: {
        riskTypeId: existing.riskTypeId,
        title: existing.title,
        probability: existing.probability,
        impact: existing.impact,
        criticalityScore: existing.criticalityScore,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async getSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioRiskSummaryDto> {
    return this.buildRiskSummary(clientId, projectId, scenarioId);
  }

  async buildRiskSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioRiskSummaryDto> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const rows = await this.prisma.projectScenarioRisk.findMany({
      where: { clientId, scenarioId },
      select: { criticalityScore: true },
    });

    if (rows.length === 0) {
      return {
        criticalRiskCount: 0,
        averageCriticality: null,
        maxCriticality: null,
      };
    }

    let criticalRiskCount = 0;
    let maxCriticality = 0;
    let total = 0;

    for (const row of rows) {
      total += row.criticalityScore;
      if (row.criticalityScore >= 15) criticalRiskCount += 1;
      if (row.criticalityScore > maxCriticality) maxCriticality = row.criticalityScore;
    }

    return {
      criticalRiskCount,
      averageCriticality: Number((total / rows.length).toFixed(2)),
      maxCriticality,
    };
  }

  private async assertScenarioMutable(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<void> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    if (scenario.status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be edited');
    }
  }

  private async getScenarioForScope(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ) {
    const scenario = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
      select: { id: true, status: true },
    });
    if (!scenario) {
      throw new NotFoundException('Project scenario not found');
    }
    return scenario;
  }

  private computeCriticalityScore(probability: number, impact: number): number {
    return probability * impact;
  }

  private normalizeNullableText(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private toDto(
    row: {
      id: string;
      clientId: string;
      scenarioId: string;
      riskTypeId: string | null;
      title: string;
      description: string | null;
      probability: number;
      impact: number;
      criticalityScore: number;
      mitigationPlan: string | null;
      ownerLabel: string | null;
      createdAt: Date;
      updatedAt: Date;
      riskType?: { id: string; code: string; name: string } | null;
    },
  ): ProjectScenarioRiskDto {
    return {
      id: row.id,
      clientId: row.clientId,
      scenarioId: row.scenarioId,
      riskTypeId: row.riskTypeId ?? null,
      title: row.title,
      description: row.description ?? null,
      probability: row.probability,
      impact: row.impact,
      criticalityScore: row.criticalityScore,
      mitigationPlan: row.mitigationPlan ?? null,
      ownerLabel: row.ownerLabel ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      riskType: row.riskType
        ? {
            id: row.riskType.id,
            code: row.riskType.code,
            label: row.riskType.name,
          }
        : null,
    };
  }
}
