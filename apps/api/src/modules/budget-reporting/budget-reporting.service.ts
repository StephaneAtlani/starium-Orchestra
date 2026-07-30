import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetVersionStatus, Prisma } from '@prisma/client';
import type { EntityVisual } from '@starium-orchestra/types';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveBudgetVisual } from '../../common/visual-library/visual-resolution';
import { PILOTAGE_INCLUDED_LINE_STATUSES } from '../budget-management/constants/budget-aggregate-statuses';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import { aggregateLinesToKpi, lineToReportItem, groupLinesByEnvelopeType } from './mappers/kpi.mapper';
import { TaxCalculator } from '../financial-core/helpers/tax-calculator';
import type { LineAmountsInput } from './types/budget-reporting.types';
import type {
  BudgetSummaryKpi,
  ListResult,
  EnvelopeLineReportItem,
  BreakdownByTypeItem,
} from './types/budget-reporting.types';
import type { ListExerciseBudgetsQueryDto } from './dto/list-exercise-budgets.query.dto';
import type { ListBudgetEnvelopesReportQueryDto } from './dto/list-budget-envelopes-report.query.dto';
import type { ListEnvelopeLinesQueryDto } from './dto/list-envelope-lines.query.dto';
import { toOwnerOrgUnitSummary } from '../organization/org-unit-ownership.helpers';

const MULTI_CURRENCY_MESSAGE =
  'Le reporting ne supporte pas plusieurs devises dans le même périmètre. Toutes les lignes doivent être libellées dans la même devise.';

/** Champs minimaux pour agrégats KPI (évite de charger toute la ligne Prisma). */
const PILOTAGE_LINE_AMOUNTS_SELECT = {
  budgetId: true,
  currency: true,
  initialAmount: true,
  forecastAmount: true,
  committedAmount: true,
  consumedAmount: true,
  remainingAmount: true,
} as const satisfies Prisma.BudgetLineSelect;

/** Même select + nature de dépense pour dériver CAPEX / OPEX / Mixte (portefeuille). */
const PILOTAGE_LINE_AMOUNTS_WITH_TYPE_SELECT = {
  ...PILOTAGE_LINE_AMOUNTS_SELECT,
  expenseType: true,
} as const satisfies Prisma.BudgetLineSelect;

export type BudgetExpenseMix = 'CAPEX' | 'OPEX' | 'MIXTE';

function computeExpenseMix(
  expenseTypes: readonly string[],
): BudgetExpenseMix | null {
  const set = new Set(
    expenseTypes.filter((t) => t === 'CAPEX' || t === 'OPEX'),
  );
  if (set.size === 0) return null;
  if (set.size === 1) return set.has('CAPEX') ? 'CAPEX' : 'OPEX';
  return 'MIXTE';
}

const EMPTY_TTC_TOTALS = {
  totalInitialAmountTtc: null,
  totalForecastAmountTtc: null,
  totalCommittedAmountTtc: null,
  totalConsumedAmountTtc: null,
  totalRemainingAmountTtc: null,
} as const;

/**
 * Budgets visibles dans le portefeuille / consolidation exercice :
 * - budgets non versionnés qui ne sont pas la source legacy d’un version set
 * - version ACTIVE de chaque set (exclut DRAFT / SUPERSEDED / ARCHIVED)
 */
function portfolioBudgetsWhere(
  clientId: string,
  exerciseId: string,
  baselinedSourceCodes: string[],
): Prisma.BudgetWhereInput {
  return {
    clientId,
    exerciseId,
    OR: [
      {
        isVersioned: false,
        ...(baselinedSourceCodes.length > 0
          ? { code: { notIn: baselinedSourceCodes } }
          : {}),
      },
      {
        isVersioned: true,
        versionStatus: BudgetVersionStatus.ACTIVE,
      },
    ],
  };
}

/** Totaux de pilotage : exclut DRAFT, REJECTED, DEFERRED, ARCHIVED. */
function whereLinesForPilotageTotals(
  base: Prisma.BudgetLineWhereInput,
): Prisma.BudgetLineWhereInput {
  return {
    ...base,
    status: { in: [...PILOTAGE_INCLUDED_LINE_STATUSES] },
  };
}

