import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AllocationType, BudgetStatus, FinancialEventType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import { TaxCalculator } from '../financial-core/helpers/tax-calculator';
import type { DashboardQueryDto } from './dto/dashboard.query.dto';
import type { PatchBudgetDashboardUserOverridesDto } from './dto/budget-dashboard-user-overrides.dto';
import type {
  BudgetCockpitEnvelopeRow,
  BudgetCockpitResponse,
  BudgetCockpitRiskEnvelopeRow,
  BudgetCockpitWidgetPayload,
  BudgetDashboardLineRow,
  BudgetDashboardThresholdsConfig,
} from './types/budget-dashboard.types';
import { BudgetDashboardConfigService } from './budget-dashboard-config.service';

type DecimalLike = Prisma.Decimal | null | undefined;

const TOP_LIMIT_DEFAULT = 10;

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

function riskLevelForEnvelope(
  ratio: number,
  thresholds: BudgetDashboardThresholdsConfig | null | undefined,
): RiskLevel {
  const lowBelow = thresholds?.consumptionRateWarning ?? 0.7;
  const mediumBelow = thresholds?.consumptionRateCritical ?? 0.9;
  if (ratio < lowBelow) return 'LOW';
  if (ratio <= mediumBelow) return 'MEDIUM';
  return 'HIGH';
}

/** Règles alignées sur alertsSummary (comptage par ligne). */
function lineRiskLevelFromAmounts(
  revised: number,
  committed: number,
  consumed: number,
  forecast: number,
  remaining: number,
  thresholds: BudgetDashboardThresholdsConfig | null | undefined,
): BudgetDashboardLineRow['lineRiskLevel'] {
  const flagNegative =
    thresholds?.negativeRemaining !== false && remaining < 0;
  if (flagNegative || consumed > revised || forecast > revised) {
    return 'CRITICAL';
  }
  if (committed > revised) {
    return 'WARNING';
  }
  return 'OK';
}

