import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StrategicAxisStatus,
  StrategicDirection,
  StrategicDirectionStrategyStatus,
  StrategicLinkType,
  StrategicObjectiveHealthStatus,
  StrategicObjectiveLifecycleStatus,
  StrategicObjectiveStatus,
  StrategicVisionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { activePortfolioProjectsWhere } from '../projects/lib/project-portfolio-active-filter.util';
import { StrategicVisionAlertsResponseDto } from './dto/strategic-vision-alerts-response.dto';
import { StrategicVisionKpisResponseDto } from './dto/strategic-vision-kpis-response.dto';
import { CreateStrategicAxisDto } from './dto/create-strategic-axis.dto';
import { CreateStrategicDirectionDto } from './dto/create-strategic-direction.dto';
import { CreateStrategicLinkDto } from './dto/create-strategic-link.dto';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { CreateStrategicVisionDto } from './dto/create-strategic-vision.dto';
import { ListStrategicDirectionsQueryDto } from './dto/list-strategic-directions-query.dto';
import { ListStrategicVisionQueryDto } from './dto/list-strategic-vision-query.dto';
import { StrategicVisionKpisByDirectionResponseDto } from './dto/strategic-vision-kpis-by-direction-response.dto';
import { UpdateStrategicDirectionDto } from './dto/update-strategic-direction.dto';
import { UpdateStrategicAxisDto } from './dto/update-strategic-axis.dto';
import { UpdateStrategicLinkDto } from './dto/update-strategic-link.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';
import { UpdateStrategicVisionDto } from './dto/update-strategic-vision.dto';
import { AccessControlService } from '../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';

const SUPPORTED_LINK_TYPES_V1: readonly StrategicLinkType[] = [
  StrategicLinkType.PROJECT,
  StrategicLinkType.MANUAL,
];

const UNSUPPORTED_LINK_MESSAGE = 'Target type not supported in MVP';

type StrategicAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

