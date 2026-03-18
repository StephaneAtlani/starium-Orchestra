import { Injectable, NotFoundException } from '@nestjs/common';
import { AllocationType, FinancialEventType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import type { DashboardQueryDto } from './dto/dashboard.query.dto';
import type { BudgetDashboardResponse } from './types/budget-dashboard.types';

type DecimalLike = Prisma.Decimal | null | undefined;

const TOP_LIMIT = 10;

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

function riskLevel(ratio: number): RiskLevel {
  if (ratio < 0.7) return 'LOW';
  if (ratio <= 0.9) return 'MEDIUM';
  return 'HIGH';
}

@Injectable()
export class BudgetDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(
    clientId: string,
    query: DashboardQueryDto,
  ): Promise<BudgetDashboardResponse> {
    const { budget, exercise } = await this.resolveBudgetAndExercise(
      clientId,
      query.budgetId,
      query.exerciseId,
    );
    const budgetId = budget.id;
    const exerciseId = exercise.id;

    const includeEnvelopes = query.includeEnvelopes !== false;
    const includeLines = query.includeLines !== false;

    const [linesForAggregation, allocationSums, eventsForTrend] =
      await Promise.all([
        this.prisma.budgetLine.findMany({
          where: { clientId, budgetId },
          select: {
            id: true,
            envelopeId: true,
            revisedAmount: true,
            remainingAmount: true,
            consumedAmount: true,
            forecastAmount: true,
            expenseType: true,
            code: true,
            name: true,
            envelope: { select: { id: true, code: true, name: true } },
          },
        }),
        this.getAllocationSums(clientId, budgetId),
        this.prisma.financialEvent.findMany({
          where: {
            clientId,
            budgetLine: { budgetId },
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
    const consumed = allocationSums.consumed;
    const committed = allocationSums.committed;
    const forecast = allocationSums.forecast;
    const consumptionRate =
      totalBudget === 0 ? 0 : consumed / totalBudget;

    const capex = linesForAggregation
      .filter((l) => l.expenseType === 'CAPEX')
      .reduce((s, l) => s + fromDecimal(l.revisedAmount), 0);
    const opex = linesForAggregation
      .filter((l) => l.expenseType === 'OPEX')
      .reduce((s, l) => s + fromDecimal(l.revisedAmount), 0);

    const monthlyTrend = this.buildMonthlyTrend(eventsForTrend);

    const response: BudgetDashboardResponse = {
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
      kpis: {
        totalBudget,
        committed,
        consumed,
        forecast,
        remaining,
        consumptionRate,
      },
      capexOpexDistribution: { capex, opex },
      monthlyTrend,
    };

    if (includeEnvelopes) {
      response.topEnvelopes = this.buildTopEnvelopes(linesForAggregation);
      response.riskEnvelopes = this.buildRiskEnvelopes(linesForAggregation);
    }
    if (includeLines) {
      response.topBudgetLines = this.buildTopBudgetLines(linesForAggregation);
    }

    return response;
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
      where: { clientId, exerciseId, status: 'ACTIVE' },
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

  private buildTopEnvelopes(
    lines: {
      envelopeId: string;
      envelope: { id: string; code: string; name: string };
      revisedAmount: DecimalLike;
      consumedAmount: DecimalLike;
      remainingAmount: DecimalLike;
    }[],
  ): BudgetDashboardResponse['topEnvelopes'] {
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
      .slice(0, TOP_LIMIT);
  }

  private buildRiskEnvelopes(
    lines: {
      envelopeId: string;
      envelope: { id: string; code: string; name: string };
      forecastAmount: DecimalLike;
      revisedAmount: DecimalLike;
    }[],
  ): BudgetDashboardResponse['riskEnvelopes'] {
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
        riskLevel: riskLevel(riskRatio),
      };
    });
  }

  private buildTopBudgetLines(
    lines: {
      id: string;
      code: string;
      name: string;
      envelope: { name: string };
      consumedAmount: DecimalLike;
      forecastAmount: DecimalLike;
      remainingAmount: DecimalLike;
    }[],
  ): BudgetDashboardResponse['topBudgetLines'] {
    return [...lines]
      .sort(
        (a, b) =>
          fromDecimal(b.consumedAmount) - fromDecimal(a.consumedAmount),
      )
      .slice(0, TOP_LIMIT)
      .map((l) => ({
        lineId: l.id,
        code: l.code ?? null,
        name: l.name,
        envelopeName: l.envelope?.name ?? null,
        consumed: fromDecimal(l.consumedAmount),
        forecast: fromDecimal(l.forecastAmount),
        remaining: fromDecimal(l.remainingAmount),
      }));
  }
}
