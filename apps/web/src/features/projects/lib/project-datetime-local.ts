/** Pas des sélecteurs `datetime-local` — points projet (création, édition, échéances). */
export const PROJECT_DATETIME_LOCAL_STEP_MINUTES = 15;

export const PROJECT_DATETIME_LOCAL_STEP_SECONDS =
  PROJECT_DATETIME_LOCAL_STEP_MINUTES * 60;

/** Arrondit une date au pas configuré (minutes). */
export function roundDateToProjectDatetimeStep(date: Date): Date {
  const ms = PROJECT_DATETIME_LOCAL_STEP_MINUTES * 60 * 1000;
  const rounded = new Date(Math.round(date.getTime() / ms) * ms);
  rounded.setSeconds(0, 0);
  return rounded;
}

/** Valeur initiale `datetime-local` (fuseau local, arrondie au quart d’heure). */
export function defaultProjectDatetimeLocal(): string {
  return formatProjectDatetimeLocal(roundDateToProjectDatetimeStep(new Date()));
}

/** ISO-like `YYYY-MM-DDTHH:mm` pour input `datetime-local` (fuseau local). */
export function formatProjectDatetimeLocal(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
