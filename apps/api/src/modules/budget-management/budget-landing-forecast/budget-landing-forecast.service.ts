import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetLinePlanningMode,
  BudgetLineStatus,
  BudgetSnapshotStatus,
  Prisma,
} from '@prisma/client';
import { defaultReferenceDateUtc } from '@starium-orchestra/budget-exercise-calendar';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { ClientBudgetWorkflowSettingsService } from '../../clients/client-budget-workflow-settings.service';
import { BudgetSnapshotsService } from '../../budget-snapshots/budget-snapshots.service';
import { PA_SNAPSHOT_OCCASION_CODES } from '../../budget-snapshots/budget-pa-snapshot.constants';
import {
  parseSnapshotPlanningMonths,
  isBudgetLinePlanningMode,
} from '../../budget-snapshots/budget-snapshot-planning.util';
import { BudgetLandingService } from '../../budget-landing/budget-landing.service';
import { AuditContext } from '../types/audit-context';
import {
  parseArbitratedSnapshotIdFromAudit,
  resolvePaSession,
  type PaAuditRef,
  type PaSnapshotRef,
} from './pa-session.util';
import {
  remainingPlanningMonthIndexes,
  splitAmountAcrossMonths,
} from '../budget-lines/budget-line-mid-year-planning.util';

const VALIDATE_ACTION = 'budget.landing_forecast.validated';
const APPLY_ACTION = 'budget.landing_forecast.applied';

export type LandingForecastApplyDiff = {
  lineName: string;
  code: string;
  message: string;
};

export type LandingForecastState = {
  enabled: boolean;
  status: ReturnType<typeof resolvePaSession>['status'];
  staleSession: boolean;
  baseline: {
    id: string;
    name: string;
    code: string;
    createdAt: string;
  } | null;
  arbitrated: {
    id: string;
    name: string;
    code: string;
    createdAt: string;
  } | null;
  pendingStructuralLines: Array<{
    id: string;
    name: string;
    description: string | null;
    status: BudgetLineStatus;
  }>;
};

function toPublicSnap(ref: PaSnapshotRef | null) {
  if (!ref) return null;
  return {
    id: ref.id,
    name: ref.name,
    code: ref.code,
    createdAt: ref.createdAt.toISOString(),
  };
}

function moneyEquals(a: Prisma.Decimal | number, b: Prisma.Decimal | number): boolean {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
}

