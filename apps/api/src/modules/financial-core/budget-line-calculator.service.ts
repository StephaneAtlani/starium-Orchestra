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
   * Formule MVP : budgetBase = revisedAmount ; remaining = budgetBase - committed - consumed.
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
        select: { eventType: true, amount: true },
      }),
    ]);

    const budgetBase = Number(line.revisedAmount);

    const forecastAmount = allocations
      .filter((a) => a.allocationType === AllocationType.FORECAST)
      .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);

    const committedAlloc = allocations
      .filter((a) => a.allocationType === AllocationType.COMMITTED)
      .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
    const committedEvents = events
      .filter((e) => e.eventType === FinancialEventType.COMMITMENT_REGISTERED)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const committedAmount = committedAlloc + committedEvents;

    const consumedAlloc = allocations
      .filter((a) => a.allocationType === AllocationType.CONSUMED)
      .reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
    const consumedEvents = events
      .filter((e) => e.eventType === FinancialEventType.CONSUMPTION_REGISTERED)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const consumedAmount = consumedAlloc + consumedEvents;

    const remainingAmount = budgetBase - committedAmount - consumedAmount;

    await client.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        forecastAmount: new Prisma.Decimal(forecastAmount),
        committedAmount: new Prisma.Decimal(committedAmount),
        consumedAmount: new Prisma.Decimal(consumedAmount),
        remainingAmount: new Prisma.Decimal(remainingAmount),
      },
    });
  }
}
