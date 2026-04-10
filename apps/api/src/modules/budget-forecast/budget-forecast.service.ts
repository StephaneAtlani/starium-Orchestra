import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetReportingService } from '../budget-reporting/budget-reporting.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import {
  computeLineStatus,
  computeVarianceConsumed,
  computeVarianceForecast,
  safeRate,
} from './calculators/variance.calculator';
import { ListForecastEnvelopeLinesQueryDto } from './dto/list-forecast-envelope-lines.query.dto';
import type {
  BudgetForecastResponse,
  EnvelopeForecastLinesResponse,
  EnvelopeForecastResponse,
} from './types/budget-forecast.types';

@Injectable()
export class BudgetForecastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportingService: BudgetReportingService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getBudgetForecast(
    clientId: string,
    budgetId: string,
    actorUserId?: string,
  ): Promise<BudgetForecastResponse> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      select: { id: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const [summary, lines] = await Promise.all([
      this.reportingService.getBudgetSummary(clientId, budgetId),
      this.prisma.budgetLine.findMany({
        where: { clientId, budgetId },
        select: {
          initialAmount: true,
          consumedAmount: true,
          forecastAmount: true,
        },
      }),
    ]);

    const response: BudgetForecastResponse = {
      budgetId,
      currency: summary.currency,
      totalBudget: summary.totalInitialAmount,
      totalConsumed: summary.totalConsumedAmount,
      totalForecast: summary.totalForecastAmount,
      totalRemaining: summary.totalRemainingAmount,
      varianceConsumed: computeVarianceConsumed(
        summary.totalInitialAmount,
        summary.totalConsumedAmount,
      ),
      varianceForecast: computeVarianceForecast(
        summary.totalInitialAmount,
        summary.totalForecastAmount,
      ),
      consumptionRate: safeRate(
        summary.totalConsumedAmount,
        summary.totalInitialAmount,
      ),
      forecastRate: safeRate(
        summary.totalForecastAmount,
        summary.totalInitialAmount,
      ),
      alerts: {
        overForecast: lines.filter(
          (l) => fromDecimal(l.forecastAmount) > fromDecimal(l.initialAmount),
        ).length,
        overConsumed: lines.filter(
          (l) => fromDecimal(l.consumedAmount) > fromDecimal(l.initialAmount),
        ).length,
      },
    };

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.forecast.viewed',
      resourceType: 'budget',
      resourceId: budgetId,
    });

    return response;
  }

  async getEnvelopeForecast(
    clientId: string,
    envelopeId: string,
    actorUserId?: string,
  ): Promise<EnvelopeForecastResponse> {
    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: envelopeId, clientId },
      select: { id: true },
    });
    if (!envelope) {
      throw new NotFoundException('Budget envelope not found');
    }

    const [summary, lines] = await Promise.all([
      this.reportingService.getEnvelopeSummary(clientId, envelopeId, false),
      this.prisma.budgetLine.findMany({
        where: { clientId, envelopeId },
        select: {
          initialAmount: true,
          consumedAmount: true,
          forecastAmount: true,
        },
      }),
    ]);

    const response: EnvelopeForecastResponse = {
      envelopeId,
      currency: summary.currency,
      totalBudget: summary.totalInitialAmount,
      totalConsumed: summary.totalConsumedAmount,
      totalForecast: summary.totalForecastAmount,
      totalRemaining: summary.totalRemainingAmount,
      varianceConsumed: computeVarianceConsumed(
        summary.totalInitialAmount,
        summary.totalConsumedAmount,
      ),
      varianceForecast: computeVarianceForecast(
        summary.totalInitialAmount,
        summary.totalForecastAmount,
      ),
      consumptionRate: safeRate(
        summary.totalConsumedAmount,
        summary.totalInitialAmount,
      ),
      forecastRate: safeRate(
        summary.totalForecastAmount,
        summary.totalInitialAmount,
      ),
      alerts: {
        overForecast: lines.filter(
          (l) => fromDecimal(l.forecastAmount) > fromDecimal(l.initialAmount),
        ).length,
        overConsumed: lines.filter(
          (l) => fromDecimal(l.consumedAmount) > fromDecimal(l.initialAmount),
        ).length,
      },
    };

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.forecast.viewed',
      resourceType: 'budget_envelope',
      resourceId: envelopeId,
    });

    return response;
  }

  async listEnvelopeForecastLines(
    clientId: string,
    envelopeId: string,
    query: ListForecastEnvelopeLinesQueryDto,
    actorUserId?: string,
  ): Promise<EnvelopeForecastLinesResponse> {
    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: envelopeId, clientId },
      select: {
        id: true,
        budget: {
          select: { currency: true },
        },
      },
    });
    if (!envelope) {
      throw new NotFoundException('Budget envelope not found');
    }

    // Enforce same currency validation behavior as reporting summary path.
    await this.reportingService.getEnvelopeSummary(clientId, envelopeId, false);
    const report = await this.reportingService.listLinesForEnvelope(
      clientId,
      envelopeId,
      query,
    );

    const lines = report.items.map((item) => ({
      lineId: item.id,
      code: item.code,
      name: item.name,
      budget: item.initialAmount,
      consumed: item.consumedAmount,
      forecast: item.forecastAmount,
      remaining: item.remainingAmount,
      varianceConsumed: computeVarianceConsumed(
        item.initialAmount,
        item.consumedAmount,
      ),
      varianceForecast: computeVarianceForecast(
        item.initialAmount,
        item.forecastAmount,
      ),
      consumptionRate: safeRate(item.consumedAmount, item.initialAmount),
      forecastRate: safeRate(item.forecastAmount, item.initialAmount),
      status: computeLineStatus({
        budget: item.initialAmount,
        consumed: item.consumedAmount,
        forecast: item.forecastAmount,
      }),
    }));

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.forecast.viewed',
      resourceType: 'budget_envelope',
      resourceId: envelopeId,
    });

    return {
      envelopeId,
      currency: report.items[0]?.currency ?? envelope.budget.currency ?? null,
      lines,
      total: report.total,
      limit: report.limit,
      offset: report.offset,
    };
  }
}
