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

export function computeEffectiveBudgetBase(
  initialAmount: Prisma.Decimal | number | string,
  events: EventSlice[],
): Prisma.Decimal {
  const zero = new Prisma.Decimal(0);
  const budgetAmount = new Prisma.Decimal(initialAmount as Prisma.Decimal.Value);
  const reallocationDelta = events
    .filter((e) => e.eventType === FinancialEventType.REALLOCATION_DONE)
    .reduce((sum, e) => sum.plus(e.amountHt), zero);
  return budgetAmount.plus(reallocationDelta);
}

/**
 * Même logique que `BudgetLineCalculatorService.recalculateForBudgetLine` :
 * engagements / consommation / restant à partir des mouvements fournis.
 * Utilisé pour les versions figées « à date » (filtrage des mouvements en amont).
 * RFC-BUD-040 : le forecast/atterrissage n'est plus dérivé des allocations FORECAST.
 */
export function aggregateBudgetLineAmounts(
  initialAmount: Prisma.Decimal | number | string,
  events: EventSlice[],
  allocations: AllocationSlice[],
): {
  committedAmount: Prisma.Decimal;
  consumedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  effectiveBudgetBase: Prisma.Decimal;
} {
  const zero = new Prisma.Decimal(0);
  const effectiveBudgetBase = computeEffectiveBudgetBase(initialAmount, events);
  const evs = events.map((e) => ({
    eventType: e.eventType,
    amountHt: new Prisma.Decimal(e.amountHt as Prisma.Decimal.Value),
  }));
  const allocs = allocations.map((a) => ({
    allocationType: a.allocationType,
    allocatedAmount: new Prisma.Decimal(a.allocatedAmount as Prisma.Decimal.Value),
  }));

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
    committedAmount,
    consumedAmount,
    remainingAmount,
    effectiveBudgetBase,
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
