import { Injectable } from '@nestjs/common';
import {
  CapacityAllocationSourceType,
  Prisma,
  ResourceType,
  WorkTeamStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacityResolveService } from './capacity-resolve.service';
import { DashboardQueryDto } from './dto/dashboard.query.dto';
import { decimalToString } from './lib/parse-days';
import { resolveCommitmentKind } from './lib/resolve-commitment-kind';
import { CapacityConsumptionService } from './capacity-consumption.service';

function eachYearMonth(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  let y = fy!;
  let m = fm!;
  while (y < ty! || (y === ty && m <= tm!)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

@Injectable()
export class CapacityAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolve: CapacityResolveService,
    private readonly consumption: CapacityConsumptionService,
  ) {}

  private async allocationIncludedInActiveAggregates(
    clientId: string,
    alloc: {
      id: string;
      workTeamId: string | null;
      sourceType: CapacityAllocationSourceType;
      sourceId: string | null;
      workTeam: { status: WorkTeamStatus } | null;
    },
  ): Promise<boolean> {
    if (
      alloc.workTeamId &&
      alloc.workTeam?.status === WorkTeamStatus.ARCHIVED
    ) {
      return false;
    }
    if (
      alloc.sourceType !== CapacityAllocationSourceType.MANUAL &&
      alloc.sourceId
    ) {
      try {
        const emits = await this.consumption.assertSourceCanEmit(
          clientId,
          alloc.sourceType,
          alloc.sourceId,
        );
        if (!emits) return false;
        const meta = await this.prismaLoadStatus(
          clientId,
          alloc.sourceType,
          alloc.sourceId,
        );
        if (meta == null) return false;
        const kind = resolveCommitmentKind(alloc.sourceType, meta);
        if (kind === 'EXCLUDED') return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  private async prismaLoadStatus(
    clientId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string,
  ) {
    if (sourceType === CapacityAllocationSourceType.PROJECT) {
      const p = await this.prisma.project.findFirst({
        where: { id: sourceId, clientId },
        select: { status: true },
      });
      return p?.status ?? null;
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT_RISK) {
      const r = await this.prisma.projectRisk.findFirst({
        where: { id: sourceId, clientId },
        select: { status: true },
      });
      return r?.status ?? null;
    }
    if (sourceType === CapacityAllocationSourceType.ACTION_PLAN) {
      const a = await this.prisma.actionPlan.findFirst({
        where: { id: sourceId, clientId },
        select: { status: true },
      });
      return a?.status ?? null;
    }
    return null;
  }

  async dashboardResources(clientId: string, query: DashboardQueryDto) {
    const months = eachYearMonth(query.from, query.to);
    const resources = await this.prisma.resource.findMany({
      where: { clientId, type: ResourceType.HUMAN },
      select: {
        id: true,
        name: true,
        primaryCapacityWorkTeamId: true,
        primaryCapacityWorkTeam: { select: { id: true, status: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const items = [];
    for (const res of resources) {
      for (const yearMonth of months) {
        const cap = await this.resolve.resolveResourceMonthly(
          clientId,
          res.id,
          yearMonth,
        );
        const monthsAlloc = await this.prisma.capacityAllocationMonth.findMany({
          where: {
            clientId,
            yearMonth,
            allocation: { resourceId: res.id },
          },
          include: {
            allocation: {
              include: { workTeam: { select: { status: true } } },
            },
          },
        });
        let allocated = new Prisma.Decimal(0);
        for (const m of monthsAlloc) {
          const ok = await this.allocationIncludedInActiveAggregates(
            clientId,
            m.allocation,
          );
          if (ok) allocated = allocated.plus(m.days);
        }
        const capacity = new Prisma.Decimal(cap.days);
        const activePrimary =
          res.primaryCapacityWorkTeam?.status === WorkTeamStatus.ACTIVE
            ? res.primaryCapacityWorkTeam
            : null;
        items.push({
          id: res.id,
          label: res.name,
          yearMonth,
          capacity: Number(decimalToString(capacity)),
          allocated: Number(decimalToString(allocated)),
          available: Number(decimalToString(capacity.minus(allocated))),
          bucket: activePrimary ? undefined : ('NO_ACTIVE_WORK_TEAM' as const),
        });
      }
    }
    return { items };
  }

  async dashboardWorkTeams(clientId: string, query: DashboardQueryDto) {
    const months = eachYearMonth(query.from, query.to);
    const includeArchived = query.includeArchivedWorkTeams === true;
    const teams = await this.prisma.workTeam.findMany({
      where: {
        clientId,
        ...(includeArchived ? {} : { status: WorkTeamStatus.ACTIVE }),
      },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });

    const items = [];
    for (const team of teams) {
      for (const yearMonth of months) {
        const capacity = await this.resolve.resolveWorkTeamMonthly(
          clientId,
          team.id,
          yearMonth,
        );
        const memberResources = await this.prisma.resource.findMany({
          where: {
            clientId,
            type: ResourceType.HUMAN,
            primaryCapacityWorkTeamId: team.id,
          },
          select: { id: true },
        });
        const memberIds = memberResources.map((r) => r.id);
        const monthsAlloc = await this.prisma.capacityAllocationMonth.findMany({
          where: {
            clientId,
            yearMonth,
            OR: [
              { allocation: { workTeamId: team.id } },
              ...(memberIds.length
                ? [{ allocation: { resourceId: { in: memberIds } } }]
                : []),
            ],
          },
          include: {
            allocation: {
              include: { workTeam: { select: { status: true } } },
            },
          },
        });
        let allocated = new Prisma.Decimal(0);
        const seen = new Set<string>();
        for (const m of monthsAlloc) {
          if (seen.has(m.allocationId)) continue;
          seen.add(m.allocationId);
          if (
            !includeArchived &&
            m.allocation.workTeamId === team.id &&
            team.status === WorkTeamStatus.ARCHIVED
          ) {
            continue;
          }
          const ok =
            includeArchived ||
            (await this.allocationIncludedInActiveAggregates(
              clientId,
              m.allocation,
            ));
          if (ok) allocated = allocated.plus(m.days);
        }
        const cap = new Prisma.Decimal(capacity.days);
        items.push({
          id: team.id,
          label: team.name,
          yearMonth,
          capacity: Number(decimalToString(cap)),
          allocated: Number(decimalToString(allocated)),
          available: Number(decimalToString(cap.minus(allocated))),
          status: team.status,
        });
      }
    }
    return { items };
  }

  async dashboardPortfolio(clientId: string, query: DashboardQueryDto) {
    const months = eachYearMonth(query.from, query.to);
    const includeArchived = query.includeArchivedWorkTeams === true;
    const items = [];

    for (const yearMonth of months) {
      const resources = await this.prisma.resource.findMany({
        where: { clientId, type: ResourceType.HUMAN },
        select: { id: true },
      });
      let capacity = new Prisma.Decimal(0);
      for (const r of resources) {
        const cap = await this.resolve.resolveResourceMonthly(
          clientId,
          r.id,
          yearMonth,
        );
        capacity = capacity.plus(cap.days);
      }

      const monthsAlloc = await this.prisma.capacityAllocationMonth.findMany({
        where: { clientId, yearMonth },
        include: {
          allocation: {
            include: { workTeam: { select: { status: true } } },
          },
        },
      });
      let allocated = new Prisma.Decimal(0);
      const seen = new Set<string>();
      for (const m of monthsAlloc) {
        if (seen.has(m.allocationId)) continue;
        seen.add(m.allocationId);
        const alloc = m.allocation;
        if (
          !includeArchived &&
          alloc.workTeamId &&
          alloc.workTeam?.status === WorkTeamStatus.ARCHIVED
        ) {
          continue;
        }
        const ok =
          includeArchived ||
          (await this.allocationIncludedInActiveAggregates(clientId, alloc));
        if (ok) allocated = allocated.plus(m.days);
      }

      items.push({
        yearMonth,
        capacity: Number(decimalToString(capacity)),
        allocated: Number(decimalToString(allocated)),
        available: Number(decimalToString(capacity.minus(allocated))),
      });
    }

    return { items };
  }
}