function toLineAmounts(row: {
  initialAmount: unknown;
  forecastAmount: unknown;
  committedAmount: unknown;
  consumedAmount: unknown;
  remainingAmount: unknown;
}): LineAmountsInput {
  return {
    initialAmount: fromDecimal(row.initialAmount as Parameters<typeof fromDecimal>[0]),
    forecastAmount: fromDecimal(row.forecastAmount as Parameters<typeof fromDecimal>[0]),
    committedAmount: fromDecimal(row.committedAmount as Parameters<typeof fromDecimal>[0]),
    consumedAmount: fromDecimal(row.consumedAmount as Parameters<typeof fromDecimal>[0]),
    remainingAmount: fromDecimal(row.remainingAmount as Parameters<typeof fromDecimal>[0]),
  };
}

type BudgetLineForTtc = {
  budgetId: string;
  taxRate: Prisma.Decimal | null;
  initialAmount: Prisma.Decimal;
  forecastAmount: Prisma.Decimal;
  committedAmount: Prisma.Decimal;
  consumedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
};

function computeTtcTotalsOrNull(params: {
  lines: BudgetLineForTtc[];
  clientDefaultTaxRate: Prisma.Decimal | null;
  budgetDefaultTaxRateByBudgetId: Map<string, Prisma.Decimal | null>;
}): {
  totalInitialAmountTtc: number | null;
  totalForecastAmountTtc: number | null;
  totalCommittedAmountTtc: number | null;
  totalConsumedAmountTtc: number | null;
  totalRemainingAmountTtc: number | null;
} {
  const {
    lines,
    clientDefaultTaxRate,
    budgetDefaultTaxRateByBudgetId,
  } = params;

  let totalInitialAmountTtc = 0;
  let totalForecastAmountTtc = 0;
  let totalCommittedAmountTtc = 0;
  let totalConsumedAmountTtc = 0;
  let totalRemainingAmountTtc = 0;

  for (const line of lines) {
    const effectiveTaxRate =
      line.taxRate ??
      budgetDefaultTaxRateByBudgetId.get(line.budgetId) ??
      clientDefaultTaxRate ??
      null;

    if (effectiveTaxRate == null) {
      return {
        totalInitialAmountTtc: null,
        totalForecastAmountTtc: null,
        totalCommittedAmountTtc: null,
        totalConsumedAmountTtc: null,
        totalRemainingAmountTtc: null,
      };
    }

    totalInitialAmountTtc += fromDecimal(
      TaxCalculator.fromHtAndTaxRate({
        amountHt: line.initialAmount,
        taxRate: effectiveTaxRate,
      }).amountTtc,
    );
    totalForecastAmountTtc += fromDecimal(
      TaxCalculator.fromHtAndTaxRate({
        amountHt: line.forecastAmount,
        taxRate: effectiveTaxRate,
      }).amountTtc,
    );
    totalCommittedAmountTtc += fromDecimal(
      TaxCalculator.fromHtAndTaxRate({
        amountHt: line.committedAmount,
        taxRate: effectiveTaxRate,
      }).amountTtc,
    );
    totalConsumedAmountTtc += fromDecimal(
      TaxCalculator.fromHtAndTaxRate({
        amountHt: line.consumedAmount,
        taxRate: effectiveTaxRate,
      }).amountTtc,
    );
    totalRemainingAmountTtc += fromDecimal(
      TaxCalculator.fromHtAndTaxRate({
        amountHt: line.remainingAmount,
        taxRate: effectiveTaxRate,
      }).amountTtc,
    );
  }

  return {
    totalInitialAmountTtc,
    totalForecastAmountTtc,
    totalCommittedAmountTtc,
    totalConsumedAmountTtc,
    totalRemainingAmountTtc,
  };
}

function assertSingleCurrency(currencies: string[]): void {
  const distinct = [...new Set(currencies)];
  if (distinct.length > 1) {
    throw new BadRequestException(MULTI_CURRENCY_MESSAGE);
  }
}

