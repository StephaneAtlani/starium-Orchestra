import { Injectable } from '@nestjs/common';
import { AllocationType, FinancialEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertBudgetLineExistsForClient } from './helpers/budget-line.helper';
import { aggregateBudgetLineAmounts } from './budget-line-amounts.aggregate';

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class BudgetLineCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcule forecastAmount, committedAmount, consumedAmount, remainingAmount
   * pour une ligne budgétaire. Utilise tx si fourni (dans une transaction).
   * Base effective = initialAmount (montant budgétaire) + delta des REALLOCATION_DONE (non comptés dans forecast/committed/consumed).
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
        forecastAmount: aggregated.forecastAmount.toDecimalPlaces(2),
        committedAmount: aggregated.committedAmount.toDecimalPlaces(2),
        consumedAmount: aggregated.consumedAmount.toDecimalPlaces(2),
        remainingAmount: aggregated.remainingAmount.toDecimalPlaces(2),
      },
    });
  }
}
