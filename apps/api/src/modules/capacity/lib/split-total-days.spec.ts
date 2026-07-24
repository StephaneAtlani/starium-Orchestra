import { Prisma } from '@prisma/client';
import { splitTotalDaysByWorkingDays } from './split-total-days';

describe('splitTotalDaysByWorkingDays', () => {
  it('répartit 40 J/H sur 2 mois à poids égaux', () => {
    const a = splitTotalDaysByWorkingDays(
      new Date(Date.UTC(2025, 8, 1)),
      new Date(Date.UTC(2025, 9, 31)),
      new Prisma.Decimal('40'),
    );
    const sum = a.reduce((s, x) => s.plus(x.days), new Prisma.Decimal(0));
    expect(sum.equals(new Prisma.Decimal('40'))).toBe(true);
  });

  it('0.50 sur 100 segments poids égaux → somme 0.50', () => {
    // 100 jours calendaires approximés via une longue période : on force via mock
    // en appelant sur une période d'un mois partiel répété n'est pas trivial —
    // test unitaire du reliquat via période courte + total petit multi-mois.
    const start = new Date(Date.UTC(2024, 0, 1));
    const end = new Date(Date.UTC(2032, 3, 30)); // ~100 mois
    const a = splitTotalDaysByWorkingDays(
      start,
      end,
      new Prisma.Decimal('0.50'),
    );
    const sum = a.reduce((s, x) => s.plus(x.days), new Prisma.Decimal(0));
    expect(sum.equals(new Prisma.Decimal('0.50'))).toBe(true);
    expect(a.every((x) => x.days.gt(0))).toBe(true);
  });

  it('0.01 sur plusieurs mois → un seul mois positif', () => {
    const a = splitTotalDaysByWorkingDays(
      new Date(Date.UTC(2025, 0, 1)),
      new Date(Date.UTC(2025, 2, 31)),
      new Prisma.Decimal('0.01'),
    );
    const sum = a.reduce((s, x) => s.plus(x.days), new Prisma.Decimal(0));
    expect(sum.equals(new Prisma.Decimal('0.01'))).toBe(true);
    expect(a.filter((x) => x.days.gt(0)).length).toBe(1);
  });

  it('999999.99 sans dérive', () => {
    const a = splitTotalDaysByWorkingDays(
      new Date(Date.UTC(2025, 0, 1)),
      new Date(Date.UTC(2025, 2, 31)),
      new Prisma.Decimal('999999.99'),
    );
    const sum = a.reduce((s, x) => s.plus(x.days), new Prisma.Decimal(0));
    expect(sum.equals(new Prisma.Decimal('999999.99'))).toBe(true);
  });

  it('idempotent', () => {
    const args = [
      new Date(Date.UTC(2025, 5, 20)),
      new Date(Date.UTC(2025, 7, 10)),
      new Prisma.Decimal('30'),
    ] as const;
    const a = splitTotalDaysByWorkingDays(...args);
    const b = splitTotalDaysByWorkingDays(...args);
    expect(a).toEqual(b);
  });
});
