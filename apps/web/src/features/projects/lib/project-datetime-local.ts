/** Pas des sélecteurs date/heure — points projet (création, édition, échéances). */
export const PROJECT_DATETIME_LOCAL_STEP_MINUTES = 15;

export const PROJECT_DATETIME_LOCAL_STEP_SECONDS =
  PROJECT_DATETIME_LOCAL_STEP_MINUTES * 60;

export const PROJECT_DATETIME_LOCAL_MINUTE_OPTIONS = ['00', '15', '30', '45'] as const;

/** Arrondit une date au pas configuré (minutes). */
export function roundDateToProjectDatetimeStep(date: Date): Date {
  const ms = PROJECT_DATETIME_LOCAL_STEP_MINUTES * 60 * 1000;
  const rounded = new Date(Math.round(date.getTime() / ms) * ms);
  rounded.setSeconds(0, 0);
  return rounded;
}

/** Valeur initiale (fuseau local, arrondie au quart d’heure). */
export function defaultProjectDatetimeLocal(): string {
  return formatProjectDatetimeLocal(roundDateToProjectDatetimeStep(new Date()));
}

/** ISO-like `YYYY-MM-DDTHH:mm` (fuseau local). */
export function formatProjectDatetimeLocal(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Normalise une valeur saisie au pas quart d’heure (00, 15, 30, 45). */
export function normalizeProjectDatetimeLocalValue(value: string): string {
  if (!value.trim()) return '';
  try {
    return formatProjectDatetimeLocal(roundDateToProjectDatetimeStep(new Date(value)));
  } catch {
    return '';
  }
}

export function buildProjectDatetimeLocal(
  date: string,
  hour: string,
  minute: string,
): string {
  if (!date.trim()) return '';
  const h = hour.padStart(2, '0').slice(-2);
  const m = minute.padStart(2, '0').slice(-2);
  return `${date}T${h}:${m}`;
}

export function parseProjectDatetimeLocal(value: string): {
  date: string;
  hour: string;
  minute: string;
} {
  const normalized = normalizeProjectDatetimeLocalValue(value);
  if (!normalized) {
    return { date: '', hour: '09', minute: '00' };
  }
  const [datePart, timePart] = normalized.split('T');
  const [hour = '09', minute = '00'] = (timePart ?? '').split(':');
  return {
    date: datePart ?? '',
    hour: hour.padStart(2, '0').slice(0, 2),
    minute: minute.padStart(2, '0').slice(0, 2),
  };
}

export const PROJECT_DATETIME_LOCAL_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0'),
);
