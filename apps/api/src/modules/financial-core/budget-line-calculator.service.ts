import { Injectable } from '@nestjs/common';
import { AllocationType, FinancialEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertBudgetLineExistsForClient } from './helpers/budget-line.helper';

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
   * Base effective = revisedAmount + delta des REALLOCATION_DONE (non comptés dans forecast/committed/consumed).
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
        select: { revisedAmount: true },
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

    const zero = new Prisma.Decimal(0);

    const revisedAmount = line.revisedAmount;
    const reallocationDelta = events
      .filter((e) => e.eventType === FinancialEventType.REALLOCATION_DONE)
      .reduce((sum, e) => sum.plus(e.amountHt), zero);
    const effectiveBudgetBase = revisedAmount.plus(reallocationDelta);

    const forecastAmount = allocations
      .filter((a) => a.allocationType === AllocationType.FORECAST)
      .reduce((sum, a) => sum.plus(a.allocatedAmount), zero);

    const committedAlloc = allocations
      .filter((a) => a.allocationType === AllocationType.COMMITTED)
      .reduce((sum, a) => sum.plus(a.allocatedAmount), zero);
    const committedEvents = events
      .filter(
        (e) => e.eventType === FinancialEventType.COMMITMENT_REGISTERED,
      )
      .reduce((sum, e) => sum.plus(e.amountHt), zero);
    const committedAmount = committedAlloc.plus(committedEvents);

    const consumedAlloc = allocations
      .filter((a) => a.allocationType === AllocationType.CONSUMED)
      .reduce((sum, a) => sum.plus(a.allocatedAmount), zero);
    const consumedEvents = events
      .filter(
        (e) => e.eventType === FinancialEventType.CONSUMPTION_REGISTERED,
      )
      .reduce((sum, e) => sum.plus(e.amountHt), zero);
    const consumedAmount = consumedAlloc.plus(consumedEvents);

    const remainingAmount = effectiveBudgetBase
      .minus(committedAmount)
      .minus(consumedAmount);

    await client.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        forecastAmount: forecastAmount.toDecimalPlaces(2),
        committedAmount: committedAmount.toDecimalPlaces(2),
        consumedAmount: consumedAmount.toDecimalPlaces(2),
        remainingAmount: remainingAmount.toDecimalPlaces(2),
      },
    });
  }
}
