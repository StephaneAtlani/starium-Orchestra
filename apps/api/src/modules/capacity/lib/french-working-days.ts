/** RFC-CAPA-001 — jours fériés FR métropole (fixe + calculés). */

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Ensemble des jours fériés FR (YYYY-MM-DD UTC) pour une année civile. */
export function frenchPublicHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const fixed: Array<[number, number]> = [
    [1, 1],
    [5, 1],
    [5, 8],
    [7, 14],
    [8, 15],
    [11, 1],
    [11, 11],
    [12, 25],
  ];
  const set = new Set<string>();
  for (const [month, day] of fixed) {
    set.add(ymd(new Date(Date.UTC(year, month - 1, day))));
  }
  set.add(ymd(addUtcDays(easter, 1))); // Lundi de Pâques
  set.add(ymd(addUtcDays(easter, 39))); // Ascension
  set.add(ymd(addUtcDays(easter, 50))); // Lundi de Pentecôte
  return set;
}

export function isWeekendUtc(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

/** Compte les jours ouvrés (lun–ven hors fériés FR) inclusifs entre deux dates civiles UTC. */
export function countWorkingDaysInclusive(
  start: Date,
  end: Date,
  holidaysByYear: Map<number, Set<string>> = new Map(),
): number {
  const s = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const e = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (e < s) return 0;
  let count = 0;
  for (let t = s; t <= e; t += 86400000) {
    const d = new Date(t);
    const year = d.getUTCFullYear();
    let hol = holidaysByYear.get(year);
    if (!hol) {
      hol = frenchPublicHolidays(year);
      holidaysByYear.set(year, hol);
    }
    if (!isWeekendUtc(d) && !hol.has(ymd(d))) count += 1;
  }
  return count;
}

export function yearMonthFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!m) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`Invalid yearMonth: ${yearMonth}`);
  return { year, month };
}

export function monthBoundsUtc(yearMonth: string): { start: Date; end: Date } {
  const { year, month } = parseYearMonth(yearMonth);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

export function workingDaysInMonth(yearMonth: string): number {
  const { start, end } = monthBoundsUtc(yearMonth);
  return countWorkingDaysInclusive(start, end);
}
