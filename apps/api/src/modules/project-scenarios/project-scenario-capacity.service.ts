import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectScenarioStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { ListProjectScenarioCapacityQueryDto } from './dto/list-project-scenario-capacity.query.dto';
import { type ProjectScenarioCapacityRecomputeResultDto } from './dto/project-scenario-capacity-recompute-result.dto';
import {
  type ProjectScenarioCapacitySnapshotDto,
  type ProjectScenarioCapacityStatus,
} from './dto/project-scenario-capacity-snapshot.dto';
import { type ProjectScenarioCapacitySummaryDto } from './dto/project-scenario-capacity-summary.dto';
export type { ProjectScenarioCapacitySummaryDto };

type CapacitySnapshotRecord = Prisma.ProjectScenarioCapacitySnapshotGetPayload<{
  include: {
    resource: {
      select: { id: true; name: true; type: true };
    };
  };
}>;

@Injectable()
export class ProjectScenarioCapacityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    scenarioId: string,
    query: ListProjectScenarioCapacityQueryDto,
  ): Promise<{
    items: ProjectScenarioCapacitySnapshotDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);

    const where: Prisma.ProjectScenarioCapacitySnapshotWhereInput = {
      clientId,
      projectId,
      scenarioId,
      ...(query.resourceId?.trim() ? { resourceId: query.resourceId.trim() } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectScenarioCapacitySnapshot.findMany({
        where,
        orderBy: [{ snapshotDate: 'asc' }, { resourceId: 'asc' }],
        skip: offset,
        take: limit,
        include: { resource: { select: { id: true, name: true, type: true } } },
      }),
      this.prisma.projectScenarioCapacitySnapshot.count({ where }),
    ]);

    return {
      items: items.map((row) => this.serializeSnapshot(row)),
      total,
      limit,
      offset,
    };
  }

  async recompute(
    clientId: string,
    projectId: string,
    scenarioId: string,
    context?: AuditContext,
  ): Promise<ProjectScenarioCapacityRecomputeResultDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    if (scenario.status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be edited');
    }

    const resourcePlans = await this.prisma.projectScenarioResourcePlan.findMany({
      where: {
        clientId,
        scenarioId,
        allocationPct: { not: null },
        startDate: { not: null },
        endDate: { not: null },
      },
      select: {
        resourceId: true,
        allocationPct: true,
        startDate: true,
        endDate: true,
      },
    });

    const dailyLoadByResource = new Map<string, Prisma.Decimal>();
    for (const plan of resourcePlans) {
      if (!plan.allocationPct || !plan.startDate || !plan.endDate) {
        continue;
      }
      const start = this.startOfDayUtc(plan.startDate);
      const end = this.startOfDayUtc(plan.endDate);
      for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 24 * 60 * 60 * 1000) {
        const dayIso = new Date(cursor).toISOString();
        const key = `${plan.resourceId}::${dayIso}`;
        const current = dailyLoadByResource.get(key) ?? new Prisma.Decimal(0);
        dailyLoadByResource.set(key, current.plus(plan.allocationPct));
      }
    }

    const availableCapacityPct = new Prisma.Decimal('100.00');
    const createData: Prisma.ProjectScenarioCapacitySnapshotCreateManyInput[] = [];
    for (const [key, plannedLoadRaw] of dailyLoadByResource.entries()) {
      const [resourceId, dayIso] = key.split('::');
      const snapshotDate = new Date(dayIso);
      const plannedLoadPct = plannedLoadRaw.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const variancePct = availableCapacityPct
        .minus(plannedLoadPct)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      createData.push({
        clientId,
        projectId,
        scenarioId,
        resourceId,
        snapshotDate,
        plannedLoadPct,
        availableCapacityPct,
        variancePct,
        status: this.statusFromVariance(variancePct),
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.projectScenarioCapacitySnapshot.deleteMany({
        where: { clientId, projectId, scenarioId },
      });
      const created =
        createData.length > 0
          ? await tx.projectScenarioCapacitySnapshot.createMany({ data: createData })
          : { count: 0 };

      return { deletedCount: deleted.count, createdCount: created.count };
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_CAPACITY_RECOMPUTED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_CAPACITY,
      resourceId: scenarioId,
      newValue: {
        scenarioId,
        deletedCount: result.deletedCount,
        createdCount: result.createdCount,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return {
      scenarioId,
      deletedCount: result.deletedCount,
      createdCount: result.createdCount,
    };
  }

  async getSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioCapacitySummaryDto> {
    return this.buildCapacitySummary(clientId, projectId, scenarioId);
  }

  async buildCapacitySummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioCapacitySummaryDto> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const snapshots = await this.prisma.projectScenarioCapacitySnapshot.findMany({
      where: { clientId, projectId, scenarioId },
      select: { plannedLoadPct: true, status: true },
    });

    if (snapshots.length === 0) {
      return {
        overCapacityCount: 0,
        underCapacityCount: 0,
        peakLoadPct: null,
        averageLoadPct: null,
      };
    }

    let overCapacityCount = 0;
    let underCapacityCount = 0;
    let peakLoadPct: Prisma.Decimal | null = null;
    let totalLoad = new Prisma.Decimal(0);

    for (const snapshot of snapshots) {
      if (snapshot.status === 'OVER_CAPACITY') overCapacityCount += 1;
      if (snapshot.status === 'UNDER_CAPACITY') underCapacityCount += 1;
      totalLoad = totalLoad.plus(snapshot.plannedLoadPct);
      if (!peakLoadPct || snapshot.plannedLoadPct.gt(peakLoadPct)) {
        peakLoadPct = snapshot.plannedLoadPct;
      }
    }

    const averageLoadPct = totalLoad
      .div(new Prisma.Decimal(snapshots.length))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return {
      overCapacityCount,
      underCapacityCount,
      peakLoadPct: peakLoadPct ? this.toDecimalString(peakLoadPct, 2) : null,
      averageLoadPct: this.toDecimalString(averageLoadPct, 2),
    };
  }

  private async getScenarioForScope(clientId: string, projectId: string, scenarioId: string) {
    const scenario = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
      select: { id: true, status: true },
    });
    if (!scenario) {
      throw new NotFoundException('Project scenario not found');
    }
    return scenario;
  }

  private serializeSnapshot(snapshot: CapacitySnapshotRecord): ProjectScenarioCapacitySnapshotDto {
    return {
      id: snapshot.id,
      clientId: snapshot.clientId,
      projectId: snapshot.projectId,
      scenarioId: snapshot.scenarioId,
      resourceId: snapshot.resourceId,
      snapshotDate: snapshot.snapshotDate.toISOString(),
      plannedLoadPct: this.toDecimalString(snapshot.plannedLoadPct, 2),
      availableCapacityPct: this.toDecimalString(snapshot.availableCapacityPct, 2),
      variancePct: this.toDecimalString(snapshot.variancePct, 2),
      status: this.normalizeStatus(snapshot.status),
      resource: snapshot.resource
        ? {
            id: snapshot.resource.id,
            name: snapshot.resource.name,
            type: snapshot.resource.type,
          }
        : null,
    };
  }

  private normalizeStatus(value: string): ProjectScenarioCapacityStatus {
    if (value === 'OVER_CAPACITY' || value === 'OK' || value === 'UNDER_CAPACITY') {
      return value;
    }
    return 'OK';
  }

  private statusFromVariance(variancePct: Prisma.Decimal): ProjectScenarioCapacityStatus {
    if (variancePct.lt(0)) return 'OVER_CAPACITY';
    if (variancePct.eq(0)) return 'OK';
    return 'UNDER_CAPACITY';
  }

  private startOfDayUtc(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private toDecimalString(value: Prisma.Decimal, scale: number): string {
    return new Prisma.Decimal(value).toDecimalPlaces(scale).toString();
  }
}
