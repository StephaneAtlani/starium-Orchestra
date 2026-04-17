import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectScenarioStatus, ResourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { CreateProjectScenarioResourcePlanDto } from './dto/create-project-scenario-resource-plan.dto';
import { ListProjectScenarioResourcePlansQueryDto } from './dto/list-project-scenario-resource-plans.query.dto';
import { UpdateProjectScenarioResourcePlanDto } from './dto/update-project-scenario-resource-plan.dto';

export type ProjectScenarioResourcePlanDto = {
  id: string;
  clientId: string;
  scenarioId: string;
  resourceId: string;
  roleLabel: string | null;
  allocationPct: string | null;
  plannedDays: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  resource: {
    id: string;
    name: string;
    code: string | null;
    type: ResourceType;
  };
};

export type ProjectScenarioResourceSummaryDto = {
  plannedDaysTotal: string;
  plannedCostTotal: string;
  plannedFtePeak: string | null;
  distinctResources: number;
};

type ResourcePlanRecord = Prisma.ProjectScenarioResourcePlanGetPayload<{
  include: {
    resource: {
      select: { id: true; name: true; code: true; type: true; dailyRate: true };
    };
  };
}>;

@Injectable()
export class ProjectScenarioResourcePlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    scenarioId: string,
    query: ListProjectScenarioResourcePlansQueryDto,
  ): Promise<{
    items: ProjectScenarioResourcePlanDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const where: Prisma.ProjectScenarioResourcePlanWhereInput = { clientId, scenarioId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectScenarioResourcePlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          resource: { select: { id: true, name: true, code: true, type: true, dailyRate: true } },
        },
      }),
      this.prisma.projectScenarioResourcePlan.count({ where }),
    ]);

    return { items: items.map((item) => this.serializePlan(item)), total, limit, offset };
  }

  async create(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: CreateProjectScenarioResourcePlanDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioResourcePlanDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);

    const resource = await this.getResourceForClient(clientId, dto.resourceId);
    this.assertDateRange(dto.startDate ?? null, dto.endDate ?? null);
    const allocationPct = this.parseAllocationPct(dto.allocationPct);
    const plannedDays = this.parsePlannedDays(dto.plannedDays);

    const created = await this.prisma.projectScenarioResourcePlan.create({
      data: {
        clientId,
        scenarioId: scenario.id,
        resourceId: resource.id,
        roleLabel: this.normalizeNullableText(dto.roleLabel),
        allocationPct,
        plannedDays,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        notes: this.normalizeNullableText(dto.notes),
      },
      include: {
        resource: { select: { id: true, name: true, code: true, type: true, dailyRate: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_RESOURCE_PLAN_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_RESOURCE_PLAN,
      resourceId: created.id,
      newValue: this.auditPayload(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.serializePlan(created);
  }

  async update(
    clientId: string,
    projectId: string,
    scenarioId: string,
    planId: string,
    dto: UpdateProjectScenarioResourcePlanDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioResourcePlanDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);
    const existing = await this.getPlanForScope(clientId, scenarioId, planId);

    const nextResourceId = dto.resourceId ?? existing.resourceId;
    const resource = await this.getResourceForClient(clientId, nextResourceId);
    const nextStartDate = dto.startDate === undefined ? existing.startDate : dto.startDate;
    const nextEndDate = dto.endDate === undefined ? existing.endDate : dto.endDate;
    this.assertDateRange(nextStartDate ?? null, nextEndDate ?? null);

    const updated = await this.prisma.projectScenarioResourcePlan.update({
      where: { id: existing.id },
      data: {
        ...(dto.resourceId !== undefined ? { resourceId: resource.id } : {}),
        ...(dto.roleLabel !== undefined
          ? { roleLabel: this.normalizeNullableText(dto.roleLabel) }
          : {}),
        ...(dto.allocationPct !== undefined
          ? { allocationPct: this.parseAllocationPct(dto.allocationPct) }
          : {}),
        ...(dto.plannedDays !== undefined
          ? { plannedDays: this.parsePlannedDays(dto.plannedDays) }
          : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ?? null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ?? null } : {}),
        ...(dto.notes !== undefined ? { notes: this.normalizeNullableText(dto.notes) } : {}),
      },
      include: {
        resource: { select: { id: true, name: true, code: true, type: true, dailyRate: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_RESOURCE_PLAN_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_RESOURCE_PLAN,
      resourceId: updated.id,
      oldValue: this.auditPayload(existing),
      newValue: this.auditPayload(updated),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.serializePlan(updated);
  }

  async remove(
    clientId: string,
    projectId: string,
    scenarioId: string,
    planId: string,
    context?: AuditContext,
  ): Promise<void> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);
    const existing = await this.getPlanForScope(clientId, scenarioId, planId);

    await this.prisma.projectScenarioResourcePlan.delete({ where: { id: existing.id } });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_RESOURCE_PLAN_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_RESOURCE_PLAN,
      resourceId: existing.id,
      oldValue: this.auditPayload(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async getSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioResourceSummaryDto> {
    return this.buildResourceSummary(clientId, projectId, scenarioId);
  }

  async buildResourceSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioResourceSummaryDto> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const lines = await this.prisma.projectScenarioResourcePlan.findMany({
      where: { clientId, scenarioId },
      include: {
        resource: { select: { id: true, name: true, code: true, type: true, dailyRate: true } },
      },
    });

    let plannedDaysTotal = new Prisma.Decimal(0);
    let plannedCostTotal = new Prisma.Decimal(0);
    const distinctResources = new Set(lines.map((line) => line.resourceId));

    for (const line of lines) {
      const linePlannedDays = line.plannedDays ?? new Prisma.Decimal(0);
      plannedDaysTotal = plannedDaysTotal.plus(linePlannedDays);
      if (line.resource.type === ResourceType.HUMAN && line.resource.dailyRate != null) {
        plannedCostTotal = plannedCostTotal.plus(linePlannedDays.times(line.resource.dailyRate));
      }
    }

    const plannedFtePeak = this.computePlannedFtePeak(lines);

    return {
      plannedDaysTotal: this.toDecimalString(plannedDaysTotal, 2),
      plannedCostTotal: this.toDecimalString(plannedCostTotal, 2),
      plannedFtePeak:
        plannedFtePeak != null ? this.toDecimalString(plannedFtePeak, 4) : null,
      distinctResources: distinctResources.size,
    };
  }

  private computePlannedFtePeak(lines: ResourcePlanRecord[]): Prisma.Decimal | null {
    const eligible = lines.filter(
      (line) =>
        line.allocationPct != null && line.startDate != null && line.endDate != null,
    );
    if (eligible.length === 0) {
      return null;
    }

    let minDate = this.startOfDayUtc(eligible[0].startDate!);
    let maxDate = this.startOfDayUtc(eligible[0].endDate!);
    for (const line of eligible) {
      const start = this.startOfDayUtc(line.startDate!);
      const end = this.startOfDayUtc(line.endDate!);
      if (start.getTime() < minDate.getTime()) minDate = start;
      if (end.getTime() > maxDate.getTime()) maxDate = end;
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    let peak = new Prisma.Decimal(0);
    for (let ts = minDate.getTime(); ts <= maxDate.getTime(); ts += oneDayMs) {
      let dailyFte = new Prisma.Decimal(0);
      for (const line of eligible) {
        const start = this.startOfDayUtc(line.startDate!);
        const end = this.startOfDayUtc(line.endDate!);
        if (ts >= start.getTime() && ts <= end.getTime()) {
          dailyFte = dailyFte.plus(
            new Prisma.Decimal(line.allocationPct!).div(new Prisma.Decimal(100)),
          );
        }
      }
      if (dailyFte.gt(peak)) {
        peak = dailyFte;
      }
    }
    return peak;
  }

  private startOfDayUtc(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private async getScenarioForScope(clientId: string, projectId: string, scenarioId: string) {
    const scenario = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
      select: { id: true, clientId: true, projectId: true, status: true },
    });
    if (!scenario) throw new NotFoundException('Project scenario not found');
    return scenario;
  }

  private async getPlanForScope(
    clientId: string,
    scenarioId: string,
    planId: string,
  ): Promise<ResourcePlanRecord> {
    const plan = await this.prisma.projectScenarioResourcePlan.findFirst({
      where: { id: planId, clientId, scenarioId },
      include: {
        resource: { select: { id: true, name: true, code: true, type: true, dailyRate: true } },
      },
    });
    if (!plan) throw new NotFoundException('Project scenario resource plan not found');
    return plan;
  }

  private async getResourceForClient(clientId: string, resourceId: string) {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, clientId },
      select: { id: true, name: true, code: true, type: true, dailyRate: true },
    });
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    return resource;
  }

  private assertScenarioWritable(status: ProjectScenarioStatus): void {
    if (status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be edited');
    }
  }

  private parseAllocationPct(value?: string | null): Prisma.Decimal | null {
    if (value === undefined || value === null) return null;
    const decimal = new Prisma.Decimal(value);
    if (decimal.lt(0) || decimal.gt(100)) {
      throw new BadRequestException('allocationPct must be between 0 and 100');
    }
    return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private parsePlannedDays(value?: string | null): Prisma.Decimal | null {
    if (value === undefined || value === null) return null;
    const decimal = new Prisma.Decimal(value);
    if (decimal.lt(0)) {
      throw new BadRequestException('plannedDays must be greater than or equal to 0');
    }
    return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private assertDateRange(startDate: Date | null, endDate: Date | null): void {
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be less than or equal to endDate');
    }
  }

  private serializePlan(plan: ResourcePlanRecord): ProjectScenarioResourcePlanDto {
    return {
      id: plan.id,
      clientId: plan.clientId,
      scenarioId: plan.scenarioId,
      resourceId: plan.resourceId,
      roleLabel: plan.roleLabel ?? null,
      allocationPct:
        plan.allocationPct != null ? this.toDecimalString(plan.allocationPct, 2) : null,
      plannedDays: plan.plannedDays != null ? this.toDecimalString(plan.plannedDays, 2) : null,
      startDate: plan.startDate?.toISOString() ?? null,
      endDate: plan.endDate?.toISOString() ?? null,
      notes: plan.notes ?? null,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      resource: {
        id: plan.resource.id,
        name: plan.resource.name,
        code: plan.resource.code ?? null,
        type: plan.resource.type,
      },
    };
  }

  private auditPayload(plan: ResourcePlanRecord) {
    return {
      scenarioId: plan.scenarioId,
      resourceId: plan.resourceId,
      roleLabel: plan.roleLabel ?? null,
      allocationPct:
        plan.allocationPct != null ? this.toDecimalString(plan.allocationPct, 2) : null,
      plannedDays: plan.plannedDays != null ? this.toDecimalString(plan.plannedDays, 2) : null,
      startDate: plan.startDate?.toISOString() ?? null,
      endDate: plan.endDate?.toISOString() ?? null,
      notes: plan.notes ?? null,
    };
  }

  private normalizeNullableText(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toDecimalString(value: Prisma.Decimal, scale: number): string {
    return new Prisma.Decimal(value).toDecimalPlaces(scale).toString();
  }
}
