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

/** Ligne du plan de charge ressource × projet. */
export interface ResourceProjectLoadRow {
  resourceId: string;
  label: string;
  roleName: string | null;
  capacityDays: number;
  allocatedDays: number;
  availableDays: number;
  /** Alloué / capacité en % ; `null` si aucune capacité résolue sur la fenêtre. */
  loadPercent: number | null;
  /** Jours alloués par projet (clé = id projet), colonnes de la matrice. */
  byProject: Record<string, number>;
  /** Jours alloués hors projet (manuel, risques, plans d'action). */
  otherDays: number;
}

/** `GET /capacity/dashboard/resource-project-load`. */
export interface ResourceProjectLoadResult {
  months: string[];
  projects: Array<{ id: string; name: string; code: string | null }>;
  items: ResourceProjectLoadRow[];
}

/** Charge d'une équipe — `GET /capacity/dashboard/work-team-load`. */
export interface WorkTeamLoadRow {
  workTeamId: string;
  label: string;
  capacityDays: number;
  allocatedDays: number;
  availableDays: number;
  /** Alloué / capacité en % ; `null` si aucune capacité résolue. */
  loadPercent: number | null;
  /** Projets distincts engagés par l'équipe sur la fenêtre. */
  projectCount: number;
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

  /**
   * Plan de charge ressource × projet — matrice de la page `/resources`.
   *
   * Agrège les jours alloués sur la fenêtre `from`–`to` en colonnes projet
   * (`sourceType = PROJECT`). Les allocations manuelles ou issues de risques /
   * plans d'action sont regroupées dans `otherDays` : la matrice reste lisible
   * tout en gardant `allocatedDays` cohérent avec `dashboardResources`.
   *
   * Les mêmes règles d'exclusion que les autres agrégats s'appliquent (équipe
   * archivée, source qui n'émet plus, engagement exclu).
   */
  async dashboardResourceProjectLoad(
    clientId: string,
    query: DashboardQueryDto,
  ): Promise<ResourceProjectLoadResult> {
    const months = eachYearMonth(query.from, query.to);

    const resources = await this.prisma.resource.findMany({
      where: { clientId, type: ResourceType.HUMAN },
      select: {
        id: true,
        name: true,
        resourceRole: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const allocationMonths = await this.prisma.capacityAllocationMonth.findMany({
      where: {
        clientId,
        yearMonth: { in: months },
        allocation: { resourceId: { not: null } },
      },
      include: {
        allocation: {
          include: { workTeam: { select: { status: true } } },
        },
      },
    });

    /** Cache d'inclusion : une allocation peut porter plusieurs mois. */
    const includedByAllocationId = new Map<string, boolean>();
    const daysByResourceProject = new Map<string, Prisma.Decimal>();
    const otherDaysByResource = new Map<string, Prisma.Decimal>();
    const projectIds = new Set<string>();

    for (const month of allocationMonths) {
      const allocation = month.allocation;
      const resourceId = allocation.resourceId;
      if (!resourceId) continue;

      let included = includedByAllocationId.get(allocation.id);
      if (included === undefined) {
        included = await this.allocationIncludedInActiveAggregates(clientId, allocation);
        includedByAllocationId.set(allocation.id, included);
      }
      if (!included) continue;

      const isProject =
        allocation.sourceType === CapacityAllocationSourceType.PROJECT && allocation.sourceId;

      if (isProject) {
        const projectId = allocation.sourceId!;
        projectIds.add(projectId);
        const key = `${resourceId}::${projectId}`;
        daysByResourceProject.set(
          key,
          (daysByResourceProject.get(key) ?? new Prisma.Decimal(0)).plus(month.days),
        );
      } else {
        otherDaysByResource.set(
          resourceId,
          (otherDaysByResource.get(resourceId) ?? new Prisma.Decimal(0)).plus(month.days),
        );
      }
    }

    const projectRows =
      projectIds.size === 0
        ? []
        : await this.prisma.project.findMany({
            where: { clientId, id: { in: [...projectIds] } },
            select: { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
          });

    const items: ResourceProjectLoadRow[] = [];
    for (const resource of resources) {
      let capacity = new Prisma.Decimal(0);
      for (const yearMonth of months) {
        const monthly = await this.resolve.resolveResourceMonthly(
          clientId,
          resource.id,
          yearMonth,
        );
        capacity = capacity.plus(new Prisma.Decimal(monthly.days));
      }

      const byProject: Record<string, number> = {};
      let allocated = new Prisma.Decimal(0);
      for (const project of projectRows) {
        const days = daysByResourceProject.get(`${resource.id}::${project.id}`);
        if (!days) continue;
        byProject[project.id] = Number(decimalToString(days));
        allocated = allocated.plus(days);
      }

      const otherDays = otherDaysByResource.get(resource.id) ?? new Prisma.Decimal(0);
      allocated = allocated.plus(otherDays);

      const capacityDays = Number(decimalToString(capacity));
      const allocatedDays = Number(decimalToString(allocated));

      items.push({
        resourceId: resource.id,
        label: resource.name,
        roleName: resource.resourceRole?.name ?? null,
        capacityDays,
        allocatedDays,
        availableDays: Number(decimalToString(capacity.minus(allocated))),
        // Sans capacité résolue, le taux n'a pas de sens : null plutôt que 0 ou ∞.
        loadPercent:
          capacityDays > 0 ? Math.round((100 * allocatedDays) / capacityDays) : null,
        byProject,
        otherDays: Number(decimalToString(otherDays)),
      });
    }

    return {
      months,
      projects: projectRows.map((p) => ({ id: p.id, name: p.name, code: p.code })),
      items,
    };
  }

  /**
   * Charge par équipe — statistiques des cartes `/teams`.
   *
   * Agrège les allocations portées par l'équipe (`workTeamId`) sur la fenêtre :
   * jours alloués, taux de charge et nombre de projets distincts engagés.
   * Mêmes règles d'exclusion que les autres agrégats.
   */
  async dashboardWorkTeamLoad(
    clientId: string,
    query: DashboardQueryDto,
  ): Promise<{ months: string[]; items: WorkTeamLoadRow[] }> {
    const months = eachYearMonth(query.from, query.to);

    const teams = await this.prisma.workTeam.findMany({
      where: { clientId, status: WorkTeamStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    if (teams.length === 0) return { months, items: [] };

    const allocationMonths = await this.prisma.capacityAllocationMonth.findMany({
      where: {
        clientId,
        yearMonth: { in: months },
        allocation: { workTeamId: { not: null } },
      },
      include: {
        allocation: {
          include: { workTeam: { select: { status: true } } },
        },
      },
    });

    const includedByAllocationId = new Map<string, boolean>();
    const allocatedByTeam = new Map<string, Prisma.Decimal>();
    const projectsByTeam = new Map<string, Set<string>>();

    for (const month of allocationMonths) {
      const allocation = month.allocation;
      const workTeamId = allocation.workTeamId;
      if (!workTeamId) continue;

      let included = includedByAllocationId.get(allocation.id);
      if (included === undefined) {
        included = await this.allocationIncludedInActiveAggregates(clientId, allocation);
        includedByAllocationId.set(allocation.id, included);
      }
      if (!included) continue;

      allocatedByTeam.set(
        workTeamId,
        (allocatedByTeam.get(workTeamId) ?? new Prisma.Decimal(0)).plus(month.days),
      );

      if (
        allocation.sourceType === CapacityAllocationSourceType.PROJECT &&
        allocation.sourceId
      ) {
        const set = projectsByTeam.get(workTeamId) ?? new Set<string>();
        set.add(allocation.sourceId);
        projectsByTeam.set(workTeamId, set);
      }
    }

    const items: WorkTeamLoadRow[] = [];
    for (const team of teams) {
      let capacity = new Prisma.Decimal(0);
      for (const yearMonth of months) {
        const monthly = await this.resolve.resolveWorkTeamMonthly(
          clientId,
          team.id,
          yearMonth,
        );
        capacity = capacity.plus(new Prisma.Decimal(monthly.days));
      }

      const allocated = allocatedByTeam.get(team.id) ?? new Prisma.Decimal(0);
      const capacityDays = Number(decimalToString(capacity));
      const allocatedDays = Number(decimalToString(allocated));

      items.push({
        workTeamId: team.id,
        label: team.name,
        capacityDays,
        allocatedDays,
        availableDays: Number(decimalToString(capacity.minus(allocated))),
        loadPercent:
          capacityDays > 0 ? Math.round((100 * allocatedDays) / capacityDays) : null,
        projectCount: projectsByTeam.get(team.id)?.size ?? 0,
      });
    }

    return { months, items };
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
