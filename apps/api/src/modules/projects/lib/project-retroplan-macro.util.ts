/**
 * Calcule les dates cibles d’un rétroplanning macro à partir d’une date de fin
 * et d’écarts en jours calendaires avant cette fin.
 */
export function parseIsoDateOnly(anchorEndDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorEndDate.trim());
  if (!m) {
    throw new Error('INVALID_ANCHOR_DATE');
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    throw new Error('INVALID_ANCHOR_DATE');
  }
  return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
}

export function subtractCalendarDaysFromUtcNoon(anchor: Date, daysBeforeEnd: number): Date {
  const ms = daysBeforeEnd * 24 * 60 * 60 * 1000;
  return new Date(anchor.getTime() - ms);
}
