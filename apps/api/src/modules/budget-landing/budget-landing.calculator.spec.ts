import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  calculateLanding,
  computeLandingLineStatus,
} from './budget-landing.calculator';

describe('budget-landing.calculator', () => {
  const exerciseStart = new Date('2026-01-01T00:00:00.000Z');
  const exerciseEnd = new Date('2026-12-31T00:00:00.000Z');

  it('calcule landing = consommé + engagé + prévision restante', () => {
    const result = calculateLanding({
      effectiveBudgetBase: 1000,
      consumedAmount: 100,
      committedAmount: 50,
      exerciseStart,
      exerciseEnd,
      referenceDate: new Date('2026-06-15T00:00:00.000Z'),
      planningMonths: Array.from({ length: 12 }, (_, i) => ({
        monthIndex: i + 1,
        amount: 100,
      })),
    });

    expect(Number(result.planningTotalAmount)).toBe(1200);
    expect(Number(result.remainingPlanning)).toBeGreaterThan(0);
    expect(Number(result.landingAmount)).toBe(
      100 + 50 + Number(result.remainingPlanning),
    );
  });

  it('landingVariance utilise effectiveBudgetBase (réallocations)', () => {
    const result = calculateLanding({
      effectiveBudgetBase: 1200,
      consumedAmount: 0,
      committedAmount: 0,
      exerciseStart,
      exerciseEnd,
      referenceDate: new Date('2026-01-15T00:00:00.000Z'),
      planningMonths: [{ monthIndex: 1, amount: 1000 }],
    });

    expect(Number(result.landingVariance)).toBe(
      Number(result.landingAmount) - 1200,
    );
  });

  it('computeLandingLineStatus WARNING si atterrissage > base', () => {
    expect(
      computeLandingLineStatus({
        effectiveBudgetBase: 1000,
        consumed: 200,
        landing: 1100,
      }),
    ).toBe('WARNING');
  });
});