@Injectable()
export class BudgetDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardConfigService: BudgetDashboardConfigService,
  ) {}

  async getDashboard(
    clientId: string,
    query: DashboardQueryDto,
    actorUserId?: string,
  ): Promise<BudgetCockpitResponse> {
    const dashCfg =
      await this.dashboardConfigService.ensureDefaultConfig(clientId);
    const filters = dashCfg.filtersConfig as Record<string, unknown> | null;
    const thresholds =
      dashCfg.thresholdsConfig as BudgetDashboardThresholdsConfig | null;
    const topLimit = thresholds?.maxAlertItems ?? TOP_LIMIT_DEFAULT;

    const exerciseIdMerged =
      query.exerciseId ??
      (filters?.exerciseId as string | undefined) ??
      dashCfg.defaultExerciseId ??
      undefined;
    const budgetIdMerged =
      query.budgetId ??
      (filters?.budgetId as string | undefined) ??
      dashCfg.defaultBudgetId ??
      undefined;

    const shouldAggregateBudgetsForExercise =
      query.aggregateBudgetsForExercise === true;

    const exerciseResolution = await this.resolveBudgetAndExercise(
      clientId,
      shouldAggregateBudgetsForExercise ? undefined : budgetIdMerged,
      exerciseIdMerged,
    );

    let budget = exerciseResolution.budget;
    let exercise = exerciseResolution.exercise;

    // Id de budget réellement utilisé pour les taxes/TTc (un seul budget “repère”),
    // tandis que le périmètre “agrégé” s’appuie sur plusieurs budgetIds.
    let budgetIdForTax = budget.id;
    let budgetIdsForData: string[] = [budget.id];

    if (shouldAggregateBudgetsForExercise) {
      const budgets = await this.prisma.budget.findMany({
        where: {
          clientId,
          exerciseId: exercise.id,
          status: { notIn: [BudgetStatus.LOCKED, BudgetStatus.ARCHIVED] },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          exerciseId: true,
          currency: true,
          status: true,
        },
      });

      const budgetsFallback =
        budgets.length > 0
          ? budgets
          : await this.prisma.budget.findMany({
              where: { clientId, exerciseId: exercise.id },
              orderBy: { updatedAt: 'desc' },
              select: {
                id: true,
                name: true,
                code: true,
                exerciseId: true,
                currency: true,
                status: true,
              },
            });

      if (budgetsFallback.length === 0) {
        throw new NotFoundException('No budget found for this exercise');
      }

      budgetIdForTax = budget.id; // representative already resolved above
      budgetIdsForData = budgetsFallback.map((b) => b.id);

      // Budget “synthétique” renvoyé au frontend pour piloter l’UX.
      budget = {
        ...budget,
        id: '__ALL__',
        name: 'Tous les budgets',
        /** Chaîne vide : pas de préfixe « code — » (ce n’est pas un budget unique). */
        code: '',
      };
    }

    const budgetId = budgetIdForTax;
    const exerciseId = exercise.id;

    const includeEnvelopes = query.includeEnvelopes !== false;
    const includeLines = query.includeLines !== false;

    const [linesForAggregation, eventsForTrend] = await Promise.all([
      this.prisma.budgetLine.findMany({
        where: {
          clientId,
          budgetId: { in: budgetIdsForData },
        },
        select: {
          id: true,
          envelopeId: true,
          taxRate: true,
          revisedAmount: true,
          committedAmount: true,
          remainingAmount: true,
          consumedAmount: true,
          forecastAmount: true,
          expenseType: true,
          code: true,
          name: true,
          envelope: {
            select: { id: true, code: true, name: true, type: true },
          },
        },
      }),
      this.prisma.financialEvent.findMany({
        where: {
          clientId,
          budgetLine: { budgetId: { in: budgetIdsForData } },
          eventType: {
            in: [
              FinancialEventType.COMMITMENT_REGISTERED,
              FinancialEventType.CONSUMPTION_REGISTERED,
            ],
          },
        },
        select: {
          eventType: true,
          amountHt: true,
          eventDate: true,
          createdAt: true,
        },
      }),
    ]);

    const totalBudget = linesForAggregation.reduce(
      (s, l) => s + fromDecimal(l.revisedAmount),
      0,
    );
    const remaining = linesForAggregation.reduce(
      (s, l) => s + fromDecimal(l.remainingAmount),
      0,
    );
    const committed = linesForAggregation.reduce(
      (s, l) => s + fromDecimal(l.committedAmount),
      0,
    );
    const consumed = linesForAggregation.reduce(
      (s, l) => s + fromDecimal(l.consumedAmount),
      0,
    );
    const forecast = linesForAggregation.reduce(
      (s, l) => s + fromDecimal(l.forecastAmount),
      0,
    );
    const consumptionRate =
      totalBudget === 0 ? 0 : consumed / totalBudget;

    const [clientTax, budgetTax] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: { defaultTaxRate: true },
      }),
      this.prisma.budget.findFirst({
        where: { id: budgetId, clientId },
        select: { defaultTaxRate: true },
      }),
    ]);

    const clientDefaultTaxRate = clientTax?.defaultTaxRate ?? null;
    const budgetDefaultTaxRate = budgetTax?.defaultTaxRate ?? null;

    const emptyTtc = {
      totalBudgetTtc: null,
      committedTtc: null,
      consumedTtc: null,
      forecastTtc: null,
      remainingTtc: null,
    };

    const ttcTotals =
      linesForAggregation.length === 0
        ? emptyTtc
        : (() => {
            let totalBudgetTtc = 0;
            let committedTtc = 0;
            let consumedTtc = 0;
            let forecastTtc = 0;
            let remainingTtc = 0;

            for (const l of linesForAggregation) {
              const effectiveTaxRate =
                l.taxRate ?? budgetDefaultTaxRate ?? clientDefaultTaxRate ?? null;

              if (effectiveTaxRate == null) return emptyTtc;

              totalBudgetTtc += fromDecimal(
                TaxCalculator.fromHtAndTaxRate({
                  amountHt: l.revisedAmount,
                  taxRate: effectiveTaxRate,
                }).amountTtc,
              );
              committedTtc += fromDecimal(
                TaxCalculator.fromHtAndTaxRate({
                  amountHt: l.committedAmount,
                  taxRate: effectiveTaxRate,
                }).amountTtc,
              );
              consumedTtc += fromDecimal(
                TaxCalculator.fromHtAndTaxRate({
                  amountHt: l.consumedAmount,
                  taxRate: effectiveTaxRate,
                }).amountTtc,
              );
              forecastTtc += fromDecimal(
                TaxCalculator.fromHtAndTaxRate({
                  amountHt: l.forecastAmount,
                  taxRate: effectiveTaxRate,
                }).amountTtc,
              );
              remainingTtc += fromDecimal(
                TaxCalculator.fromHtAndTaxRate({
                  amountHt: l.remainingAmount,
                  taxRate: effectiveTaxRate,
                }).amountTtc,
              );
            }

            return {
              totalBudgetTtc,
              committedTtc,
              consumedTtc,
              forecastTtc,
              remainingTtc,
            };
          })();

    const monthlyTrend = this.buildMonthlyTrend(eventsForTrend);

    const capex = linesForAggregation
      .filter((l) => l.expenseType === 'CAPEX')
      .reduce((s, l) => s + fromDecimal(l.revisedAmount), 0);
    const opex = linesForAggregation
      .filter((l) => l.expenseType === 'OPEX')
      .reduce((s, l) => s + fromDecimal(l.revisedAmount), 0);

    const runBuildDistribution =
      this.buildRunBuildDistribution(linesForAggregation);
    const alertsSummary = this.buildAlertsSummary(linesForAggregation);

    const kpiBlock = {
      totalBudget,
      committed,
      consumed,
      forecast,
      remaining,
      consumptionRate,
      ...ttcTotals,
    };

    const topEnvelopes = includeEnvelopes
      ? this.buildTopEnvelopes(linesForAggregation, topLimit)
      : [];
    const riskEnvelopes = includeEnvelopes
      ? this.buildRiskEnvelopes(linesForAggregation, thresholds)
      : [];
    const topBudgetLines = includeLines
      ? this.buildTopBudgetLines(linesForAggregation, thresholds, topLimit)
      : [];
    const criticalBudgetLines = includeLines
      ? this.buildCriticalBudgetLines(linesForAggregation, thresholds, topLimit)
      : [];

    const layoutJson = dashCfg.layoutConfig as Record<string, unknown> | null;
    const filtersJson = dashCfg.filtersConfig as Record<string, unknown> | null;

    const widgetIds = dashCfg.widgets.map((w) => w.id);
    const shouldApplyUserOverrides =
      actorUserId && query.useUserOverrides !== false;

    const widgetOverrides = shouldApplyUserOverrides
      ? await this.prisma.budgetDashboardWidgetOverride.findMany({
          where: {
            clientId,
            userId: actorUserId,
            widgetId: { in: widgetIds },
          },
          select: { widgetId: true, isActive: true, position: true },
        })
      : [];

    const widgetOverridesById = new Map(
      widgetOverrides.map((o) => [o.widgetId, o] as const),
    );

    const widgets = [...dashCfg.widgets]
      .map((w) => {
        const settings =
          (w.settings as Record<string, unknown> | null) ?? null;
        const ov = widgetOverridesById.get(w.id);
        const isActiveEffective = ov?.isActive ?? w.isActive;
        const positionEffective = ov?.position ?? w.position;

        if (!isActiveEffective) {
          return {
            id: w.id,
            type: w.type,
            position: positionEffective,
            title: w.title,
            size: w.size,
            isActive: false,
            settings,
            data: null,
          } as BudgetCockpitWidgetPayload;
        }

        switch (w.type) {
          case 'KPI':
            return {
              id: w.id,
              type: 'KPI',
              position: positionEffective,
              title: w.title,
              size: w.size,
              isActive: true,
              settings,
              data: {
                kpis: kpiBlock,
                capexOpexDistribution: { capex, opex },
                drilldownLinks: settings?.drilldownLinks as
                  | Record<string, string>
                  | undefined,
              },
            };
          case 'ALERT_LIST':
            return {
              id: w.id,
              type: 'ALERT_LIST',
              position: positionEffective,
              title: w.title,
              size: w.size,
              isActive: true,
              settings,
              data: {
                items: criticalBudgetLines,
                totals: alertsSummary,
              },
            };
          case 'ENVELOPE_LIST':
            return {
              id: w.id,
              type: 'ENVELOPE_LIST',
              position: positionEffective,
              title: w.title,
              size: w.size,
              isActive: true,
              settings,
              data: {
                topEnvelopes,
                riskEnvelopes,
              },
            };
          case 'LINE_LIST':
            return {
              id: w.id,
              type: 'LINE_LIST',
              position: positionEffective,
              title: w.title,
              size: w.size,
              isActive: true,
              settings,
              data: {
                topBudgetLines,
                criticalBudgetLines,
              },
            };
          case 'CHART': {
            const ct = settings?.chartType;
            if (ct === 'RUN_BUILD_BREAKDOWN') {
              return {
                id: w.id,
                type: 'CHART',
                position: positionEffective,
                title: w.title,
                size: w.size,
                isActive: true,
                settings,
                data: {
                  chartType: 'RUN_BUILD_BREAKDOWN',
                  series: {
                    run: runBuildDistribution.run,
                    build: runBuildDistribution.build,
                    transverse: runBuildDistribution.transverse,
                  },
                  labels: {
                    run: 'Run',
                    build: 'Build',
                    transverse: 'Transverse',
                  },
                },
              };
            }
            return {
              id: w.id,
              type: 'CHART',
              position: positionEffective,
              title: w.title,
              size: w.size,
              isActive: true,
              settings,
              data: {
                chartType: 'CONSUMPTION_TREND',
                series: monthlyTrend,
                labels: { committed: 'Engagé', consumed: 'Consommé' },
              },
            };
          }
          default:
            return {
              id: w.id,
              type: w.type,
              position: positionEffective,
              title: w.title,
              size: w.size,
              isActive: true,
              settings,
              data: null,
            } as BudgetCockpitWidgetPayload;
        }
      }) as BudgetCockpitWidgetPayload[];

    widgets.sort((a, b) => a.position - b.position);

    return {
      config: {
        id: dashCfg.id,
        name: dashCfg.name,
        isDefault: dashCfg.isDefault,
        defaultExerciseId: dashCfg.defaultExerciseId,
        defaultBudgetId: dashCfg.defaultBudgetId,
        layoutConfig: layoutJson ?? {},
        filtersConfig: filtersJson,
        thresholdsConfig: thresholds,
      },
      exercise: {
        id: exercise.id,
        name: exercise.name,
        code: exercise.code ?? null,
      },
      budget: {
        id: budget.id,
        name: budget.name,
        code: budget.code ?? null,
        currency: budget.currency,
        status: budget.status,
      },
      widgets,
    };
  }

  /**
   * Overrides utilisateur (sparse) du cockpit budget.
   * MVP : seuls `isActive` / `position` sont utilisables. `settings` est interdit sauf null/undefined.
   *
   * Orphelins : tout override dont `widgetId` n'est plus présent dans la config client courante
   * est filtré au moment de la lecture.
   */
  async listUserWidgetOverrides(
    clientId: string,
    userId: string,
  ): Promise<
    Array<{
      widgetId: string;
      isActive: boolean | null;
      position: number | null;
    }>
  > {
    const dashCfg = await this.dashboardConfigService.ensureDefaultConfig(clientId);
    const widgetIds = dashCfg.widgets.map((w) => w.id);
    if (widgetIds.length === 0) return [];

    const overrides = await this.prisma.budgetDashboardWidgetOverride.findMany({
      where: {
        clientId,
        userId,
        widgetId: { in: widgetIds },
      },
      select: { widgetId: true, isActive: true, position: true },
    });

    return overrides.map((o) => ({
      widgetId: o.widgetId,
      isActive: o.isActive ?? null,
      position: o.position ?? null,
    }));
  }

  /**
   * PATCH sparse réel :
   * - override absent du payload => inchangé
   * - override présent => upsert/merge
   * - reset MVP via `null` : `isActive: null`, `position: null`, `settings: null`
   *   => retire l'effet override sur ces champs
   */
  async patchUserWidgetOverrides(
    clientId: string,
    userId: string,
    body: PatchBudgetDashboardUserOverridesDto,
  ): Promise<
    Array<{
      widgetId: string;
      isActive: boolean | null;
      position: number | null;
    }>
  > {
    const overrides = body.overrides ?? [];
    if (overrides.length === 0) return [];

    for (const o of overrides) {
      if (o.settings !== undefined && o.settings !== null) {
        const keys = Object.keys(o.settings ?? {});
        if (keys.length > 0) {
          throw new BadRequestException('settings user non autorisé en MVP');
        }
      }
    }

    const widgetIds = [...new Set(overrides.map((o) => o.widgetId))];

    const widgets = await this.prisma.budgetDashboardWidget.findMany({
      where: { clientId, id: { in: widgetIds } },
      select: { id: true },
    });
    const allowedWidgetIds = new Set(widgets.map((w) => w.id));
    for (const id of widgetIds) {
      if (!allowedWidgetIds.has(id)) {
        throw new BadRequestException(`WidgetOverride: widgetId inconnu (${id})`);
      }
    }

    const existing = await this.prisma.budgetDashboardWidgetOverride.findMany({
      where: { clientId, userId, widgetId: { in: widgetIds } },
      select: { widgetId: true, isActive: true, position: true },
    });
    const existingByWidgetId = new Map(existing.map((e) => [e.widgetId, e] as const));

    const normaliseField = <T>(
      hasField: boolean,
      value: T | null | undefined,
      existingValue: T | null | undefined,
    ): T | null => {
      if (!hasField) return (existingValue ?? null) as T | null;
      if (value === null) return null;
      return value as unknown as T;
    };

    await this.prisma.$transaction(async (tx) => {
      for (const input of overrides) {
        const hasIsActive = Object.prototype.hasOwnProperty.call(input, 'isActive');
        const hasPosition = Object.prototype.hasOwnProperty.call(input, 'position');

        const ex = existingByWidgetId.get(input.widgetId);
        const nextIsActive = normaliseField<boolean>(
          hasIsActive,
          input.isActive,
          ex?.isActive,
        );
        const nextPosition = normaliseField<number>(
          hasPosition,
          input.position,
          ex?.position,
        );

        const shouldDelete = nextIsActive === null && nextPosition === null;

        if (shouldDelete) {
          if (ex) {
            await tx.budgetDashboardWidgetOverride.delete({
              where: { clientId_userId_widgetId: { clientId, userId, widgetId: input.widgetId } },
            });
          }
          continue;
        }

        await tx.budgetDashboardWidgetOverride.upsert({
          where: { clientId_userId_widgetId: { clientId, userId, widgetId: input.widgetId } },
          create: {
            clientId,
            userId,
            widgetId: input.widgetId,
            isActive: nextIsActive,
            position: nextPosition,
          },
          update: {
            isActive: nextIsActive,
            position: nextPosition,
          },
        });
      }
    });

    return this.listUserWidgetOverrides(clientId, userId);
  }

  private async resolveBudgetAndExercise(
    clientId: string,
    budgetIdParam?: string,
    exerciseIdParam?: string,
  ): Promise<{
    budget: { id: string; name: string; code: string; exerciseId: string; currency: string; status: string };
    exercise: { id: string; name: string; code: string };
  }> {
    if (budgetIdParam) {
      const budget = await this.prisma.budget.findFirst({
        where: { id: budgetIdParam, clientId },
      });
      if (!budget) {
        throw new NotFoundException('Budget not found');
      }
      const exercise = await this.prisma.budgetExercise.findFirst({
        where: { id: budget.exerciseId, clientId },
      });
      if (!exercise) {
        throw new NotFoundException('Budget exercise not found');
      }
      return {
        budget: {
          id: budget.id,
          name: budget.name,
          code: budget.code,
          exerciseId: budget.exerciseId,
          currency: budget.currency,
          status: budget.status,
        },
        exercise: {
          id: exercise.id,
          name: exercise.name,
          code: exercise.code,
        },
      };
    }

    let exerciseId: string;
    if (exerciseIdParam) {
      const exercise = await this.prisma.budgetExercise.findFirst({
        where: { id: exerciseIdParam, clientId },
      });
      if (!exercise) {
        throw new NotFoundException('Budget exercise not found');
      }
      exerciseId = exercise.id;
    } else {
      const now = new Date();
      let exercise = await this.prisma.budgetExercise.findFirst({
        where: {
          clientId,
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        orderBy: { endDate: 'asc' },
      });
      if (!exercise) {
        exercise = await this.prisma.budgetExercise.findFirst({
          where: { clientId },
          orderBy: { endDate: 'desc' },
        });
      }
      if (!exercise) {
        throw new NotFoundException('No budget exercise found');
      }
      exerciseId = exercise.id;
    }

    const budget = await this.resolveBudgetForExercise(clientId, exerciseId);
    if (!budget) {
      throw new NotFoundException('No budget found for this exercise');
    }
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id: exerciseId, clientId },
    });
    if (!exercise) {
      throw new NotFoundException('Budget exercise not found');
    }
    return {
      budget: {
        id: budget.id,
        name: budget.name,
        code: budget.code,
        exerciseId: budget.exerciseId,
        currency: budget.currency,
        status: budget.status,
      },
      exercise: {
        id: exercise.id,
        name: exercise.name,
        code: exercise.code,
      },
    };
  }

  private async resolveBudgetForExercise(
    clientId: string,
    exerciseId: string,
  ): Promise<{
    id: string;
    name: string;
    code: string;
    exerciseId: string;
    currency: string;
    status: string;
  } | null> {
    const versionSet = await this.prisma.budgetVersionSet.findFirst({
      where: { clientId, exerciseId, activeBudgetId: { not: null } },
      include: { activeBudget: true },
    });
    if (versionSet?.activeBudget) {
      const b = versionSet.activeBudget;
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        exerciseId: b.exerciseId,
        currency: b.currency,
        status: b.status,
      };
    }
    let budget = await this.prisma.budget.findFirst({
      where: {
        clientId,
        exerciseId,
        status: { notIn: [BudgetStatus.LOCKED, BudgetStatus.ARCHIVED] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (budget) {
      return {
        id: budget.id,
        name: budget.name,
        code: budget.code,
        exerciseId: budget.exerciseId,
        currency: budget.currency,
        status: budget.status,
      };
    }
    budget = await this.prisma.budget.findFirst({
      where: { clientId, exerciseId },
      orderBy: { updatedAt: 'desc' },
    });
    return budget
      ? {
          id: budget.id,
          name: budget.name,
          code: budget.code,
          exerciseId: budget.exerciseId,
          currency: budget.currency,
          status: budget.status,
        }
      : null;
  }

  private async getAllocationSums(
    clientId: string,
    budgetId: string,
  ): Promise<{ committed: number; consumed: number; forecast: number }> {
    const lineIds = await this.prisma.budgetLine
      .findMany({
        where: { clientId, budgetId },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));
    if (lineIds.length === 0) {
      return { committed: 0, consumed: 0, forecast: 0 };
    }
    const allocations = await this.prisma.financialAllocation.findMany({
      where: {
        clientId,
        budgetLineId: { in: lineIds },
        allocationType: {
          in: [AllocationType.COMMITTED, AllocationType.CONSUMED, AllocationType.FORECAST],
        },
      },
      select: { allocationType: true, allocatedAmount: true },
    });
    let committed = 0;
    let consumed = 0;
    let forecast = 0;
    for (const a of allocations) {
      const amount = fromDecimal(a.allocatedAmount);
      if (a.allocationType === AllocationType.COMMITTED) committed += amount;
      else if (a.allocationType === AllocationType.CONSUMED) consumed += amount;
      else if (a.allocationType === AllocationType.FORECAST) forecast += amount;
    }
    return { committed, consumed, forecast };
  }

  private buildMonthlyTrend(
    events: {
      eventType: string;
      amountHt: unknown;
      eventDate: Date;
      createdAt: Date;
    }[],
  ): { month: string; committed: number; consumed: number }[] {
    const byMonth = new Map<
      string,
      { committed: number; consumed: number }
    >();
    for (const e of events) {
      const date = e.eventDate ?? e.createdAt;
      const month =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = fromDecimal(e.amountHt as DecimalLike);
      let entry = byMonth.get(month);
      if (!entry) {
        entry = { committed: 0, consumed: 0 };
        byMonth.set(month, entry);
      }
      if (e.eventType === FinancialEventType.COMMITMENT_REGISTERED) {
        entry.committed += amount;
      } else if (e.eventType === FinancialEventType.CONSUMPTION_REGISTERED) {
        entry.consumed += amount;
      }
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { committed, consumed }]) => ({
        month,
        committed,
        consumed,
      }));
  }

  private buildRunBuildDistribution(
    lines: {
      revisedAmount: DecimalLike;
      envelope: { type: string };
    }[],
  ): { run: number; build: number; transverse: number } {
    let run = 0;
    let build = 0;
    let transverse = 0;
    for (const l of lines) {
      const amt = fromDecimal(l.revisedAmount);
      switch (l.envelope.type) {
        case 'RUN':
          run += amt;
          break;
        case 'BUILD':
          build += amt;
          break;
        case 'TRANSVERSE':
          transverse += amt;
          break;
        default:
          break;
      }
    }
    return { run, build, transverse };
  }

  private buildAlertsSummary(
    lines: {
      revisedAmount: DecimalLike;
      committedAmount: DecimalLike;
      consumedAmount: DecimalLike;
      forecastAmount: DecimalLike;
      remainingAmount: DecimalLike;
    }[],
  ): {
    negativeRemaining: number;
    overCommitted: number;
    overConsumed: number;
    forecastOverBudget: number;
  } {
    let negativeRemaining = 0;
    let overCommitted = 0;
    let overConsumed = 0;
    let forecastOverBudget = 0;
    for (const l of lines) {
      const revised = fromDecimal(l.revisedAmount);
      const committed = fromDecimal(l.committedAmount);
      const consumed = fromDecimal(l.consumedAmount);
      const forecast = fromDecimal(l.forecastAmount);
      const remaining = fromDecimal(l.remainingAmount);
      if (remaining < 0) negativeRemaining += 1;
      if (committed > revised) overCommitted += 1;
      if (consumed > revised) overConsumed += 1;
      if (forecast > revised) forecastOverBudget += 1;
    }
    return {
      negativeRemaining,
      overCommitted,
      overConsumed,
      forecastOverBudget,
    };
  }

  private mapBudgetLineRow(
    l: {
      id: string;
      code: string;
      name: string;
      envelope: { name: string };
      revisedAmount: DecimalLike;
      committedAmount: DecimalLike;
      consumedAmount: DecimalLike;
      forecastAmount: DecimalLike;
      remainingAmount: DecimalLike;
    },
    thresholds: BudgetDashboardThresholdsConfig | null | undefined,
  ): BudgetDashboardLineRow {
    const revised = fromDecimal(l.revisedAmount);
    const committed = fromDecimal(l.committedAmount);
    const consumed = fromDecimal(l.consumedAmount);
    const forecast = fromDecimal(l.forecastAmount);
    const remaining = fromDecimal(l.remainingAmount);
    return {
      lineId: l.id,
      code: l.code ?? null,
      name: l.name,
      envelopeName: l.envelope?.name ?? null,
      revisedAmount: revised,
      committed,
      consumed,
      forecast,
      remaining,
      lineRiskLevel: lineRiskLevelFromAmounts(
        revised,
        committed,
        consumed,
        forecast,
        remaining,
        thresholds,
      ),
    };
  }

  private buildTopEnvelopes(
    lines: {
      envelopeId: string;
      envelope: { id: string; code: string; name: string };
      revisedAmount: DecimalLike;
      consumedAmount: DecimalLike;
      remainingAmount: DecimalLike;
    }[],
    topLimit: number,
  ): BudgetCockpitEnvelopeRow[] {
    const byEnvelope = new Map<
      string,
      {
        envelopeId: string;
        code: string | null;
        name: string;
        totalBudget: number;
        consumed: number;
        remaining: number;
      }
    >();
    for (const l of lines) {
      const id = l.envelope.id;
      let row = byEnvelope.get(id);
      if (!row) {
        row = {
          envelopeId: id,
          code: l.envelope.code ?? null,
          name: l.envelope.name,
          totalBudget: 0,
          consumed: 0,
          remaining: 0,
        };
        byEnvelope.set(id, row);
      }
      row.totalBudget += fromDecimal(l.revisedAmount);
      row.consumed += fromDecimal(l.consumedAmount);
      row.remaining += fromDecimal(l.remainingAmount);
    }
    return [...byEnvelope.values()]
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, topLimit);
  }

  private buildRiskEnvelopes(
    lines: {
      envelopeId: string;
      envelope: { id: string; code: string; name: string };
      forecastAmount: DecimalLike;
      revisedAmount: DecimalLike;
    }[],
    thresholds: BudgetDashboardThresholdsConfig | null | undefined,
  ): BudgetCockpitRiskEnvelopeRow[] {
    const byEnvelope = new Map<
      string,
      {
        envelopeId: string;
        code: string | null;
        name: string;
        forecast: number;
        budgetAmount: number;
      }
    >();
    for (const l of lines) {
      const id = l.envelope.id;
      let row = byEnvelope.get(id);
      if (!row) {
        row = {
          envelopeId: id,
          code: l.envelope.code ?? null,
          name: l.envelope.name,
          forecast: 0,
          budgetAmount: 0,
        };
        byEnvelope.set(id, row);
      }
      row.forecast += fromDecimal(l.forecastAmount);
      row.budgetAmount += fromDecimal(l.revisedAmount);
    }
    return [...byEnvelope.values()].map((row) => {
      const riskRatio =
        row.budgetAmount === 0 ? 0 : row.forecast / row.budgetAmount;
      return {
        ...row,
        riskRatio,
        riskLevel: riskLevelForEnvelope(riskRatio, thresholds),
      };
    });
  }

  private buildTopBudgetLines(
    lines: {
      id: string;
      code: string;
      name: string;
      envelope: { name: string };
      revisedAmount: DecimalLike;
      committedAmount: DecimalLike;
      consumedAmount: DecimalLike;
      forecastAmount: DecimalLike;
      remainingAmount: DecimalLike;
    }[],
    thresholds: BudgetDashboardThresholdsConfig | null | undefined,
    topLimit: number,
  ): BudgetDashboardLineRow[] {
    return [...lines]
      .sort(
        (a, b) =>
          fromDecimal(b.consumedAmount) - fromDecimal(a.consumedAmount),
      )
      .slice(0, topLimit)
      .map((l) => this.mapBudgetLineRow(l, thresholds));
  }

  private buildCriticalBudgetLines(
    lines: {
      id: string;
      code: string;
      name: string;
      envelope: { name: string };
      revisedAmount: DecimalLike;
      committedAmount: DecimalLike;
      consumedAmount: DecimalLike;
      forecastAmount: DecimalLike;
      remainingAmount: DecimalLike;
    }[],
    thresholds: BudgetDashboardThresholdsConfig | null | undefined,
    topLimit: number,
  ): BudgetDashboardLineRow[] {
    const enriched = lines.map((l) => this.mapBudgetLineRow(l, thresholds));
    const flagged = enriched.filter((r) => r.lineRiskLevel !== 'OK');
    const rank = (lvl: BudgetDashboardLineRow['lineRiskLevel']) =>
      lvl === 'CRITICAL' ? 0 : 1;
    return flagged
      .sort((a, b) => {
        const dr = rank(a.lineRiskLevel) - rank(b.lineRiskLevel);
        if (dr !== 0) return dr;
        return b.consumed - a.consumed;
      })
      .slice(0, topLimit);
  }
}
