import { Prisma } from '@prisma/client';
import { countWorkingDaysInclusive, yearMonthFromUtcDate } from './french-working-days';

export type MonthSplitSegment = {
  yearMonth: string;
  days: Prisma.Decimal;
};

function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Répartition plus fort reste en Decimal / centièmes entiers.
 * Interdit Number() pour raw / restes / reliquat.
 */
export function splitTotalDaysByWorkingDays(
  startDate: Date,
  endDate: Date,
  totalDays: Prisma.Decimal,
): MonthSplitSegment[] {
  const start = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);
  if (end.getTime() < start.getTime()) {
    throw new Error('INVALID_PERIOD');
  }
  if (totalDays.lte(0)) {
    throw new Error('INVALID_TOTAL_DAYS');
  }

  const holidaysByYear = new Map<number, Set<string>>();
  const segments: Array<{ yearMonth: string; workingDays: number; start: Date; end: Date }> = [];

  let cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    const yearMonth = yearMonthFromUtcDate(cursor);
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const segEnd = monthEnd.getTime() < end.getTime() ? monthEnd : end;
    const workingDays = countWorkingDaysInclusive(cursor, segEnd, holidaysByYear);
    segments.push({ yearMonth, workingDays, start: new Date(cursor.getTime()), end: segEnd });
    cursor = new Date(Date.UTC(segEnd.getUTCFullYear(), segEnd.getUTCMonth(), segEnd.getUTCDate() + 1));
  }

  const totalWorking = segments.reduce((acc, s) => acc + s.workingDays, 0);
  if (totalWorking === 0) {
    throw new Error('NO_WORKING_DAYS');
  }

  const totalCents = totalDays.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  const totalWorkingDec = new Prisma.Decimal(totalWorking);

  type RawRow = {
    yearMonth: string;
    workingDays: number;
    raw: Prisma.Decimal;
    floorCents: Prisma.Decimal;
    remainder: Prisma.Decimal;
    index: number;
  };

  const rows: RawRow[] = segments.map((s, index) => {
    const raw =
      s.workingDays === 0
        ? new Prisma.Decimal(0)
        : totalDays.mul(s.workingDays).div(totalWorkingDec);
    const floorCents = raw.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_FLOOR);
    const remainder = raw.mul(100).minus(floorCents);
    return {
      yearMonth: s.yearMonth,
      workingDays: s.workingDays,
      raw,
      floorCents,
      remainder,
      index,
    };
  });

  const sumFloor = rows.reduce((acc, r) => acc.plus(r.floorCents), new Prisma.Decimal(0));
  let residual = totalCents.minus(sumFloor).toNumber();
  if (residual < 0) residual = 0;

  const order = [...rows].sort((a, b) => {
    const cmp = b.remainder.comparedTo(a.remainder);
    if (cmp !== 0) return cmp;
    return a.index - b.index;
  });

  const bonus = new Map<string, number>();
  for (let i = 0; i < residual && i < order.length; i += 1) {
    const ym = order[i]!.yearMonth;
    bonus.set(ym, (bonus.get(ym) ?? 0) + 1);
  }

  const out: MonthSplitSegment[] = [];
  for (const r of rows) {
    if (r.workingDays === 0) continue;
    const cents = r.floorCents.plus(bonus.get(r.yearMonth) ?? 0);
    if (cents.lte(0)) continue;
    out.push({
      yearMonth: r.yearMonth,
      days: cents.div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    });
  }

  const sum = out.reduce((acc, x) => acc.plus(x.days), new Prisma.Decimal(0));
  if (!sum.equals(totalDays.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP))) {
    // Garde-fou : ajuster le dernier mois positif
    if (out.length > 0) {
      const last = out[out.length - 1]!;
      const others = out
        .slice(0, -1)
        .reduce((acc, x) => acc.plus(x.days), new Prisma.Decimal(0));
      last.days = totalDays.minus(others).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      if (last.days.lte(0)) {
        out.pop();
      }
    }
  }

  return out.filter((x) => x.days.gt(0));
}
