import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertBudgetLineExistsForClient } from './helpers/budget-line.helper';
import { aggregateBudgetLineAmounts } from './budget-line-amounts.aggregate';
import { BudgetLandingService } from '../budget-landing/budget-landing.service';

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class BudgetLineCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly landingService: BudgetLandingService,
  ) {}

  /**
   * Recalcule committedAmount, consumedAmount, remainingAmount pour une ligne,
   * puis l'atterrissage (RFC-BUD-040) via BudgetLandingService.
   */
  async recalculateForBudgetLine(
    budgetLineId: string,
    clientId: string,
    tx?: TxClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await assertBudgetLineExistsForClient(client, budgetLineId, clientId);

    const [line, allocations, events] = await Promise.all([
      client.budgetLine.findUniqueOrThrow({
        where: { id: budgetLineId, clientId },
        select: { initialAmount: true },
      }),
      client.financialAllocation.findMany({
        where: { budgetLineId, clientId },
        select: { allocationType: true, allocatedAmount: true },
      }),
      client.financialEvent.findMany({
        where: { budgetLineId, clientId },
        select: { eventType: true, amountHt: true },
      }),
    ]);

    const aggregated = aggregateBudgetLineAmounts(
      line.initialAmount,
      events,
      allocations,
    );

    await client.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        committedAmount: aggregated.committedAmount.toDecimalPlaces(2),
        consumedAmount: aggregated.consumedAmount.toDecimalPlaces(2),
        remainingAmount: aggregated.remainingAmount.toDecimalPlaces(2),
      },
    });

    await this.landingService.recalculateAndPersist(
      clientId,
      budgetLineId,
      undefined,
      tx,
    );
  }
}
