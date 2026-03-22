/** Constantes MVP : échelle fixe (pas de zoom utilisateur). */
export const GANTT_ROW_PX = 36;
export const GANTT_DAY_MS = 86_400_000;
export const GANTT_PX_PER_DAY = 4;
export const GANTT_MIN_TIMELINE_PX = 640;

/** Au-delà de ce nombre de jours, les en-têtes passent en libellés semaine/mois plus compacts. */
export const GANTT_READABILITY_DAY_THRESHOLD = 90;

export type TimelineBounds = { min: number; max: number };

export type GanttTaskLike = {
  plannedStartDate: string | null;
  plannedEndDate: string | null;
};

export function computeTimelineBounds(
  tasks: GanttTaskLike[],
  milestoneDatesMs: number[],
): TimelineBounds | null {
  let min = Infinity;
  let max = -Infinity;
  for (const t of tasks) {
    if (t.plannedStartDate && t.plannedEndDate) {
      const s = new Date(t.plannedStartDate).getTime();
      const e = new Date(t.plannedEndDate).getTime();
      min = Math.min(min, s);
      max = Math.max(max, e);
    }
  }
  for (const d of milestoneDatesMs) {
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const pad = GANTT_DAY_MS * 2;
  return { min: min - pad, max: max + pad };
}

export function dateMsToPx(
  dateMs: number,
  bounds: TimelineBounds,
  pxPerDay: number,
): number {
  return ((dateMs - bounds.min) / GANTT_DAY_MS) * pxPerDay;
}

export function timelineWidthPx(bounds: TimelineBounds, pxPerDay: number): number {
  const spanDays = (bounds.max - bounds.min) / GANTT_DAY_MS;
  return Math.max(GANTT_MIN_TIMELINE_PX, spanDays * pxPerDay);
}

export type MonthBand = { leftPx: number; widthPx: number; label: string };
export type WeekBand = { leftPx: number; widthPx: number; label: string };

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** Bandeaux de mois pour la ligne d’en-tête supérieure. */
export function buildMonthBands(
  bounds: TimelineBounds,
  pxPerDay: number,
): MonthBand[] {
  const bands: MonthBand[] = [];
  let cur = startOfMonth(new Date(bounds.min));
  const end = bounds.max;
  while (cur.getTime() < end) {
    const next = addMonth(cur);
    const segStart = Math.max(bounds.min, cur.getTime());
    const segEnd = Math.min(end, next.getTime());
    if (segEnd > segStart) {
      const leftPx = dateMsToPx(segStart, bounds, pxPerDay);
      const rightPx = dateMsToPx(segEnd, bounds, pxPerDay);
      bands.push({
        leftPx,
        widthPx: Math.max(0, rightPx - leftPx),
        label: cur.toLocaleDateString('fr-FR', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      });
    }
    cur = next;
  }
  return bands;
}

/** Premier lundi (UTC) à minuit on ou avant `ms`. */
function mondayOnOrBeforeUtc(ms: number): number {
  const d = new Date(ms);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** Bandeaux de semaine (lundi → +7j) pour la ligne d’en-tête inférieure. */
export function buildWeekBands(
  bounds: TimelineBounds,
  pxPerDay: number,
): WeekBand[] {
  const bands: WeekBand[] = [];
  const { min: start, max: end } = bounds;
  let weekStart = mondayOnOrBeforeUtc(start);
  while (weekStart < end) {
    const weekEnd = weekStart + 7 * GANTT_DAY_MS;
    const segStart = Math.max(start, weekStart);
    const segEnd = Math.min(end, weekEnd);
    if (segEnd > segStart) {
      const leftPx = dateMsToPx(segStart, bounds, pxPerDay);
      const rightPx = dateMsToPx(segEnd, bounds, pxPerDay);
      bands.push({
        leftPx,
        widthPx: Math.max(0, rightPx - leftPx),
        label: `S${isoWeekNumberUTC(segStart)}`,
      });
    }
    weekStart = weekEnd;
  }
  return bands;
}

/** Numéro de semaine ISO pour un timestamp UTC (approximation stable pour l’UI). */
function isoWeekNumberUTC(ms: number): number {
  const d = new Date(ms);
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - y.getTime()) / GANTT_DAY_MS + 1) / 7);
}

export function spanDays(bounds: TimelineBounds): number {
  return (bounds.max - bounds.min) / GANTT_DAY_MS;
}

/**
 * Layout complet pour tests / panneau : largeur frise + option en-têtes agrégés si plage longue.
 */
export function dateRangeToTimelineLayout(
  bounds: TimelineBounds,
  pxPerDay: number,
): {
  widthPx: number;
  monthBands: MonthBand[];
  weekBands: WeekBand[];
  /** True si la plage est longue : en-têtes mois + semaines en mode « agrégé » (même base px/jour). */
  useAggregatedHeaders: boolean;
  todayPx: number | null;
} {
  const widthPx = timelineWidthPx(bounds, pxPerDay);
  const sd = spanDays(bounds);
  const useAggregatedHeaders = sd >= GANTT_READABILITY_DAY_THRESHOLD;
  const now = Date.now();
  const todayPx =
    now >= bounds.min && now <= bounds.max
      ? dateMsToPx(now, bounds, pxPerDay)
      : null;

  return {
    widthPx,
    monthBands: buildMonthBands(bounds, pxPerDay),
    weekBands: buildWeekBands(bounds, pxPerDay),
    useAggregatedHeaders,
    todayPx,
  };
}