@Injectable()
export class BudgetLandingForecastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly workflowSettings: ClientBudgetWorkflowSettingsService,
    private readonly snapshots: BudgetSnapshotsService,
    private readonly landingService: BudgetLandingService,
  ) {}

  async getState(clientId: string, budgetId: string): Promise<LandingForecastState> {
    const budget = await this.requireBudget(clientId, budgetId);
    const config = await this.workflowSettings.getResolvedForClient(clientId);
    const session = await this.loadSession(clientId, budget.id);
    const pendingStructuralLines = await this.prisma.budgetLine.findMany({
      where: {
        clientId,
        budgetId: budget.id,
        status: {
          in: [BudgetLineStatus.DRAFT, BudgetLineStatus.PENDING_VALIDATION],
        },
      },
      select: { id: true, name: true, description: true, status: true },
      orderBy: { name: 'asc' },
    });
    return {
      enabled: config.landingForecastEnabled,
      status: session.status,
      staleSession: session.staleSession,
      baseline: toPublicSnap(session.baseline),
      arbitrated: toPublicSnap(session.arbitrated),
      pendingStructuralLines,
    };
  }

  async validate(
    clientId: string,
    budgetId: string,
    arbitratedSnapshotId: string,
    context?: AuditContext,
  ): Promise<LandingForecastState> {
    const budget = await this.requireBudget(clientId, budgetId);
    await this.assertEnabled(clientId);
    const session = await this.loadSession(clientId, budget.id);
    if (!session.arbitrated || session.arbitrated.id !== arbitratedSnapshotId) {
      throw new ConflictException({
        code: 'pa_arbitrated_required',
        message:
          'Une version figée de scénario (PA — scénario arbitré) est requise pour valider la prévision d’atterrissage.',
      });
    }
    if (session.status === 'APPLIED') {
      throw new ConflictException({
        code: 'pa_already_applied',
        message: 'Cette prévision d’atterrissage a déjà été activée.',
      });
    }

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: VALIDATE_ACTION,
      resourceType: 'budget',
      resourceId: budget.id,
      newValue: { arbitratedSnapshotId: session.arbitrated.id },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);
    return this.getState(clientId, budget.id);
  }

  async apply(
    clientId: string,
    budgetId: string,
    arbitratedSnapshotId: string,
    context?: AuditContext,
  ): Promise<LandingForecastState> {
    const budget = await this.requireBudget(clientId, budgetId);
    await this.assertEnabled(clientId);
    const session = await this.loadSession(clientId, budget.id);
    if (session.status === 'APPLIED' && session.arbitrated?.id === arbitratedSnapshotId) {
      throw new ConflictException({
        code: 'pa_already_applied',
        message: 'Cette prévision d’atterrissage a déjà été activée.',
      });
    }
    if (session.status !== 'VALIDATED' || session.arbitrated?.id !== arbitratedSnapshotId) {
      throw new ConflictException({
        code: 'pa_arbitrated_required',
        message:
          'Validez le scénario arbitré avant d’activer la prévision d’atterrissage.',
      });
    }

    const snapshot = await this.prisma.budgetSnapshot.findFirst({
      where: {
        id: arbitratedSnapshotId,
        clientId,
        budgetId: budget.id,
        status: BudgetSnapshotStatus.ACTIVE,
        occasionType: { code: PA_SNAPSHOT_OCCASION_CODES.ARBITRATED },
      },
      include: {
        lines: true,
        occasionType: { select: { code: true } },
      },
    });
    if (!snapshot) {
      throw new NotFoundException('Budget snapshot not found');
    }

    const missingPlanning: LandingForecastApplyDiff[] = [];
    const ceilingDrift: LandingForecastApplyDiff[] = [];
    const skippedMissingLive: LandingForecastApplyDiff[] = [];

    const liveLines = await this.prisma.budgetLine.findMany({
      where: { clientId, budgetId: budget.id },
      include: {
        budget: {
          include: { exercise: { select: { startDate: true, endDate: true } } },
        },
      },
    });
    const liveById = new Map(liveLines.map((l) => [l.id, l]));

    for (const snapLine of snapshot.lines) {
      const live = liveById.get(snapLine.budgetLineId);
      if (!live) {
        skippedMissingLive.push({
          lineName: snapLine.lineName,
          code: 'live_line_missing',
          message: `La ligne « ${snapLine.lineName} » n’existe plus sur le budget live.`,
        });
        continue;
      }
      const months = parseSnapshotPlanningMonths(snapLine.planningMonths);
      if (!months) {
        missingPlanning.push({
          lineName: snapLine.lineName,
          code: 'snapshot_missing_planning',
          message: `Plan 12 mois absent sur « ${snapLine.lineName} ».`,
        });
      }
      if (!moneyEquals(live.initialAmount, snapLine.initialAmount)) {
        ceilingDrift.push({
          lineName: snapLine.lineName,
          code: 'live_ceiling_diverged',
          message: `Le plafond de « ${snapLine.lineName} » a changé depuis le scénario figé.`,
        });
      }
    }

    if (missingPlanning.length > 0) {
      throw new ConflictException({
        code: 'snapshot_missing_planning',
        message: 'Re-figez le scénario après mise à jour',
        diffs: missingPlanning,
      });
    }
    if (ceilingDrift.length > 0) {
      throw new ConflictException({
        code: 'live_ceiling_diverged',
        message:
          'Le plafond live a divergé depuis le scénario figé. Re-figez le scénario arbitré.',
        diffs: ceilingDrift,
      });
    }

    const referenceDate = defaultReferenceDateUtc();

    await this.prisma.$transaction(async (tx) => {
      for (const snapLine of snapshot.lines) {
        const live = liveById.get(snapLine.budgetLineId);
        if (!live) continue;

        const months = parseSnapshotPlanningMonths(snapLine.planningMonths);
        let planning = months;
        if (!planning) {
          const indexes = remainingPlanningMonthIndexes(
            live.budget.exercise.startDate,
            live.budget.exercise.endDate,
            referenceDate,
          );
          planning = splitAmountAcrossMonths(Number(snapLine.initialAmount), indexes);
        }

        await tx.budgetLinePlanningMonth.deleteMany({
          where: { clientId, budgetLineId: live.id },
        });
        await tx.budgetLinePlanningMonth.createMany({
          data: planning.map((amount, idx) => ({
            clientId,
            budgetLineId: live.id,
            monthIndex: idx + 1,
            amount: new Prisma.Decimal(amount),
          })),
        });

        const planningTotal = planning.reduce((s, v) => s + v, 0);
        const mode = isBudgetLinePlanningMode(snapLine.planningMode)
          ? snapLine.planningMode
          : BudgetLinePlanningMode.MANUAL;

        const nextStatus =
          live.status === BudgetLineStatus.PENDING_VALIDATION
            ? BudgetLineStatus.ACTIVE
            : live.status;

        await tx.budgetLine.update({
          where: { id: live.id },
          data: {
            planningMode: mode,
            planningTotalAmount: new Prisma.Decimal(
              snapLine.planningTotalAmount != null
                ? Number(snapLine.planningTotalAmount)
                : planningTotal,
            ),
            initialAmount: snapLine.initialAmount,
            status: nextStatus,
          },
        });

        await this.landingService.recalculateAndPersist(
          clientId,
          live.id,
          referenceDate,
          tx,
        );
      }
    });

    const activatedOccasion = await this.prisma.budgetSnapshotOccasionType.findFirst({
      where: {
        code: PA_SNAPSHOT_OCCASION_CODES.ACTIVATED,
        isActive: true,
        OR: [{ clientId }, { clientId: null }],
      },
      orderBy: { clientId: 'desc' },
      select: { id: true },
    });

    await this.snapshots.create(
      clientId,
      {
        budgetId: budget.id,
        name: `PA activée — ${snapshot.name}`,
        occasionTypeId: activatedOccasion?.id,
      },
      context,
    );

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: APPLY_ACTION,
      resourceType: 'budget',
      resourceId: budget.id,
      newValue: {
        arbitratedSnapshotId: snapshot.id,
        skippedLiveMissing: skippedMissingLive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return this.getState(clientId, budget.id);
  }

  private async assertEnabled(clientId: string): Promise<void> {
    const config = await this.workflowSettings.getResolvedForClient(clientId);
    if (!config.landingForecastEnabled) {
      throw new BadRequestException({
        code: 'landing_forecast_disabled',
        message: 'La prévision d’atterrissage n’est pas activée pour ce client.',
      });
    }
  }

  private async requireBudget(clientId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      select: { id: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  private async loadSession(clientId: string, budgetId: string) {
    const [baselines, arbitratedAll, validateLogs, applyLogs] = await Promise.all([
      this.prisma.budgetSnapshot.findMany({
        where: {
          clientId,
          budgetId,
          occasionType: { code: PA_SNAPSHOT_OCCASION_CODES.BASELINE },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { occasionType: { select: { code: true } } },
      }),
      this.prisma.budgetSnapshot.findMany({
        where: {
          clientId,
          budgetId,
          occasionType: { code: PA_SNAPSHOT_OCCASION_CODES.ARBITRATED },
        },
        orderBy: { createdAt: 'desc' },
        include: { occasionType: { select: { code: true } } },
      }),
      this.prisma.auditLog.findMany({
        where: {
          clientId,
          resourceType: 'budget',
          resourceId: budgetId,
          action: VALIDATE_ACTION,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { createdAt: true, newValue: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          clientId,
          resourceType: 'budget',
          resourceId: budgetId,
          action: APPLY_ACTION,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { createdAt: true, newValue: true },
      }),
    ]);

    const latestBaselineAny = baselines[0] ? this.toRef(baselines[0]) : null;
    const baselineCreatedAt = latestBaselineAny?.createdAt ?? null;
    const arbitratedAfter = arbitratedAll.filter((s) =>
      baselineCreatedAt ? s.createdAt.getTime() >= baselineCreatedAt.getTime() : true,
    );
    const latestArbitratedAfterBaseline = arbitratedAfter[0]
      ? this.toRef(arbitratedAfter[0])
      : null;

    const validateAudit = this.pickMatchingAudit(
      validateLogs,
      latestArbitratedAfterBaseline,
    );
    const applyAudit = this.pickMatchingAudit(
      applyLogs,
      latestArbitratedAfterBaseline,
    );

    return resolvePaSession({
      latestBaselineAny,
      latestArbitratedAfterBaseline,
      validateAudit,
      applyAudit,
    });
  }

  private toRef(row: {
    id: string;
    name: string;
    code: string;
    createdAt: Date;
    status: BudgetSnapshotStatus;
  }): PaSnapshotRef {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      createdAt: row.createdAt,
      status: row.status,
    };
  }

  private pickMatchingAudit(
    logs: Array<{ createdAt: Date; newValue: Prisma.JsonValue | null }>,
    arbitrated: PaSnapshotRef | null,
  ): PaAuditRef | null {
    if (!arbitrated) return null;
    for (const log of logs) {
      const id = parseArbitratedSnapshotIdFromAudit(log.newValue);
      if (id === arbitrated.id && log.createdAt.getTime() >= arbitrated.createdAt.getTime()) {
        return { createdAt: log.createdAt, arbitratedSnapshotId: id };
      }
    }
    return null;
  }
}
