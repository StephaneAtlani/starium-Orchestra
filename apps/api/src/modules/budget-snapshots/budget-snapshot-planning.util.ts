import { BudgetLinePlanningMode, Prisma } from '@prisma/client';

export type SnapshotPlanningMonthJson = {
  monthIndex: number;
  amount: number;
};

export function serializePlanningMonthsForSnapshot(
  months: ReadonlyArray<{ monthIndex: number; amount: Prisma.Decimal | number }>,
): Prisma.InputJsonValue {
  const byIndex = new Map<number, number>();
  for (const row of months) {
    byIndex.set(row.monthIndex, Number(row.amount));
  }
  const payload: SnapshotPlanningMonthJson[] = [];
  for (let i = 1; i <= 12; i++) {
    payload.push({ monthIndex: i, amount: byIndex.get(i) ?? 0 });
  }
  return payload as Prisma.InputJsonValue;
}

export function parseSnapshotPlanningMonths(
  raw: Prisma.JsonValue | null | undefined,
): number[] | null {
  if (!Array.isArray(raw) || raw.length !== 12) {
    return null;
  }
  const months = Array.from({ length: 12 }, () => 0);
  const seen = new Set<number>();
  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return null;
    }
    const idx = (item as { monthIndex?: unknown }).monthIndex;
    const amount = (item as { amount?: unknown }).amount;
    if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 1 || idx > 12) {
      return null;
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return null;
    }
    if (seen.has(idx)) {
      return null;
    }
    seen.add(idx);
    months[idx - 1] = amount;
  }
  return seen.size === 12 ? months : null;
}

export function isBudgetLinePlanningMode(
  value: unknown,
): value is BudgetLinePlanningMode {
  return (
    typeof value === 'string' &&
    (Object.values(BudgetLinePlanningMode) as string[]).includes(value)
  );
}
