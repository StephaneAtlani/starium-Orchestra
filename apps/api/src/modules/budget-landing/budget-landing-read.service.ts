import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetReportingService } from '../budget-reporting/budget-reporting.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import {
  computeLandingLineStatus,
  landingRate,
} from './budget-landing.calculator';
import {
  computeVarianceConsumed,
  computeVarianceForecast,
  safeRate,
} from '../budget-forecast/calculators/variance.calculator';
import { ListForecastEnvelopeLinesQueryDto } from '../budget-forecast/dto/list-forecast-envelope-lines.query.dto';
import type {
  BudgetForecastResponse,
  EnvelopeForecastLinesResponse,
  EnvelopeForecastResponse,
} from '../budget-forecast/types/budget-forecast.types';
import { computeEffectiveBudgetBase, type EventSlice } from '../financial-core/budget-line-amounts.aggregate';

function resolveLandingAmount(line: {
  landingAmount: unknown;
  forecastAmount: unknown;
}): number {
  if (line.landingAmount != null) {
    return fromDecimal(line.landingAmount as Parameters<typeof fromDecimal>[0]);
  }
  return fromDecimal(line.forecastAmount as Parameters<typeof fromDecimal>[0]);
}

@Injectable()
export class BudgetLandingReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportingService: BudgetReportingService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getBudgetLanding(
    clientId: string,
    budgetId: string,
    actorUserId?: string,
  ): Promise<BudgetForecastResponse & { totalLanding: number; landingRate: number }> {
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
          id: true,
          initialAmount: true,
          consumedAmount: true,
          forecastAmount: true,
          landingAmount: true,
        },
      }),
    ]);

    const totalLanding = summary.totalLandingAmount ?? summary.totalForecastAmount;

    const response = {
      budgetId,
      currency: summary.currency,
      totalBudget: summary.totalInitialAmount,
      totalConsumed: summary.totalConsumedAmount,
      totalForecast: totalLanding,
      totalLanding,
      totalRemaining: summary.totalRemainingAmount,
      varianceConsumed: computeVarianceConsumed(
        summary.totalInitialAmount,
        summary.totalConsumedAmount,
      ),
      varianceForecast: computeVarianceForecast(
        summary.totalInitialAmount,
        totalLanding,
      ),
      landingVariance: totalLanding - summary.totalInitialAmount,
      consumptionRate: safeRate(
        summary.totalConsumedAmount,
        summary.totalInitialAmount,
      ),
      forecastRate: safeRate(totalLanding, summary.totalInitialAmount),
      landingRate: safeRate(totalLanding, summary.totalInitialAmount),
      alerts: {
        overForecast: lines.filter((l) => {
          const landing = resolveLandingAmount(l);
          return landing > fromDecimal(l.initialAmount);
        }).length,
        overConsumed: lines.filter(
          (l) => fromDecimal(l.consumedAmount) > fromDecimal(l.initialAmount),
        ).length,
      },
    };

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.landing.viewed',
      resourceType: 'budget',
      resourceId: budgetId,
    });

    return response;
  }

  async getEnvelopeLanding(
    clientId: string,
    envelopeId: string,
    actorUserId?: string,
  ): Promise<EnvelopeForecastResponse & { totalLanding: number; landingRate: number }> {
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
          landingAmount: true,
        },
      }),
    ]);

    const totalLanding = summary.totalLandingAmount ?? summary.totalForecastAmount;

    const response = {
      envelopeId,
      currency: summary.currency,
      totalBudget: summary.totalInitialAmount,
      totalConsumed: summary.totalConsumedAmount,
      totalForecast: totalLanding,
      totalLanding,
      totalRemaining: summary.totalRemainingAmount,
      varianceConsumed: computeVarianceConsumed(
        summary.totalInitialAmount,
        summary.totalConsumedAmount,
      ),
      varianceForecast: computeVarianceForecast(
        summary.totalInitialAmount,
        totalLanding,
      ),
      landingVariance: totalLanding - summary.totalInitialAmount,
      consumptionRate: safeRate(
        summary.totalConsumedAmount,
        summary.totalInitialAmount,
      ),
      forecastRate: safeRate(totalLanding, summary.totalInitialAmount),
      landingRate: safeRate(totalLanding, summary.totalInitialAmount),
      alerts: {
        overForecast: lines.filter((l) => {
          const landing = resolveLandingAmount(l);
          return landing > fromDecimal(l.initialAmount);
        }).length,
        overConsumed: lines.filter(
          (l) => fromDecimal(l.consumedAmount) > fromDecimal(l.initialAmount),
        ).length,
      },
    };

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.landing.viewed',
      resourceType: 'budget_envelope',
      resourceId: envelopeId,
    });

    return response;
  }

  async listEnvelopeLandingLines(
    clientId: string,
    envelopeId: string,
    query: ListForecastEnvelopeLinesQueryDto,
    actorUserId?: string,
  ): Promise<EnvelopeForecastLinesResponse> {
    const envelope = await this.prisma.budgetEnvelope.findFirst({
      where: { id: envelopeId, clientId },
      select: {
        id: true,
        budget: { select: { currency: true } },
      },
    });
    if (!envelope) {
      throw new NotFoundException('Budget envelope not found');
    }

    await this.reportingService.getEnvelopeSummary(clientId, envelopeId, false);
    const report = await this.reportingService.listLinesForEnvelope(
      clientId,
      envelopeId,
      query,
    );

    const lineIds = report.items.map((item) => item.id);
    const eventsByLine = new Map<string, EventSlice[]>();
    if (lineIds.length > 0) {
      const events = await this.prisma.financialEvent.findMany({
        where: { clientId, budgetLineId: { in: lineIds } },
        select: { budgetLineId: true, eventType: true, amountHt: true },
      });
      for (const event of events) {
        const list = eventsByLine.get(event.budgetLineId) ?? [];
        list.push({ eventType: event.eventType, amountHt: event.amountHt });
        eventsByLine.set(event.budgetLineId, list);
      }
    }

    const lines = report.items.map((item) => {
      const landing = item.landingAmount ?? item.forecastAmount;
      const effectiveBase = computeEffectiveBudgetBase(
        item.initialAmount,
        eventsByLine.get(item.id) ?? [],
      ).toNumber();
      return {
        lineId: item.id,
        code: item.code,
        name: item.name,
        budget: effectiveBase,
        consumed: item.consumedAmount,
        forecast: landing,
        landing,
        remaining: item.remainingAmount,
        varianceConsumed: computeVarianceConsumed(effectiveBase, item.consumedAmount),
        varianceForecast: computeVarianceForecast(effectiveBase, landing),
        landingVariance: landing - effectiveBase,
        consumptionRate: safeRate(item.consumedAmount, effectiveBase),
        forecastRate: safeRate(landing, effectiveBase),
        landingRate: landingRate(landing, effectiveBase),
        status: computeLandingLineStatus({
          effectiveBudgetBase: effectiveBase,
          consumed: item.consumedAmount,
          landing,
        }),
      };
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.landing.viewed',
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
