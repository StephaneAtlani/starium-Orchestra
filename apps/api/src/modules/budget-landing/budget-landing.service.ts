import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { defaultReferenceDateUtc } from '@starium-orchestra/budget-exercise-calendar';
import { PrismaService } from '../../prisma/prisma.service';
import {
  computeEffectiveBudgetBase,
  type AllocationSlice,
  type EventSlice,
} from '../financial-core/budget-line-amounts.aggregate';
import { calculateLanding, computeLandingLineStatus, landingRate } from './budget-landing.calculator';
import type { LandingLineStatus, LandingResult } from './budget-landing.types';

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const LINE_FOR_LANDING_SELECT = {
  id: true,
  clientId: true,
  initialAmount: true,
  consumedAmount: true,
  committedAmount: true,
  remainingAmount: true,
  currency: true,
  budget: {
    select: {
      exercise: {
        select: { startDate: true, endDate: true },
      },
    },
  },
  planningMonths: {
    select: { monthIndex: true, amount: true },
    orderBy: { monthIndex: 'asc' as const },
  },
} as const;

export type BudgetLineLandingDto = {
  budgetLineId: string;
  currency: string;
  effectiveBudgetBase: number;
  planningTotalAmount: number;
  remainingPlanning: number;
  landingAmount: number;
  landingVariance: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  landingRate: number;
  status: LandingLineStatus;
  forecastAmount: number;
  varianceForecast: number;
};

@Injectable()
export class BudgetLandingService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateAndPersist(
    clientId: string,
    budgetLineId: string,
    referenceDate: Date = defaultReferenceDateUtc(),
    tx?: TxClient,
  ): Promise<LandingResult> {
    const client = tx ?? this.prisma;
    const computed = await this.computeForLine(
      clientId,
      budgetLineId,
      referenceDate,
      client,
    );

    const now = new Date();
    await client.budgetLine.update({
      where: { id: budgetLineId, clientId },
      data: {
        landingAmount: computed.landingAmount,
        landingComputedAt: now,
        forecastAmount: computed.landingAmount,
        planningTotalAmount: computed.planningTotalAmount,
      },
    });

    return computed;
  }

  async recalculateManyAndPersist(
    clientId: string,
    budgetLineIds: string[],
    referenceDate: Date = defaultReferenceDateUtc(),
    tx?: TxClient,
  ): Promise<void> {
    for (const budgetLineId of budgetLineIds) {
      await this.recalculateAndPersist(clientId, budgetLineId, referenceDate, tx);
    }
  }

  async calculateAtDate(
    clientId: string,
    budgetLineId: string,
    referenceDate: Date,
    tx?: TxClient,
  ): Promise<LandingResult> {
    const client = tx ?? this.prisma;
    return this.computeForLine(clientId, budgetLineId, referenceDate, client);
  }

  async getBudgetLineLanding(
    clientId: string,
    budgetLineId: string,
    referenceDate?: Date,
  ): Promise<BudgetLineLandingDto> {
    const ref = referenceDate ?? defaultReferenceDateUtc();
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: budgetLineId, clientId },
      select: {
        ...LINE_FOR_LANDING_SELECT,
        landingAmount: true,
        forecastAmount: true,
      },
    });
    if (!line) {
      throw new NotFoundException('Budget line not found');
    }

    const [events, allocations] = await Promise.all([
      this.prisma.financialEvent.findMany({
        where: { budgetLineId, clientId },
        select: { eventType: true, amountHt: true },
      }),
      this.prisma.financialAllocation.findMany({
        where: { budgetLineId, clientId },
        select: { allocationType: true, allocatedAmount: true },
      }),
    ]);

    const effectiveBudgetBase = computeEffectiveBudgetBase(
      line.initialAmount,
      events as EventSlice[],
    );
    const computed = calculateLanding({
      effectiveBudgetBase,
      consumedAmount: line.consumedAmount,
      committedAmount: line.committedAmount,
      exerciseStart: line.budget.exercise.startDate,
      exerciseEnd: line.budget.exercise.endDate,
      referenceDate: ref,
      planningMonths: line.planningMonths,
    });

    const effectiveBase = effectiveBudgetBase.toNumber();
    const landing = computed.landingAmount.toNumber();
    const consumed = Number(line.consumedAmount);
    const status = computeLandingLineStatus({
      effectiveBudgetBase: effectiveBase,
      consumed,
      landing,
    }) as LandingLineStatus;

    return {
      budgetLineId: line.id,
      currency: line.currency,
      effectiveBudgetBase: effectiveBase,
      planningTotalAmount: computed.planningTotalAmount.toNumber(),
      remainingPlanning: computed.remainingPlanning.toNumber(),
      landingAmount: landing,
      landingVariance: computed.landingVariance.toNumber(),
      committedAmount: Number(line.committedAmount),
      consumedAmount: consumed,
      remainingAmount: Number(line.remainingAmount),
      landingRate: landingRate(computed.landingAmount, effectiveBudgetBase),
      status,
      forecastAmount: landing,
      varianceForecast: effectiveBase - landing,
    };
  }

  private async computeForLine(
    clientId: string,
    budgetLineId: string,
    referenceDate: Date,
    client: TxClient | PrismaService,
  ): Promise<LandingResult> {
    const line = await client.budgetLine.findFirst({
      where: { id: budgetLineId, clientId },
      select: LINE_FOR_LANDING_SELECT,
    });
    if (!line) {
      throw new NotFoundException('Budget line not found');
    }

    const [events, allocations] = await Promise.all([
      client.financialEvent.findMany({
        where: { budgetLineId, clientId },
        select: { eventType: true, amountHt: true },
      }),
      client.financialAllocation.findMany({
        where: { budgetLineId, clientId },
        select: { allocationType: true, allocatedAmount: true },
      }),
    ]);

    void allocations;

    const effectiveBudgetBase = computeEffectiveBudgetBase(
      line.initialAmount,
      events as EventSlice[],
    );

    return calculateLanding({
      effectiveBudgetBase,
      consumedAmount: line.consumedAmount,
      committedAmount: line.committedAmount,
      exerciseStart: line.budget.exercise.startDate,
      exerciseEnd: line.budget.exercise.endDate,
      referenceDate,
      planningMonths: line.planningMonths,
    });
  }
}
