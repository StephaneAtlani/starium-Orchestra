import { describe, expect, it } from 'vitest';
import {
  classifyReferenceDateInExercise,
  computeRemainingPlanningAmount,
  defaultReferenceDateUtc,
  getExerciseMonthCalendarYearMonth,
  getExerciseMonthColumnLabels,
} from './budget-exercise-calendar';

describe('budget-exercise-calendar', () => {
  const exerciseJuly2026 = new Date(Date.UTC(2026, 6, 15)); // 15 juil 2026
  const exerciseEnd2027 = new Date(Date.UTC(2027, 5, 30)); // 30 juin 2027

  it('month 1 = mois UTC de startDate ; month 12 = +11 mois', () => {
    expect(getExerciseMonthCalendarYearMonth(exerciseJuly2026, 1)).toEqual({
      year: 2026,
      monthIndex0: 6,
    });
    expect(getExerciseMonthCalendarYearMonth(exerciseJuly2026, 12)).toEqual({
      year: 2027,
      monthIndex0: 5,
    });
  });

  it('colonnes FR tournées depuis juillet', () => {
    const labels = getExerciseMonthColumnLabels(exerciseJuly2026);
    expect(labels[0]).toBe('Juil');
    expect(labels[11]).toBe('Juin');
  });

  it('before exercise → somme des 12 mois', () => {
    const amounts = Array(12).fill(100) as number[];
    const ref = new Date(Date.UTC(2026, 0, 1));
    expect(
      computeRemainingPlanningAmount(
        exerciseJuly2026,
        exerciseEnd2027,
        ref,
        amounts,
      ),
    ).toBe(1200);
  });

  it('after exercise → 0', () => {
    const amounts = Array(12).fill(100) as number[];
    const ref = new Date(Date.UTC(2028, 0, 1));
    expect(
      computeRemainingPlanningAmount(
        exerciseJuly2026,
        exerciseEnd2027,
        ref,
        amounts,
      ),
    ).toBe(0);
  });

  it('during exercise → somme des mois >= mois courant (juil 2026 = mois 1)', () => {
    const amounts = [100, 200, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const ref = new Date(Date.UTC(2026, 6, 10));
    expect(classifyReferenceDateInExercise(exerciseJuly2026, exerciseEnd2027, ref)).toBe(
      'during',
    );
    expect(
      computeRemainingPlanningAmount(
        exerciseJuly2026,
        exerciseEnd2027,
        ref,
        amounts,
      ),
    ).toBe(100 + 200 + 300);
  });

  it('defaultReferenceDateUtc normalise au jour UTC', () => {
    const d = new Date(Date.UTC(2026, 3, 5, 14, 30, 0));
    const r = defaultReferenceDateUtc(d);
    expect(r.getUTCHours()).toBe(0);
    expect(r.getUTCDate()).toBe(5);
  });
});