const strategicVisionInclude: Prisma.StrategicVisionInclude = {
  axes: {
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    include: {
      objectives: {
        orderBy: [{ createdAt: 'asc' }],
        include: {
          direction: {
            select: {
              id: true,
              code: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
    },
  },
};

const OBJECTIVE_AT_RISK_STATUSES: readonly StrategicObjectiveStatus[] = [
  StrategicObjectiveStatus.AT_RISK,
];
const OBJECTIVE_OFF_TRACK_STATUSES: readonly StrategicObjectiveStatus[] = [
  StrategicObjectiveStatus.OFF_TRACK,
];
const OBJECTIVE_TERMINAL_STATUSES: readonly StrategicObjectiveStatus[] = [
  StrategicObjectiveStatus.COMPLETED,
  StrategicObjectiveStatus.ARCHIVED,
];
const ALERT_SEVERITY_RANK: Readonly<Record<string, number>> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

@Injectable()
export class StrategicVisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly accessControl: Pick<
      AccessControlService,
      'canReadResource' | 'canWriteResource' | 'canAdminResource' | 'filterReadableResourceIds'
    > = {
      canReadResource: async () => true,
      canWriteResource: async () => true,
      canAdminResource: async () => true,
      filterReadableResourceIds: async (params) => params.resourceIds,
    },
  ) {}

  private async assertCanReadObjective(clientId: string, userId: string, objectiveId: string) {
    const allowed = await this.accessControl.canReadResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.STRATEGIC_OBJECTIVE,
      resourceId: objectiveId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanWriteObjective(clientId: string, userId: string, objectiveId: string) {
    const allowed = await this.accessControl.canWriteResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.STRATEGIC_OBJECTIVE,
      resourceId: objectiveId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanAdminObjective(clientId: string, userId: string, objectiveId: string) {
    const allowed = await this.accessControl.canAdminResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.STRATEGIC_OBJECTIVE,
      resourceId: objectiveId,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async audit(
    clientId: string,
    context: StrategicAuditContext | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue?: Prisma.JsonObject,
    newValue?: Prisma.JsonObject,
  ) {
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  private normalizeDirectionCode(rawCode: string): string {
    return rawCode.trim().toUpperCase();
  }

  /**
   * RFC-STRAT-007 — synchronisation centralisée du statut Vision et de `isActive` legacy.
   * Règles :
   *  - status=ACTIVE   ⇔ isActive=true
   *  - status=ARCHIVED → isActive=false
   *  - status=DRAFT    → isActive=false
   *  - isActive=true (legacy) → status=ACTIVE
   *  - isActive=false (legacy) sur vision non archivée → status=DRAFT
   */
  private resolveVisionStatus(input: {
    status?: StrategicVisionStatus;
    isActive?: boolean;
    currentStatus?: StrategicVisionStatus;
    currentIsActive?: boolean;
  }): { status: StrategicVisionStatus; isActive: boolean } {
    if (input.status !== undefined) {
      const status = input.status;
      const isActive = status === StrategicVisionStatus.ACTIVE;
      return { status, isActive };
    }
    if (input.isActive !== undefined) {
      if (input.isActive) {
        return { status: StrategicVisionStatus.ACTIVE, isActive: true };
      }
      const baseStatus = input.currentStatus ?? StrategicVisionStatus.DRAFT;
      const status =
        baseStatus === StrategicVisionStatus.ARCHIVED
          ? StrategicVisionStatus.ARCHIVED
          : StrategicVisionStatus.DRAFT;
      return { status, isActive: false };
    }
    const status = input.currentStatus ?? StrategicVisionStatus.DRAFT;
    const isActive =
      input.currentIsActive ?? status === StrategicVisionStatus.ACTIVE;
    return { status, isActive };
  }

  /**
   * RFC-STRAT-007 — synchronisation centralisée des trois statuts d'objectif.
   * Règles :
   *  - status legacy fourni :
   *      COMPLETED                  → lifecycleStatus=COMPLETED, healthStatus=null
   *      ARCHIVED                   → lifecycleStatus=ARCHIVED,  healthStatus=null
   *      ON_TRACK|AT_RISK|OFF_TRACK → lifecycleStatus=ACTIVE,    healthStatus=status
   *  - lifecycleStatus / healthStatus fournis :
   *      lifecycleStatus=COMPLETED  → status=COMPLETED
   *      lifecycleStatus=ARCHIVED   → status=ARCHIVED
   *      lifecycleStatus=DRAFT|ACTIVE → status=healthStatus ?? ON_TRACK
   */
  private resolveObjectiveStatuses(input: {
    status?: StrategicObjectiveStatus;
    lifecycleStatus?: StrategicObjectiveLifecycleStatus;
    healthStatus?: StrategicObjectiveHealthStatus | null;
    currentStatus?: StrategicObjectiveStatus;
    currentLifecycleStatus?: StrategicObjectiveLifecycleStatus;
    currentHealthStatus?: StrategicObjectiveHealthStatus | null;
  }): {
    status: StrategicObjectiveStatus;
    lifecycleStatus: StrategicObjectiveLifecycleStatus;
    healthStatus: StrategicObjectiveHealthStatus | null;
  } {
    if (input.status !== undefined) {
      const status = input.status;
      if (status === StrategicObjectiveStatus.COMPLETED) {
        return {
          status,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.COMPLETED,
          healthStatus: null,
        };
      }
      if (status === StrategicObjectiveStatus.ARCHIVED) {
        return {
          status,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.ARCHIVED,
          healthStatus: null,
        };
      }
      return {
        status,
        lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
        healthStatus: status as unknown as StrategicObjectiveHealthStatus,
      };
    }

    if (input.lifecycleStatus !== undefined || input.healthStatus !== undefined) {
      const lifecycleStatus =
        input.lifecycleStatus ??
        input.currentLifecycleStatus ??
        StrategicObjectiveLifecycleStatus.ACTIVE;
      const healthStatus =
        input.healthStatus !== undefined
          ? input.healthStatus
          : (input.currentHealthStatus ?? null);

      if (lifecycleStatus === StrategicObjectiveLifecycleStatus.COMPLETED) {
        return {
          status: StrategicObjectiveStatus.COMPLETED,
          lifecycleStatus,
          healthStatus: null,
        };
      }
      if (lifecycleStatus === StrategicObjectiveLifecycleStatus.ARCHIVED) {
        return {
          status: StrategicObjectiveStatus.ARCHIVED,
          lifecycleStatus,
          healthStatus: null,
        };
      }
      const effectiveHealth =
        healthStatus ?? StrategicObjectiveHealthStatus.ON_TRACK;
      return {
        status: effectiveHealth as unknown as StrategicObjectiveStatus,
        lifecycleStatus,
        healthStatus: effectiveHealth,
      };
    }

    const status = input.currentStatus ?? StrategicObjectiveStatus.ON_TRACK;
    const lifecycleStatus =
      input.currentLifecycleStatus ?? StrategicObjectiveLifecycleStatus.ACTIVE;
    const healthStatus =
      input.currentHealthStatus !== undefined ? input.currentHealthStatus : null;
    return { status, lifecycleStatus, healthStatus };
  }

  /**
   * RFC-STRAT-007 — types de liens autorisés en write V1 : PROJECT et MANUAL.
   * Tout autre type (BUDGET, BUDGET_LINE, RISK, GOVERNANCE_CYCLE) est refusé.
   */
  private assertWritableLinkTypeV1(linkType: StrategicLinkType): void {
    if (!SUPPORTED_LINK_TYPES_V1.includes(linkType)) {
      throw new BadRequestException(UNSUPPORTED_LINK_MESSAGE);
    }
  }

  private resolveLinkType(dto: {
    linkType?: StrategicLinkType;
    targetType?: StrategicLinkType;
  }): StrategicLinkType {
    const fromAlias = dto.targetType ?? dto.linkType;
    if (!fromAlias) {
      throw new BadRequestException('linkType or targetType is required');
    }
    return fromAlias;
  }

  private buildManualTargetId(): string {
    return `manual:${randomUUID()}`;
  }

  private assertPercentBounds(
    field: 'progressPercent' | 'alignmentScore',
    value: number | null | undefined,
  ): void {
    if (value === null || value === undefined) return;
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new BadRequestException(`${field} must be an integer between 0 and 100`);
    }
  }

  private async resolveDirectionForClient(
    clientId: string,
    directionId: string,
    options?: { mustBeActive?: boolean },
  ): Promise<StrategicDirection> {
    const direction = await this.prisma.strategicDirection.findFirst({
      where: { id: directionId, clientId },
    });
    if (!direction) {
      throw new BadRequestException('strategic direction not found for active client');
    }
    if (options?.mustBeActive && !direction.isActive) {
      throw new BadRequestException('strategic direction is inactive');
    }
    return direction;
  }

  private async computeKpis(
    clientId: string,
    options?: { directionId?: string | null; activeProjectIds?: string[]; now?: Date },
  ): Promise<StrategicVisionKpisResponseDto & { alignedActiveProjectsCount: number }> {
    const now = options?.now ?? new Date();
    const activeProjectIds =
      options?.activeProjectIds ??
      (
        await this.prisma.project.findMany({
          where: activePortfolioProjectsWhere(clientId),
          select: { id: true },
        })
      ).map((project) => project.id);

    const objectiveWhereBase: Prisma.StrategicObjectiveWhereInput = {
      clientId,
      ...(options?.directionId !== undefined
        ? { directionId: options.directionId }
        : {}),
    };

    const [
      atRiskObjectives,
      offTrackObjectives,
      overdueObjectives,
      alignedActiveProjectLinks,
    ] = await Promise.all([
      this.prisma.strategicObjective.count({
        where: {
          ...objectiveWhereBase,
          status: { in: [...OBJECTIVE_AT_RISK_STATUSES] },
        },
      }),
      this.prisma.strategicObjective.count({
        where: {
          ...objectiveWhereBase,
          status: { in: [...OBJECTIVE_OFF_TRACK_STATUSES] },
        },
      }),
      this.prisma.strategicObjective.count({
        where: {
          ...objectiveWhereBase,
          OR: [
            { targetDate: { lt: now } },
            {
              AND: [{ targetDate: null }, { deadline: { not: null, lt: now } }],
            },
          ],
          status: { notIn: [...OBJECTIVE_TERMINAL_STATUSES] },
        },
      }),
      activeProjectIds.length
        ? this.prisma.strategicLink.findMany({
            where: {
              clientId,
              linkType: StrategicLinkType.PROJECT,
              targetId: { in: activeProjectIds },
              ...(options?.directionId !== undefined
                ? { objective: { directionId: options.directionId } }
                : {}),
            },
            select: { targetId: true },
            distinct: ['targetId'],
          })
        : Promise.resolve([]),
    ]);

    const totalActiveProjects = activeProjectIds.length;
    const alignedActiveProjects = alignedActiveProjectLinks.length;
    const unalignedProjectsCount = Math.max(
      totalActiveProjects - alignedActiveProjects,
      0,
    );
    const rawRate =
      totalActiveProjects === 0 ? 0 : alignedActiveProjects / totalActiveProjects;
    const projectAlignmentRate = Math.min(Math.max(rawRate, 0), 1);

    return {
      projectAlignmentRate,
      unalignedProjectsCount,
      objectivesAtRiskCount: atRiskObjectives,
      objectivesOffTrackCount: offTrackObjectives,
      overdueObjectivesCount: overdueObjectives,
      generatedAt: now.toISOString(),
      alignedActiveProjectsCount: alignedActiveProjects,
    };
  }

  async listVisions(clientId: string, query?: ListStrategicVisionQueryDto) {
    const search = query?.search?.trim();
    const includeArchived = query?.includeArchived === true;
    const statusFilter = query?.status;

    const where: Prisma.StrategicVisionWhereInput = {
      clientId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(!includeArchived && !statusFilter
        ? { status: { not: StrategicVisionStatus.ARCHIVED } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { statement: { contains: search, mode: 'insensitive' } },
              { horizonLabel: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.strategicVision.findMany({
      where,
      include: strategicVisionInclude,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getKpis(clientId: string): Promise<StrategicVisionKpisResponseDto> {
    const { alignedActiveProjectsCount: _ignored, ...globalKpis } =
      await this.computeKpis(clientId);
    return globalKpis;
  }

  async getKpisByDirection(
    clientId: string,
  ): Promise<StrategicVisionKpisByDirectionResponseDto> {
    const now = new Date();
    const activeProjectIds = (
      await this.prisma.project.findMany({
        where: activePortfolioProjectsWhere(clientId),
        select: { id: true },
      })
    ).map((project) => project.id);

    const [globalKpisRaw, referencedDirectionIds, activeDirections] = await Promise.all([
      this.computeKpis(clientId, { now, activeProjectIds }),
      this.prisma.strategicObjective.findMany({
        where: { clientId, directionId: { not: null } },
        select: { directionId: true },
        distinct: ['directionId'],
      }),
      this.prisma.strategicDirection.findMany({
        where: { clientId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
    ]);

    const referencedIds = new Set(
      referencedDirectionIds
        .map((item) => item.directionId)
        .filter((value): value is string => Boolean(value)),
    );
    const activeDirectionIds = new Set(activeDirections.map((direction) => direction.id));

    const inactiveReferencedDirections =
      referencedIds.size === 0
        ? []
        : await this.prisma.strategicDirection.findMany({
            where: {
              clientId,
              id: {
                in: [...referencedIds].filter((id) => !activeDirectionIds.has(id)),
              },
            },
            orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
          });

    const orderedDirections = [...activeDirections, ...inactiveReferencedDirections];
    const rows: StrategicVisionKpisByDirectionResponseDto['rows'] = [];

    for (const direction of orderedDirections) {
      const directionKpis = await this.computeKpis(clientId, {
        directionId: direction.id,
        now,
        activeProjectIds,
      });
      rows.push({
        directionId: direction.id,
        directionCode: direction.code,
        directionName: direction.name,
        projectAlignmentRate: directionKpis.projectAlignmentRate,
        unalignedProjectsCount: directionKpis.unalignedProjectsCount,
        objectivesAtRiskCount: directionKpis.objectivesAtRiskCount,
        objectivesOffTrackCount: directionKpis.objectivesOffTrackCount,
        overdueObjectivesCount: directionKpis.overdueObjectivesCount,
        alignedActiveProjectsCount: directionKpis.alignedActiveProjectsCount,
        totalActiveProjectsRelevantCount: directionKpis.alignedActiveProjectsCount,
      });
    }

    const unassignedKpis = await this.computeKpis(clientId, {
      directionId: null,
      now,
      activeProjectIds,
    });
    rows.push({
      directionId: null,
      directionCode: 'UNASSIGNED',
      directionName: 'Non affecté',
      projectAlignmentRate: unassignedKpis.projectAlignmentRate,
      unalignedProjectsCount: unassignedKpis.unalignedProjectsCount,
      objectivesAtRiskCount: unassignedKpis.objectivesAtRiskCount,
      objectivesOffTrackCount: unassignedKpis.objectivesOffTrackCount,
      overdueObjectivesCount: unassignedKpis.overdueObjectivesCount,
      alignedActiveProjectsCount: unassignedKpis.alignedActiveProjectsCount,
      totalActiveProjectsRelevantCount: unassignedKpis.alignedActiveProjectsCount,
    });

    const { alignedActiveProjectsCount: _ignored, ...global } = globalKpisRaw;
    return {
      rows,
      global,
      generatedAt: now.toISOString(),
    };
  }

  async getAlerts(
    clientId: string,
    filters?: { directionId?: string; unassigned?: boolean },
  ): Promise<StrategicVisionAlertsResponseDto> {
    const now = new Date();
    if (filters?.directionId && filters.unassigned) {
      throw new BadRequestException(
        'directionId and unassigned filters cannot be used together',
      );
    }
    if (filters?.directionId) {
      await this.resolveDirectionForClient(clientId, filters.directionId);
    }

    const objectiveFilter: Prisma.StrategicObjectiveWhereInput = {
      clientId,
      ...(filters?.directionId ? { directionId: filters.directionId } : {}),
      ...(filters?.unassigned ? { directionId: null } : {}),
    };

    const [overdueObjectives, offTrackObjectives] = await Promise.all([
      this.prisma.strategicObjective.findMany({
        where: {
          ...objectiveFilter,
          OR: [
            { targetDate: { lt: now } },
            {
              AND: [{ targetDate: null }, { deadline: { not: null, lt: now } }],
            },
          ],
          status: { notIn: [...OBJECTIVE_TERMINAL_STATUSES] },
        },
        select: {
          id: true,
          title: true,
          targetDate: true,
          deadline: true,
          createdAt: true,
          updatedAt: true,
          directionId: true,
          direction: {
            select: { name: true },
          },
        },
        orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.strategicObjective.findMany({
        where: {
          ...objectiveFilter,
          status: { in: [...OBJECTIVE_OFF_TRACK_STATUSES] },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          directionId: true,
          direction: {
            select: { name: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const activeProjects = await this.prisma.project.findMany({
      where: activePortfolioProjectsWhere(clientId),
      select: {
        id: true,
        code: true,
        name: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    const activeProjectIds = activeProjects.map((project) => project.id);
    const alignedProjectLinks =
      activeProjectIds.length === 0
        ? []
        : await this.prisma.strategicLink.findMany({
            where: {
              clientId,
              linkType: StrategicLinkType.PROJECT,
              targetId: { in: activeProjectIds },
              ...(filters?.directionId
                ? { objective: { directionId: filters.directionId } }
                : {}),
              ...(filters?.unassigned ? { objective: { directionId: null } } : {}),
            },
            select: { targetId: true },
            distinct: ['targetId'],
          });
    const alignedProjectIds = new Set(alignedProjectLinks.map((link) => link.targetId));

    const overdueAlerts = overdueObjectives.map((objective) => ({
      id: `strategic-objective-overdue:${objective.id}`,
      type: 'OBJECTIVE_OVERDUE' as const,
      severity: 'HIGH' as const,
      targetType: 'OBJECTIVE' as const,
      directionId: objective.directionId,
      directionName: objective.direction?.name ?? 'Non affecté',
      targetLabel: objective.title,
      message: `Objectif en retard: ${objective.title}`,
      createdAt: (
        objective.targetDate ??
        objective.updatedAt ??
        objective.createdAt
      ).toISOString(),
    }));

    const offTrackAlerts = offTrackObjectives.map((objective) => ({
      id: `strategic-objective-off-track:${objective.id}`,
      type: 'OBJECTIVE_OFF_TRACK' as const,
      severity: 'CRITICAL' as const,
      targetType: 'OBJECTIVE' as const,
      directionId: objective.directionId,
      directionName: objective.direction?.name ?? 'Non affecté',
      targetLabel: objective.title,
      message: `Objectif hors trajectoire: ${objective.title}`,
      createdAt: (objective.updatedAt ?? objective.createdAt).toISOString(),
    }));

    const unalignedProjectAlerts = activeProjects
      .filter((project) => !alignedProjectIds.has(project.id))
      .map((project) => {
        const targetLabel = [project.code, project.name].filter(Boolean).join(' - ');
        return {
          id: `strategic-project-unaligned:${project.id}`,
          type: 'PROJECT_UNALIGNED' as const,
          severity: 'MEDIUM' as const,
          targetType: 'PROJECT' as const,
          directionId: null,
          directionName: 'Non affecté',
          targetLabel: targetLabel || 'Projet sans libelle',
          message: `Projet non aligne: ${targetLabel || 'Projet sans libelle'}`,
          createdAt: (project.updatedAt ?? project.createdAt).toISOString(),
        };
      });

    const items = [...overdueAlerts, ...offTrackAlerts, ...unalignedProjectAlerts].sort(
      (a, b) => {
        const severityDelta =
          (ALERT_SEVERITY_RANK[b.severity] ?? 0) - (ALERT_SEVERITY_RANK[a.severity] ?? 0);
        if (severityDelta !== 0) return severityDelta;
        const createdAtDelta = b.createdAt.localeCompare(a.createdAt);
        if (createdAtDelta !== 0) return createdAtDelta;
        return a.targetLabel.localeCompare(b.targetLabel, 'fr', { sensitivity: 'base' });
      },
    );

    return {
      items,
      total: items.length,
    };
  }

  async createVision(
    clientId: string,
    dto: CreateStrategicVisionDto,
    context?: StrategicAuditContext,
  ) {
    const payload = {
      title: dto.title.trim(),
      statement: dto.statement.trim(),
      horizonLabel: dto.horizonLabel.trim(),
    };

    const resolved = this.resolveVisionStatus({
      status: dto.status,
      isActive: dto.isActive ?? true,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      if (resolved.isActive) {
        await tx.strategicVision.updateMany({
          where: { clientId, isActive: true },
          data: { isActive: false, status: StrategicVisionStatus.DRAFT },
        });
      }

      return tx.strategicVision.create({
        data: {
          clientId,
          ...payload,
          isActive: resolved.isActive,
          status: resolved.status,
        },
      });
    });

    await this.audit(
      clientId,
      context,
      'strategic_vision.created',
      'strategic_vision',
      created.id,
      undefined,
      {
        ...payload,
        isActive: resolved.isActive,
        status: resolved.status,
      } as Prisma.JsonObject,
    );

    return this.getVisionById(clientId, created.id);
  }

  async getVisionById(clientId: string, id: string) {
    const found = await this.prisma.strategicVision.findFirst({
      where: { id, clientId },
      include: strategicVisionInclude,
    });
    if (!found) throw new NotFoundException('Strategic vision not found');
    return found;
  }

  async updateVision(
    clientId: string,
    id: string,
    dto: UpdateStrategicVisionDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicVision.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic vision not found');

    if (
      existing.status === StrategicVisionStatus.ARCHIVED &&
      dto.status !== StrategicVisionStatus.ARCHIVED
    ) {
      throw new BadRequestException('archived strategic vision cannot be modified');
    }

    if (dto.isActive === false && existing.isActive && dto.status === undefined) {
      throw new BadRequestException(
        'active strategic vision cannot be deactivated directly',
      );
    }

    const resolved = this.resolveVisionStatus({
      status: dto.status,
      isActive: dto.isActive,
      currentStatus: existing.status,
      currentIsActive: existing.isActive,
    });

    const data: Prisma.StrategicVisionUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.statement !== undefined) data.statement = dto.statement.trim();
    if (dto.horizonLabel !== undefined) data.horizonLabel = dto.horizonLabel.trim();
    if (dto.isActive !== undefined || dto.status !== undefined) {
      data.isActive = resolved.isActive;
      data.status = resolved.status;
    }

    if (Object.keys(data).length === 0) {
      return this.getVisionById(clientId, id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (resolved.isActive) {
        await tx.strategicVision.updateMany({
          where: { clientId, isActive: true, id: { not: id } },
          data: { isActive: false, status: StrategicVisionStatus.DRAFT },
        });
      }
      return tx.strategicVision.update({
        where: { id },
        data,
      });
    });

    await this.audit(
      clientId,
      context,
      'strategic_vision.updated',
      'strategic_vision',
      id,
      {
        title: existing.title,
        statement: existing.statement,
        horizonLabel: existing.horizonLabel,
        isActive: existing.isActive,
        status: existing.status,
      },
      {
        title: updated.title,
        statement: updated.statement,
        horizonLabel: updated.horizonLabel,
        isActive: updated.isActive,
        status: updated.status,
      },
    );

    return this.getVisionById(clientId, id);
  }

  async archiveVision(
    clientId: string,
    id: string,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicVision.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic vision not found');

    if (existing.status === StrategicVisionStatus.ARCHIVED) {
      return this.getVisionById(clientId, id);
    }

    await this.prisma.strategicVision.update({
      where: { id },
      data: {
        status: StrategicVisionStatus.ARCHIVED,
        isActive: false,
      },
    });

    await this.audit(
      clientId,
      context,
      'strategic_vision.archived',
      'strategic_vision',
      id,
      { status: existing.status, isActive: existing.isActive },
      { status: StrategicVisionStatus.ARCHIVED, isActive: false },
    );

    return this.getVisionById(clientId, id);
  }

  async listAxes(clientId: string) {
    return this.prisma.strategicAxis.findMany({
      where: { clientId },
      include: {
        objectives: {
          orderBy: { createdAt: 'asc' },
          include: {
            direction: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listDirections(clientId: string, query: ListStrategicDirectionsQueryDto) {
    return this.prisma.strategicDirection.findMany({
      where: {
        clientId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search?.trim()
          ? {
              OR: [
                { code: { contains: query.search.trim(), mode: 'insensitive' } },
                { name: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async createDirection(
    clientId: string,
    dto: CreateStrategicDirectionDto,
    context?: StrategicAuditContext,
  ) {
    const payload = {
      clientId,
      code: this.normalizeDirectionCode(dto.code),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    };
    try {
      const created = await this.prisma.strategicDirection.create({ data: payload });
      await this.audit(
        clientId,
        context,
        'strategic_direction.created',
        'strategic_direction',
        created.id,
        undefined,
        {
          code: created.code,
          name: created.name,
          sortOrder: created.sortOrder,
          isActive: created.isActive,
        },
      );
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('strategic direction code already exists');
      }
      throw error;
    }
  }

  async updateDirection(
    clientId: string,
    directionId: string,
    dto: UpdateStrategicDirectionDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirection.findFirst({
      where: { id: directionId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction not found');

    const data: Prisma.StrategicDirectionUncheckedUpdateInput = {};
    if (dto.code !== undefined) data.code = this.normalizeDirectionCode(dto.code);
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (Object.keys(data).length === 0) return existing;

    try {
      const updated = await this.prisma.strategicDirection.update({
        where: { id: directionId },
        data,
      });
      await this.audit(
        clientId,
        context,
        'strategic_direction.updated',
        'strategic_direction',
        directionId,
        {
          code: existing.code,
          name: existing.name,
          description: existing.description,
          sortOrder: existing.sortOrder,
          isActive: existing.isActive,
        },
        {
          code: updated.code,
          name: updated.name,
          description: updated.description,
          sortOrder: updated.sortOrder,
          isActive: updated.isActive,
        },
      );
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('strategic direction code already exists');
      }
      throw error;
    }
  }

  async deleteDirection(
    clientId: string,
    directionId: string,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirection.findFirst({
      where: { id: directionId, clientId },
      include: {
        _count: {
          select: {
            strategies: {
              where: { NOT: { status: StrategicDirectionStrategyStatus.ARCHIVED } },
            },
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Strategic direction not found');
    }
    if (existing._count.strategies > 0) {
      throw new BadRequestException(
        'Cannot delete strategic direction while strategic direction strategies exist; remove or reassign them first',
      );
    }
    await this.prisma.strategicDirection.delete({
      where: { id: directionId },
    });
    await this.audit(
      clientId,
      context,
      'strategic_direction.deleted',
      'strategic_direction',
      directionId,
      {
        code: existing.code,
        name: existing.name,
        description: existing.description,
        sortOrder: existing.sortOrder,
        isActive: existing.isActive,
      },
      undefined,
    );
  }

  async listAxesByVision(clientId: string, visionId: string) {
    await this.assertVisionInClient(clientId, visionId);
    return this.prisma.strategicAxis.findMany({
      where: { clientId, visionId },
      include: {
        objectives: {
          orderBy: { createdAt: 'asc' },
          include: {
            direction: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { orderIndex: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getAxisById(clientId: string, visionId: string, axisId: string) {
    const axis = await this.prisma.strategicAxis.findFirst({
      where: { id: axisId, clientId, visionId },
      include: {
        objectives: {
          orderBy: { createdAt: 'asc' },
          include: {
            direction: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
    if (!axis) throw new NotFoundException('Strategic axis not found');
    return axis;
  }

  private async assertVisionInClient(
    clientId: string,
    visionId: string,
    options?: { mustNotBeArchived?: boolean },
  ) {
    const vision = await this.prisma.strategicVision.findFirst({
      where: { id: visionId, clientId },
      select: { id: true, status: true },
    });
    if (!vision) {
      throw new BadRequestException('strategic vision not found for active client');
    }
    if (
      options?.mustNotBeArchived &&
      vision.status === StrategicVisionStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'cannot create or modify axis on archived strategic vision',
      );
    }
    return vision;
  }

  async createAxis(
    clientId: string,
    dto: CreateStrategicAxisDto,
    context?: StrategicAuditContext,
  ) {
    await this.assertVisionInClient(clientId, dto.visionId, {
      mustNotBeArchived: true,
    });

    const created = await this.prisma.strategicAxis.create({
      data: {
        clientId,
        visionId: dto.visionId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        code: dto.code?.trim() || null,
        sortOrder: dto.sortOrder ?? null,
        orderIndex: dto.orderIndex ?? null,
        status: dto.status ?? StrategicAxisStatus.ACTIVE,
      },
    });

    await this.audit(
      clientId,
      context,
      'strategic_axis.created',
      'strategic_axis',
      created.id,
      undefined,
      {
        visionId: created.visionId,
        name: created.name,
        code: created.code,
        sortOrder: created.sortOrder,
        orderIndex: created.orderIndex,
        status: created.status,
      },
    );

    return created;
  }

  async updateAxis(
    clientId: string,
    axisId: string,
    dto: UpdateStrategicAxisDto,
    context?: StrategicAuditContext,
    options?: { visionId?: string },
  ) {
    const existing = await this.prisma.strategicAxis.findFirst({
      where: {
        id: axisId,
        clientId,
        ...(options?.visionId ? { visionId: options.visionId } : {}),
      },
    });
    if (!existing) throw new NotFoundException('Strategic axis not found');

    if (existing.status === StrategicAxisStatus.ARCHIVED && dto.status !== StrategicAxisStatus.ARCHIVED) {
      throw new BadRequestException('archived strategic axis cannot be modified');
    }

    await this.assertVisionInClient(clientId, existing.visionId, {
      mustNotBeArchived: true,
    });

    const data: Prisma.StrategicAxisUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;
    if (dto.status !== undefined) data.status = dto.status;

    if (Object.keys(data).length === 0) return existing;

    const updated = await this.prisma.strategicAxis.update({
      where: { id: axisId },
      data,
    });

    await this.audit(
      clientId,
      context,
      'strategic_axis.updated',
      'strategic_axis',
      axisId,
      {
        name: existing.name,
        description: existing.description,
        code: existing.code,
        sortOrder: existing.sortOrder,
        orderIndex: existing.orderIndex,
        status: existing.status,
      },
      {
        name: updated.name,
        description: updated.description,
        code: updated.code,
        sortOrder: updated.sortOrder,
        orderIndex: updated.orderIndex,
        status: updated.status,
      },
    );

    return updated;
  }

  async archiveAxis(
    clientId: string,
    visionId: string,
    axisId: string,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicAxis.findFirst({
      where: { id: axisId, clientId, visionId },
    });
    if (!existing) throw new NotFoundException('Strategic axis not found');

    if (existing.status === StrategicAxisStatus.ARCHIVED) {
      return existing;
    }

    const updated = await this.prisma.strategicAxis.update({
      where: { id: axisId },
      data: { status: StrategicAxisStatus.ARCHIVED },
    });

    await this.audit(
      clientId,
      context,
      'strategic_axis.archived',
      'strategic_axis',
      axisId,
      { status: existing.status },
      { status: updated.status },
    );

    return updated;
  }

  async listObjectives(clientId: string, userId?: string) {
    const rows = await this.prisma.strategicObjective.findMany({
      where: { clientId },
      include: {
        direction: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        links: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (!userId) return rows;
    const readableIds = await this.accessControl.filterReadableResourceIds({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.STRATEGIC_OBJECTIVE,
      resourceIds: rows.map((row) => row.id),
      operation: 'read',
    });
    const readableSet = new Set(readableIds);
    return rows.filter((row) => readableSet.has(row.id));
  }

  async createObjective(
    clientId: string,
    dto: CreateStrategicObjectiveDto,
    context?: StrategicAuditContext,
  ) {
    const axis = await this.prisma.strategicAxis.findFirst({
      where: { id: dto.axisId, clientId },
      select: { id: true, status: true, visionId: true },
    });
    if (!axis) {
      throw new BadRequestException('strategic axis not found for active client');
    }
    if (axis.status === StrategicAxisStatus.ARCHIVED) {
      throw new BadRequestException('cannot create objective on archived axis');
    }
    await this.assertVisionInClient(clientId, axis.visionId, {
      mustNotBeArchived: true,
    });
    if (dto.directionId) {
      await this.resolveDirectionForClient(clientId, dto.directionId);
    }
    if (dto.ownerUserId) {
      await this.assertUserInClient(clientId, dto.ownerUserId);
    }

    this.assertPercentBounds('progressPercent', dto.progressPercent);

    const resolvedStatuses = this.resolveObjectiveStatuses({
      status: dto.status,
      lifecycleStatus: dto.lifecycleStatus,
      healthStatus: dto.healthStatus,
    });

    const targetDate = dto.targetDate ?? dto.deadline ?? null;
    const deadline = dto.deadline ?? dto.targetDate ?? null;

    const created = await this.prisma.strategicObjective.create({
      data: {
        clientId,
        axisId: dto.axisId,
        directionId: dto.directionId ?? null,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        ownerLabel: dto.ownerLabel?.trim() || null,
        ownerUserId: dto.ownerUserId ?? null,
        status: resolvedStatuses.status,
        lifecycleStatus: resolvedStatuses.lifecycleStatus,
        healthStatus: resolvedStatuses.healthStatus,
        progressPercent: dto.progressPercent ?? null,
        deadline,
        targetDate,
      },
    });

    await this.audit(
      clientId,
      context,
      'strategic_objective.created',
      'strategic_objective',
      created.id,
      undefined,
      {
        axisId: created.axisId,
        directionId: created.directionId,
        title: created.title,
        status: created.status,
        lifecycleStatus: created.lifecycleStatus,
        healthStatus: created.healthStatus,
        progressPercent: created.progressPercent,
        targetDate: created.targetDate?.toISOString() ?? null,
        ownerUserId: created.ownerUserId,
      },
    );

    return this.getObjectiveById(clientId, created.id);
  }

  private async assertUserInClient(clientId: string, userId: string) {
    const link = await this.prisma.clientUser.findFirst({
      where: { clientId, userId },
      select: { id: true },
    });
    if (!link) {
      throw new BadRequestException('owner user not found for active client');
    }
  }

  async updateObjective(
    clientId: string,
    objectiveId: string,
    dto: UpdateStrategicObjectiveDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic objective not found');
    if (context?.actorUserId) {
      await this.assertCanWriteObjective(clientId, context.actorUserId, objectiveId);
    }

    if (
      existing.lifecycleStatus === StrategicObjectiveLifecycleStatus.ARCHIVED &&
      dto.lifecycleStatus !== StrategicObjectiveLifecycleStatus.ARCHIVED &&
      dto.status !== StrategicObjectiveStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'archived strategic objective cannot be modified',
      );
    }

    const resolvedStatuses =
      dto.status !== undefined ||
      dto.lifecycleStatus !== undefined ||
      dto.healthStatus !== undefined
        ? this.resolveObjectiveStatuses({
            status: dto.status,
            lifecycleStatus: dto.lifecycleStatus,
            healthStatus: dto.healthStatus,
            currentStatus: existing.status,
            currentLifecycleStatus: existing.lifecycleStatus,
            currentHealthStatus: existing.healthStatus,
          })
        : null;

    const data: Prisma.StrategicObjectiveUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.ownerLabel !== undefined) data.ownerLabel = dto.ownerLabel?.trim() || null;
    if (dto.ownerUserId !== undefined) {
      if (dto.ownerUserId) {
        await this.assertUserInClient(clientId, dto.ownerUserId);
        data.ownerUserId = dto.ownerUserId;
      } else {
        data.ownerUserId = null;
      }
    }
    if (resolvedStatuses) {
      data.status = resolvedStatuses.status;
      data.lifecycleStatus = resolvedStatuses.lifecycleStatus;
      data.healthStatus = resolvedStatuses.healthStatus;
    }
    if (dto.progressPercent !== undefined) {
      this.assertPercentBounds('progressPercent', dto.progressPercent);
      data.progressPercent = dto.progressPercent;
    }
    if (dto.deadline !== undefined) data.deadline = dto.deadline ?? null;
    if (dto.targetDate !== undefined) data.targetDate = dto.targetDate ?? null;
    if (dto.directionId !== undefined) {
      if (dto.directionId) {
        await this.resolveDirectionForClient(clientId, dto.directionId);
        data.directionId = dto.directionId;
      } else {
        data.directionId = null;
      }
    }

    if (Object.keys(data).length === 0) return this.getObjectiveById(clientId, objectiveId);

    const updated = await this.prisma.strategicObjective.update({
      where: { id: objectiveId },
      data,
    });

    await this.audit(
      clientId,
      context,
      'strategic_objective.updated',
      'strategic_objective',
      objectiveId,
      {
        title: existing.title,
        description: existing.description,
        ownerLabel: existing.ownerLabel,
        ownerUserId: existing.ownerUserId,
        status: existing.status,
        lifecycleStatus: existing.lifecycleStatus,
        healthStatus: existing.healthStatus,
        progressPercent: existing.progressPercent,
        deadline: existing.deadline?.toISOString() ?? null,
        targetDate: existing.targetDate?.toISOString() ?? null,
        directionId: existing.directionId,
      },
      {
        title: updated.title,
        description: updated.description,
        ownerLabel: updated.ownerLabel,
        ownerUserId: updated.ownerUserId,
        status: updated.status,
        lifecycleStatus: updated.lifecycleStatus,
        healthStatus: updated.healthStatus,
        progressPercent: updated.progressPercent,
        deadline: updated.deadline?.toISOString() ?? null,
        targetDate: updated.targetDate?.toISOString() ?? null,
        directionId: updated.directionId,
      },
    );

    if (existing.status !== updated.status) {
      await this.audit(
        clientId,
        context,
        'strategic_objective.status_changed',
        'strategic_objective',
        objectiveId,
        { status: existing.status },
        { status: updated.status },
      );
    }
    if (existing.directionId !== updated.directionId) {
      await this.audit(
        clientId,
        context,
        'strategic_objective.direction_changed',
        'strategic_objective',
        objectiveId,
        { directionId: existing.directionId },
        { directionId: updated.directionId },
      );
    }

    return this.getObjectiveById(clientId, objectiveId);
  }

  async archiveObjective(
    clientId: string,
    objectiveId: string,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic objective not found');
    if (context?.actorUserId) {
      await this.assertCanAdminObjective(clientId, context.actorUserId, objectiveId);
    }

    if (existing.lifecycleStatus === StrategicObjectiveLifecycleStatus.ARCHIVED) {
      return this.getObjectiveById(clientId, objectiveId);
    }

    await this.prisma.strategicObjective.update({
      where: { id: objectiveId },
      data: {
        status: StrategicObjectiveStatus.ARCHIVED,
        lifecycleStatus: StrategicObjectiveLifecycleStatus.ARCHIVED,
        healthStatus: null,
      },
    });

    await this.audit(
      clientId,
      context,
      'strategic_objective.archived',
      'strategic_objective',
      objectiveId,
      {
        status: existing.status,
        lifecycleStatus: existing.lifecycleStatus,
        healthStatus: existing.healthStatus,
      },
      {
        status: StrategicObjectiveStatus.ARCHIVED,
        lifecycleStatus: StrategicObjectiveLifecycleStatus.ARCHIVED,
        healthStatus: null,
      },
    );

    return this.getObjectiveById(clientId, objectiveId);
  }

  async listObjectivesByAxis(clientId: string, axisId: string, userId?: string) {
    const axis = await this.prisma.strategicAxis.findFirst({
      where: { id: axisId, clientId },
      select: { id: true },
    });
    if (!axis) throw new NotFoundException('Strategic axis not found');

    const rows = await this.prisma.strategicObjective.findMany({
      where: { clientId, axisId },
      include: {
        direction: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        links: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    if (!userId) return rows;
    const readableIds = await this.accessControl.filterReadableResourceIds({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.STRATEGIC_OBJECTIVE,
      resourceIds: rows.map((row) => row.id),
      operation: 'read',
    });
    const readableSet = new Set(readableIds);
    return rows.filter((row) => readableSet.has(row.id));
  }

  async getObjectiveById(clientId: string, objectiveId: string, userId?: string) {
    const objective = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
      include: {
        direction: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
        links: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!objective) throw new NotFoundException('Strategic objective not found');
    if (userId) {
      await this.assertCanReadObjective(clientId, userId, objectiveId);
    }
    return objective;
  }

  async listObjectiveLinks(clientId: string, objectiveId: string, userId?: string) {
    const objective = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
      select: { id: true },
    });
    if (!objective) throw new NotFoundException('Strategic objective not found');
    if (userId) {
      await this.assertCanReadObjective(clientId, userId, objectiveId);
    }

    return this.prisma.strategicLink.findMany({
      where: { clientId, objectiveId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addObjectiveLink(
    clientId: string,
    objectiveId: string,
    dto: CreateStrategicLinkDto,
    context?: StrategicAuditContext,
  ) {
    const objective = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
      select: { id: true },
    });
    if (!objective) throw new NotFoundException('Strategic objective not found');
    if (context?.actorUserId) {
      await this.assertCanWriteObjective(clientId, context.actorUserId, objectiveId);
    }

    const linkType = this.resolveLinkType(dto);
    this.assertWritableLinkTypeV1(linkType);
    this.assertPercentBounds('alignmentScore', dto.alignmentScore);

    let targetId: string | undefined;
    if (linkType === StrategicLinkType.PROJECT) {
      if (!dto.targetId) {
        throw new BadRequestException('targetId is required for PROJECT link');
      }
      const project = await this.prisma.project.findFirst({
        where: { id: dto.targetId, clientId },
        select: { id: true },
      });
      if (!project) {
        throw new BadRequestException('target project not found for active client');
      }
      targetId = dto.targetId;
    } else {
      const labelTrimmed = dto.targetLabelSnapshot?.trim();
      if (!labelTrimmed) {
        throw new BadRequestException(
          'targetLabelSnapshot is required for MANUAL link',
        );
      }
      targetId = dto.targetId?.trim() || this.buildManualTargetId();
    }

    const payload: Prisma.StrategicLinkUncheckedCreateInput = {
      clientId,
      objectiveId,
      linkType,
      targetId: targetId!,
      targetLabelSnapshot: (dto.targetLabelSnapshot ?? '').trim(),
      alignmentScore: dto.alignmentScore ?? null,
      comment: dto.comment?.trim() || null,
    };

    if (!payload.targetLabelSnapshot) {
      throw new BadRequestException('targetLabelSnapshot is required');
    }

    try {
      const created = await this.prisma.strategicLink.create({
        data: payload,
      });
      await this.audit(
        clientId,
        context,
        'strategic_link.created',
        'strategic_link',
        created.id,
        undefined,
        {
          objectiveId: created.objectiveId,
          linkType: created.linkType,
          targetId: created.targetId,
          targetLabelSnapshot: created.targetLabelSnapshot,
          alignmentScore: created.alignmentScore,
          comment: created.comment,
        },
      );
      await this.audit(
        clientId,
        context,
        'strategic_objective.link_added',
        'strategic_link',
        created.id,
        undefined,
        {
          objectiveId: created.objectiveId,
          linkType: created.linkType,
          targetId: created.targetId,
          targetLabelSnapshot: created.targetLabelSnapshot,
        },
      );
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('strategic link already exists for objective');
      }
      throw error;
    }
  }

  async updateObjectiveLink(
    clientId: string,
    objectiveId: string,
    linkId: string,
    dto: UpdateStrategicLinkDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicLink.findFirst({
      where: { id: linkId, objectiveId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic link not found');
    if (context?.actorUserId) {
      await this.assertCanWriteObjective(clientId, context.actorUserId, objectiveId);
    }

    const data: Prisma.StrategicLinkUncheckedUpdateInput = {};
    if (dto.targetLabelSnapshot !== undefined) {
      const trimmed = dto.targetLabelSnapshot.trim();
      if (!trimmed) {
        throw new BadRequestException('targetLabelSnapshot must not be empty');
      }
      data.targetLabelSnapshot = trimmed;
    }
    if (dto.alignmentScore !== undefined) {
      this.assertPercentBounds('alignmentScore', dto.alignmentScore);
      data.alignmentScore = dto.alignmentScore;
    }
    if (dto.comment !== undefined) data.comment = dto.comment?.trim() || null;

    if (Object.keys(data).length === 0) return existing;

    const updated = await this.prisma.strategicLink.update({
      where: { id: linkId },
      data,
    });

    await this.audit(
      clientId,
      context,
      'strategic_link.updated',
      'strategic_link',
      linkId,
      {
        targetLabelSnapshot: existing.targetLabelSnapshot,
        alignmentScore: existing.alignmentScore,
        comment: existing.comment,
      },
      {
        targetLabelSnapshot: updated.targetLabelSnapshot,
        alignmentScore: updated.alignmentScore,
        comment: updated.comment,
      },
    );

    return updated;
  }

  async removeObjectiveLink(
    clientId: string,
    objectiveId: string,
    linkId: string,
    context?: StrategicAuditContext,
  ) {
    const link = await this.prisma.strategicLink.findFirst({
      where: { id: linkId, objectiveId, clientId },
    });
    if (!link) throw new NotFoundException('Strategic link not found');
    if (context?.actorUserId) {
      await this.assertCanAdminObjective(clientId, context.actorUserId, objectiveId);
    }

    await this.prisma.strategicLink.delete({ where: { id: linkId } });

    await this.audit(
      clientId,
      context,
      'strategic_link.deleted',
      'strategic_link',
      linkId,
      {
        objectiveId: link.objectiveId,
        linkType: link.linkType,
        targetId: link.targetId,
      },
      undefined,
    );
    await this.audit(
      clientId,
      context,
      'strategic_objective.link_removed',
      'strategic_link',
      linkId,
      {
        objectiveId: link.objectiveId,
        linkType: link.linkType,
        targetId: link.targetId,
      },
      undefined,
    );
  }
}