/** Collecte les ids des descendants récursifs (enfants, petits-enfants, ...). */
function collectDescendantIds(
  envelopeId: string,
  allEnvelopes: { id: string; parentId: string | null }[],
): Set<string> {
  const result = new Set<string>();
  const stack = [envelopeId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = allEnvelopes.filter((e) => e.parentId === current);
    for (const c of children) {
      result.add(c.id);
      stack.push(c.id);
    }
  }
  return result;
}

export interface BudgetWithKpi {
  id: string;
  clientId: string;
  exerciseId: string;
  name: string;
  code: string;
  description: string | null;
  currency: string;
  status: string;
  ownerOrgUnitId: string | null;
  ownerOrgUnitSummary: {
    id: string;
    name: string;
    type: string;
    code: string | null;
  } | null;
  visual: EntityVisual;
  /** Nature dominante des lignes pilotage — null si aucune ligne typée. */
  expenseMix: BudgetExpenseMix | null;
  kpi: BudgetSummaryKpi;
}

export interface EnvelopeWithKpi {
  id: string;
  clientId: string;
  budgetId: string;
  parentId: string | null;
  name: string;
  code: string;
  type: string;
  description: string | null;
  sortOrder: number;
  kpi: BudgetSummaryKpi;
}

@Injectable()
export class BudgetReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Codes des version sets = codes des budgets source legacy post-baseline. */
  private async getBaselinedSourceCodes(
    clientId: string,
    exerciseId: string,
  ): Promise<string[]> {
    const sets = await this.prisma.budgetVersionSet.findMany({
      where: { clientId, exerciseId },
      select: { code: true },
    });
    return sets.map((s) => s.code);
  }

  async getExerciseSummary(
    clientId: string,
    exerciseId: string,
  ): Promise<BudgetSummaryKpi> {
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id: exerciseId, clientId },
      select: { id: true },
    });
    if (!exercise) {
      throw new NotFoundException('Budget exercise not found');
    }
    const baselinedSourceCodes = await this.getBaselinedSourceCodes(
      clientId,
      exerciseId,
    );
    const portfolioBudgets = await this.prisma.budget.findMany({
      where: portfolioBudgetsWhere(clientId, exerciseId, baselinedSourceCodes),
      select: { id: true },
    });
    const budgetIds = portfolioBudgets.map((b) => b.id);
    if (budgetIds.length === 0) {
      return aggregateLinesToKpi([], null, {
        budgetCount: 0,
        envelopeCount: 0,
      });
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({ clientId, budgetId: { in: budgetIds } }),
      select: PILOTAGE_LINE_AMOUNTS_SELECT,
    });
    const envelopeCount = await this.prisma.budgetEnvelope.count({
      where: { clientId, budgetId: { in: budgetIds } },
    });
    if (lines.length === 0) {
      return aggregateLinesToKpi([], null, {
        budgetCount: budgetIds.length,
        envelopeCount,
      });
    }

    const currencies = lines.map((l) => l.currency);
    assertSingleCurrency(currencies);
    const amounts = lines.map((l) => toLineAmounts(l));
    const kpi = aggregateLinesToKpi(amounts, lines[0].currency, {
      budgetCount: budgetIds.length,
      envelopeCount,
    });

    return { ...kpi, ...EMPTY_TTC_TOTALS };
  }

  async getBudgetSummary(
    clientId: string,
    budgetId: string,
  ): Promise<BudgetSummaryKpi> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({ clientId, budgetId }),
    });
    const envelopeCount = await this.prisma.budgetEnvelope.count({
      where: { clientId, budgetId },
    });
    if (lines.length === 0) {
      const kpi = aggregateLinesToKpi([], budget.currency, {
        envelopeCount,
      });
      return kpi;
    }
    const clientTax = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { defaultTaxRate: true },
    });
    const clientDefaultTaxRate = clientTax?.defaultTaxRate ?? null;
    const budgetDefaultTaxRateByBudgetId = new Map([
      [budget.id, budget.defaultTaxRate],
    ]);

    const currencies = lines.map((l) => l.currency);
    assertSingleCurrency(currencies);
    const amounts = lines.map((l) => toLineAmounts(l));
    const kpi = aggregateLinesToKpi(amounts, lines[0].currency, {
      envelopeCount,
    });

    const linesForTtc: BudgetLineForTtc[] = lines.map((l) => ({
      budgetId: l.budgetId,
      taxRate: l.taxRate,
      initialAmount: l.initialAmount,
      forecastAmount: l.forecastAmount,
      committedAmount: l.committedAmount,
      consumedAmount: l.consumedAmount,
      remainingAmount: l.remainingAmount,
    }));

    const ttcTotals = computeTtcTotalsOrNull({
      lines: linesForTtc,
      clientDefaultTaxRate,
      budgetDefaultTaxRateByBudgetId,
    });

    return { ...kpi, ...ttcTotals };
  }

  async getEnvelopeSummary(
    clientId: string,
    envelopeId: string,
    includeChildren: boolean,
  ): Promise<BudgetSummaryKpi> {
    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: envelopeId, clientId },
      include: { budget: { select: { currency: true, defaultTaxRate: true } } },
    });
    if (!envelope) {
      throw new NotFoundException('Budget envelope not found');
    }
    let envelopeIds: string[] = [envelopeId];
    if (includeChildren) {
      const allEnvelopes = await this.prisma.budgetEnvelope.findMany({
        where: { clientId, budgetId: envelope.budgetId },
        select: { id: true, parentId: true },
      });
      const descendantIds = collectDescendantIds(envelopeId, allEnvelopes);
      envelopeIds = [envelopeId, ...descendantIds];
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({
        clientId,
        envelopeId: { in: envelopeIds },
      }),
    });
    const parentCurrency = envelope.budget?.currency ?? null;
    if (lines.length === 0) {
      return aggregateLinesToKpi([], parentCurrency);
    }
    const currencies = lines.map((l) => l.currency);
    assertSingleCurrency(currencies);
    const amounts = lines.map((l) => toLineAmounts(l));
    const kpi = aggregateLinesToKpi(amounts, lines[0].currency);

    const clientTax = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { defaultTaxRate: true },
    });
    const clientDefaultTaxRate = clientTax?.defaultTaxRate ?? null;
    const budgetDefaultTaxRateByBudgetId = new Map([
      [envelope.budgetId, envelope.budget?.defaultTaxRate ?? null],
    ]);

    const linesForTtc: BudgetLineForTtc[] = lines.map((l) => ({
      budgetId: l.budgetId,
      taxRate: l.taxRate,
      initialAmount: l.initialAmount,
      forecastAmount: l.forecastAmount,
      committedAmount: l.committedAmount,
      consumedAmount: l.consumedAmount,
      remainingAmount: l.remainingAmount,
    }));

    const ttcTotals = computeTtcTotalsOrNull({
      lines: linesForTtc,
      clientDefaultTaxRate,
      budgetDefaultTaxRateByBudgetId,
    });

    return { ...kpi, ...ttcTotals };
  }

  async listBudgetsForExercise(
    clientId: string,
    exerciseId: string,
    query: ListExerciseBudgetsQueryDto,
  ): Promise<ListResult<BudgetWithKpi>> {
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id: exerciseId, clientId },
    });
    if (!exercise) {
      throw new NotFoundException('Budget exercise not found');
    }
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const baselinedSourceCodes = await this.getBaselinedSourceCodes(
      clientId,
      exerciseId,
    );
    const andFilters: Prisma.BudgetWhereInput[] = [
      portfolioBudgetsWhere(clientId, exerciseId, baselinedSourceCodes),
    ];
    if (query.status) {
      andFilters.push({ status: query.status });
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      andFilters.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.BudgetWhereInput = { AND: andFilters };
    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          ownerOrgUnit: {
            select: {
              id: true,
              name: true,
              type: true,
              code: true,
              iconKey: true,
              accentToken: true,
              surfaceToken: true,
            },
          },
        },
      }),
      this.prisma.budget.count({ where }),
    ]);
    const budgetIds = budgets.map((b) => b.id);
    if (budgetIds.length === 0) {
      return {
        items: [],
        total,
        limit,
        offset,
      };
    }
    const [allLines, allEnvelopes] = await Promise.all([
      this.prisma.budgetLine.findMany({
        where: whereLinesForPilotageTotals({
          clientId,
          budgetId: { in: budgetIds },
        }),
        select: PILOTAGE_LINE_AMOUNTS_WITH_TYPE_SELECT,
      }),
      this.prisma.budgetEnvelope.findMany({
        where: { clientId, budgetId: { in: budgetIds } },
        select: { budgetId: true },
      }),
    ]);
    const envelopeCountByBudget = new Map<string, number>();
    for (const e of allEnvelopes) {
      envelopeCountByBudget.set(
        e.budgetId,
        (envelopeCountByBudget.get(e.budgetId) ?? 0) + 1,
      );
    }
    const linesByBudget = new Map<string, typeof allLines>();
    for (const line of allLines) {
      const arr = linesByBudget.get(line.budgetId) ?? [];
      arr.push(line);
      linesByBudget.set(line.budgetId, arr);
    }
    const items: BudgetWithKpi[] = budgets.map((budget) => {
      const lines = linesByBudget.get(budget.id) ?? [];
      let currency: string | null = budget.currency;
      if (lines.length > 0) {
        const currencies = [...new Set(lines.map((l) => l.currency))];
        if (currencies.length > 1) {
          throw new BadRequestException(MULTI_CURRENCY_MESSAGE);
        }
        currency = lines[0].currency;
      }
      const amounts = lines.map((l) => toLineAmounts(l));
      const envelopeCount = envelopeCountByBudget.get(budget.id) ?? 0;
      const kpi = aggregateLinesToKpi(amounts, currency, { envelopeCount });
      const owner = budget.ownerOrgUnit;
      const expenseMix = computeExpenseMix(lines.map((l) => l.expenseType));
      const ownerSummary = toOwnerOrgUnitSummary(owner);
      const visual = resolveBudgetVisual({
        budgetVisual: {
          iconKey: budget.iconKey,
          accentToken: budget.accentToken,
          surfaceToken: budget.surfaceToken,
        },
        ownerOrgUnitVisual: ownerSummary?.visual ?? null,
        expenseMix,
        name: budget.name,
        code: budget.code,
        description: budget.description,
        ownerOrgUnitName: owner?.name ?? null,
        ownerOrgUnitCode: owner?.code ?? null,
      });

      return {
        id: budget.id,
        clientId: budget.clientId,
        exerciseId: budget.exerciseId,
        name: budget.name,
        code: budget.code,
        description: budget.description,
        currency: budget.currency,
        status: budget.status,
        ownerOrgUnitId: budget.ownerOrgUnitId ?? null,
        ownerOrgUnitSummary: ownerSummary,
        visual,
        expenseMix,
        kpi: { ...kpi, ...EMPTY_TTC_TOTALS },
      };
    });
    return { items, total, limit, offset };
  }

  async listEnvelopesForBudget(
    clientId: string,
    budgetId: string,
    query: ListBudgetEnvelopesReportQueryDto,
  ): Promise<ListResult<EnvelopeWithKpi>> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    const clientTax = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { defaultTaxRate: true },
    });
    const clientDefaultTaxRate = clientTax?.defaultTaxRate ?? null;
    const budgetDefaultTaxRateByBudgetId = new Map([
      [budget.id, budget.defaultTaxRate],
    ]);
    const allEnvelopes = await this.prisma.budgetEnvelope.findMany({
      where: { clientId, budgetId },
      orderBy: { sortOrder: 'asc', createdAt: 'asc' },
    });
    let filtered = allEnvelopes;
    if (query.type) {
      filtered = filtered.filter((e) => e.type === query.type);
    }
    if (query.parentId !== undefined) {
      filtered = filtered.filter((e) => e.parentId === query.parentId);
    }
    const total = filtered.length;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const paginated = filtered.slice(offset, offset + limit);
    const envelopeIds = paginated.map((e) => e.id);
    const includeChildren = query.includeChildren === true;
    const envelopeIdsToFetch = new Set<string>(envelopeIds);
    if (includeChildren) {
      for (const e of paginated) {
        const desc = collectDescendantIds(e.id, allEnvelopes);
        desc.forEach((id) => envelopeIdsToFetch.add(id));
      }
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({
        clientId,
        envelopeId: { in: Array.from(envelopeIdsToFetch) },
      }),
    });
    const linesByEnvelope = new Map<string, typeof lines>();
    for (const line of lines) {
      const arr = linesByEnvelope.get(line.envelopeId) ?? [];
      arr.push(line);
      linesByEnvelope.set(line.envelopeId, arr);
    }
    const items: EnvelopeWithKpi[] = paginated.map((envelope) => {
      let idsForKpi = [envelope.id];
      if (includeChildren) {
        const desc = collectDescendantIds(envelope.id, allEnvelopes);
        idsForKpi = [envelope.id, ...desc];
      }
      const envelopeLines = lines.filter((l) => idsForKpi.includes(l.envelopeId));
      let currency: string | null = budget.currency;
      if (envelopeLines.length > 0) {
        const currencies = [...new Set(envelopeLines.map((l) => l.currency))];
        if (currencies.length > 1) {
          throw new BadRequestException(MULTI_CURRENCY_MESSAGE);
        }
        currency = envelopeLines[0].currency;
      }
      const amounts = envelopeLines.map((l) => toLineAmounts(l));
      const kpi = aggregateLinesToKpi(amounts, currency);

      const ttcTotals =
        envelopeLines.length === 0
          ? {
              totalInitialAmountTtc: null,
              totalForecastAmountTtc: null,
              totalCommittedAmountTtc: null,
              totalConsumedAmountTtc: null,
              totalRemainingAmountTtc: null,
            }
          : computeTtcTotalsOrNull({
              lines: envelopeLines.map((l) => ({
                budgetId: l.budgetId,
                taxRate: l.taxRate,
                initialAmount: l.initialAmount,
                forecastAmount: l.forecastAmount,
                committedAmount: l.committedAmount,
                consumedAmount: l.consumedAmount,
                remainingAmount: l.remainingAmount,
              })),
              clientDefaultTaxRate,
              budgetDefaultTaxRateByBudgetId,
            });

      return {
        id: envelope.id,
        clientId: envelope.clientId,
        budgetId: envelope.budgetId,
        parentId: envelope.parentId,
        name: envelope.name,
        code: envelope.code,
        type: envelope.type,
        description: envelope.description,
        sortOrder: envelope.sortOrder,
        kpi: { ...kpi, ...ttcTotals },
      };
    });
    return { items, total, limit, offset };
  }

  async listLinesForEnvelope(
    clientId: string,
    envelopeId: string,
    query: ListEnvelopeLinesQueryDto,
  ): Promise<ListResult<EnvelopeLineReportItem>> {
    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: envelopeId, clientId },
    });
    if (!envelope) {
      throw new NotFoundException('Budget envelope not found');
    }
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.BudgetLineWhereInput = {
      clientId,
      envelopeId,
      ...(query.status && { status: query.status }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }
    const [lines, total] = await Promise.all([
      this.prisma.budgetLine.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetLine.count({ where }),
    ]);
    const items = lines.map((line) =>
      lineToReportItem({
        id: line.id,
        code: line.code,
        name: line.name,
        description: line.description,
        expenseType: line.expenseType,
        status: line.status,
        currency: line.currency,
        initialAmount: fromDecimal(line.initialAmount),
        forecastAmount: fromDecimal(line.forecastAmount),
        committedAmount: fromDecimal(line.committedAmount),
        consumedAmount: fromDecimal(line.consumedAmount),
        remainingAmount: fromDecimal(line.remainingAmount),
      }),
    );
    return { items, total, limit, offset };
  }

  async getBreakdownByType(
    clientId: string,
    budgetId: string,
  ): Promise<BreakdownByTypeItem[]> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({ clientId, budgetId }),
      include: { envelope: { select: { type: true } } },
    });
    if (lines.length === 0) {
      return [];
    }
    const currencies = [...new Set(lines.map((l) => l.currency))];
    if (currencies.length > 1) {
      throw new BadRequestException(MULTI_CURRENCY_MESSAGE);
    }
    const withType = lines.map((l) => ({
      ...toLineAmounts(l),
      envelopeType: l.envelope.type,
    }));
    return groupLinesByEnvelopeType(withType);
  }

  /**
   * RFC-021: Totals by cost center. Only lines with allocationScope = ANALYTICAL.
   * Contribution per split = lineAmount * percentage / 100.
   * lineAmount source: initialAmount (montant budgétaire), remainingAmount pour le restant.
   */
  async getTotalsByCostCenter(
    clientId: string,
    budgetId: string,
  ): Promise<{
    currency: string;
    items: {
      costCenterId: string;
      costCenterCode: string;
      costCenterName: string;
      totalBudgetAmount: number;
      totalRemainingAmount: number;
    }[];
  }> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({
        clientId,
        budgetId,
        allocationScope: 'ANALYTICAL',
      }),
      include: { costCenterSplits: { include: { costCenter: true } } },
    });
    const currency = budget.currency;
    const byCostCenter = new Map<
      string,
      { code: string; name: string; budget: number; remaining: number }
    >();
    for (const line of lines) {
      const lineBudget = fromDecimal(line.initialAmount);
      const lineRem = fromDecimal(line.remainingAmount);
      for (const split of line.costCenterSplits) {
        const pct = fromDecimal(split.percentage) / 100;
        const key = split.costCenterId;
        const current = byCostCenter.get(key) ?? {
          code: split.costCenter?.code ?? '',
          name: split.costCenter?.name ?? '',
          budget: 0,
          remaining: 0,
        };
        current.budget += lineBudget * pct;
        current.remaining += lineRem * pct;
        byCostCenter.set(key, current);
      }
    }
    const items = Array.from(byCostCenter.entries()).map(
      ([costCenterId, v]) => ({
        costCenterId,
        costCenterCode: v.code,
        costCenterName: v.name,
        totalBudgetAmount: Math.round(v.budget * 100) / 100,
        totalRemainingAmount: Math.round(v.remaining * 100) / 100,
      }),
    );
    return { currency, items };
  }

  /**
   * RFC-021: Totals by general ledger account. All lines (ENTERPRISE + ANALYTICAL).
   * Aggregate by generalLedgerAccountId; somme initialAmount et remainingAmount.
   */
  async getTotalsByGeneralLedgerAccount(
    clientId: string,
    budgetId: string,
  ): Promise<{
    currency: string;
    items: {
      generalLedgerAccountId: string;
      generalLedgerAccountCode: string;
      generalLedgerAccountName: string;
      totalBudgetAmount: number;
      totalRemainingAmount: number;
    }[];
  }> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: whereLinesForPilotageTotals({ clientId, budgetId }),
      include: { generalLedgerAccount: true },
    });
    const currency = budget.currency;
    const byGla = new Map<
      string,
      { code: string; name: string; budget: number; remaining: number }
    >();
    for (const line of lines) {
      const key = line.generalLedgerAccountId ?? 'UNASSIGNED';
      const gla = line.generalLedgerAccount;
      const current = byGla.get(key) ?? {
        code: gla?.code ?? '',
        name: gla?.name ?? '',
        budget: 0,
        remaining: 0,
      };
      current.budget += fromDecimal(line.initialAmount);
      current.remaining += fromDecimal(line.remainingAmount);
      byGla.set(key, current);
    }
    const items = Array.from(byGla.entries()).map(
      ([generalLedgerAccountId, v]) => ({
        generalLedgerAccountId,
        generalLedgerAccountCode: v.code,
        generalLedgerAccountName: v.name,
        totalBudgetAmount: Math.round(v.budget * 100) / 100,
        totalRemainingAmount: Math.round(v.remaining * 100) / 100,
      }),
    );
    return { currency, items };
  }
}
