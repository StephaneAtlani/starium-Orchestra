import { frenchPublicHolidays, workingDaysInMonth } from './french-working-days';

describe('french-working-days', () => {
  it('inclut le 1er janvier', () => {
    expect(frenchPublicHolidays(2025).has('2025-01-01')).toBe(true);
  });

  it('janvier 2025 a des jours ouvrés > 0', () => {
    expect(workingDaysInMonth('2025-01')).toBeGreaterThan(15);
  });
});
