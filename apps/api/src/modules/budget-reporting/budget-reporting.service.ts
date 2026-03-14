import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import { aggregateLinesToKpi, lineToReportItem, groupLinesByEnvelopeType } from './mappers/kpi.mapper';
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

const MULTI_CURRENCY_MESSAGE =
  'Le reporting ne supporte pas plusieurs devises dans le même périmètre. Toutes les lignes doivent être libellées dans la même devise.';

function toLineAmounts(row: {
  initialAmount: unknown;
  revisedAmount: unknown;
  forecastAmount: unknown;
  committedAmount: unknown;
  consumedAmount: unknown;
  remainingAmount: unknown;
}): LineAmountsInput {
  return {
    initialAmount: fromDecimal(row.initialAmount as Parameters<typeof fromDecimal>[0]),
    revisedAmount: fromDecimal(row.revisedAmount as Parameters<typeof fromDecimal>[0]),
    forecastAmount: fromDecimal(row.forecastAmount as Parameters<typeof fromDecimal>[0]),
    committedAmount: fromDecimal(row.committedAmount as Parameters<typeof fromDecimal>[0]),
    consumedAmount: fromDecimal(row.consumedAmount as Parameters<typeof fromDecimal>[0]),
    remainingAmount: fromDecimal(row.remainingAmount as Parameters<typeof fromDecimal>[0]),
  };
}

function assertSingleCurrency(
  currencies: string[],
  linesLength: number,
): void {
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

  async getExerciseSummary(
    clientId: string,
    exerciseId: string,
  ): Promise<BudgetSummaryKpi> {
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id: exerciseId, clientId },
      include: { budgets: { select: { id: true } } },
    });
    if (!exercise) {
      throw new NotFoundException('Budget exercise not found');
    }
    const budgetIds = exercise.budgets.map((b) => b.id);
    if (budgetIds.length === 0) {
      return aggregateLinesToKpi([], null, {
        budgetCount: 0,
        envelopeCount: 0,
      });
    }
    const lines = await this.prisma.budgetLine.findMany({
      where: { clientId, budgetId: { in: budgetIds } },
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
    assertSingleCurrency(currencies, lines.length);
    const amounts = lines.map((l) => toLineAmounts(l));
    return aggregateLinesToKpi(amounts, lines[0].currency, {
      budgetCount: budgetIds.length,
      envelopeCount,
    });
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
      where: { clientId, budgetId },
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
    const currencies = lines.map((l) => l.currency);
    assertSingleCurrency(currencies, lines.length);
    const amounts = lines.map((l) => toLineAmounts(l));
    return aggregateLinesToKpi(amounts, lines[0].currency, {
      envelopeCount,
    });
  }

  async getEnvelopeSummary(
    clientId: string,
    envelopeId: string,
    includeChildren: boolean,
  ): Promise<BudgetSummaryKpi> {
    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: envelopeId, clientId },
      include: { budget: { select: { currency: true } } },
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
      where: { clientId, envelopeId: { in: envelopeIds } },
    });
    const parentCurrency = envelope.budget?.currency ?? null;
    if (lines.length === 0) {
      return aggregateLinesToKpi([], parentCurrency);
    }
    const currencies = lines.map((l) => l.currency);
    assertSingleCurrency(currencies, lines.length);
    const amounts = lines.map((l) => toLineAmounts(l));
    return aggregateLinesToKpi(amounts, lines[0].currency);
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
    const where: import('@prisma/client').Prisma.BudgetWhereInput = {
      clientId,
      exerciseId,
      ...(query.status && { status: query.status }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }
    const [budgets, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
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
        where: { clientId, budgetId: { in: budgetIds } },
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
      return {
        id: budget.id,
        clientId: budget.clientId,
        exerciseId: budget.exerciseId,
        name: budget.name,
        code: budget.code,
        description: budget.description,
        currency: budget.currency,
        status: budget.status,
        kpi,
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
      where: { clientId, envelopeId: { in: Array.from(envelopeIdsToFetch) } },
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
        kpi,
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
        revisedAmount: fromDecimal(line.revisedAmount),
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
      where: { clientId, budgetId },
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
}
