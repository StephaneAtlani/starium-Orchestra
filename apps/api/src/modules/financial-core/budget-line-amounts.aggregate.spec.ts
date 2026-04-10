import { FinancialEventType, Prisma } from '@prisma/client';
import {
  aggregateBudgetLineAmounts,
  snapshotAsOfInclusiveEndUtc,
} from './budget-line-amounts.aggregate';

describe('snapshotAsOfInclusiveEndUtc', () => {
  it('retourne la fin du jour UTC du calendrier de la date de capture', () => {
    const d = new Date('2026-04-01T14:30:00.000Z');
    const end = snapshotAsOfInclusiveEndUtc(d);
    expect(end.toISOString()).toBe('2026-04-01T23:59:59.999Z');
  });
});

describe('aggregateBudgetLineAmounts', () => {
  it('reproduit le cas facture : consommation sur eventDate (date facture)', () => {
    const initial = new Prisma.Decimal(10_000);
    const agg = aggregateBudgetLineAmounts(
      initial,
      [
        {
          eventType: FinancialEventType.CONSUMPTION_REGISTERED,
          amountHt: new Prisma.Decimal(500),
        },
      ],
      [],
    );
    expect(Number(agg.consumedAmount)).toBe(500);
    expect(Number(agg.remainingAmount)).toBe(9500);
  });
});
