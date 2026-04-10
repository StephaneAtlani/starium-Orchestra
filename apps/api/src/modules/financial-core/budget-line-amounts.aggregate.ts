import {
  AllocationType,
  FinancialEventType,
  Prisma,
} from '@prisma/client';

export type EventSlice = {
  eventType: FinancialEventType;
  amountHt: Prisma.Decimal;
};

export type AllocationSlice = {
  allocationType: AllocationType;
  allocatedAmount: Prisma.Decimal;
};

/**
 * Même logique que `BudgetLineCalculatorService.recalculateForBudgetLine` :
 * prévision / engagements / consommation / restant à partir des mouvements fournis.
 * Utilisé pour les versions figées « à date » (filtrage des mouvements en amont).
 */
export function aggregateBudgetLineAmounts(
  initialAmount: Prisma.Decimal | number | string,
  events: EventSlice[],
  allocations: AllocationSlice[],
): {
  forecastAmount: Prisma.Decimal;
  committedAmount: Prisma.Decimal;
  consumedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
} {
  const zero = new Prisma.Decimal(0);
  const budgetAmount = new Prisma.Decimal(initialAmount as any);
  const evs = events.map((e) => ({
    eventType: e.eventType,
    amountHt: new Prisma.Decimal(e.amountHt as any),
  }));
  const allocs = allocations.map((a) => ({
    allocationType: a.allocationType,
    allocatedAmount: new Prisma.Decimal(a.allocatedAmount as any),
  }));

  const reallocationDelta = evs
    .filter((e) => e.eventType === FinancialEventType.REALLOCATION_DONE)
    .reduce((sum, e) => sum.plus(e.amountHt), zero);
  const effectiveBudgetBase = budgetAmount.plus(reallocationDelta);

  const forecastAmount = allocs
    .filter((a) => a.allocationType === AllocationType.FORECAST)
    .reduce((sum, a) => sum.plus(a.allocatedAmount), zero);

  const committedAlloc = allocs
    .filter((a) => a.allocationType === AllocationType.COMMITTED)
    .reduce((sum, a) => sum.plus(a.allocatedAmount), zero);
  const committedEvents = evs
    .filter((e) => e.eventType === FinancialEventType.COMMITMENT_REGISTERED)
    .reduce((sum, e) => sum.plus(e.amountHt), zero);
  const committedAmount = committedAlloc.plus(committedEvents);

  const consumedAlloc = allocs
    .filter((a) => a.allocationType === AllocationType.CONSUMED)
    .reduce((sum, a) => sum.plus(a.allocatedAmount), zero);
  const consumedEvents = evs
    .filter((e) => e.eventType === FinancialEventType.CONSUMPTION_REGISTERED)
    .reduce((sum, e) => sum.plus(e.amountHt), zero);
  const consumedAmount = consumedAlloc.plus(consumedEvents);

  const remainingAmount = effectiveBudgetBase
    .minus(committedAmount)
    .minus(consumedAmount);

  return {
    forecastAmount,
    committedAmount,
    consumedAmount,
    remainingAmount,
  };
}

/**
 * Fin du jour calendaire **UTC** pour l’instant de `snapshotDate` (capture version figée).
 * Les écritures avec `eventDate <=` ce instant sont incluses (ex. facture saisie plus tard avec date facture antérieure).
 */
export function snapshotAsOfInclusiveEndUtc(snapshotDate: Date): Date {
  return new Date(
    Date.UTC(
      snapshotDate.getUTCFullYear(),
      snapshotDate.getUTCMonth(),
      snapshotDate.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}
