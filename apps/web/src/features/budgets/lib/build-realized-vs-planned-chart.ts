import {
  FRENCH_MONTH_LABELS_SHORT,
  getExerciseMonthCalendarYearMonth,
} from '@starium-orchestra/budget-exercise-calendar';

export type MonthlyTrendPoint = {
  month: string;
  committed: number;
  consumed: number;
};

/** Ligne mensuelle pour le graphique Réalisé vs prévu (Vue d’ensemble). */
export type RealizedVsPlannedMonthRow = {
  monthKey: string;
  /** Initiale axe X (J F M …). */
  label: string;
  /** Libellé métier court (Jan, Fév…). */
  monthLabel: string;
  planned: number;
  realized: number;
  /** Alias GroupedBarRow — Prévu. */
  left: number;
  /** Alias GroupedBarRow — Réalisé. */
  right: number;
};

/**
 * Construit les 12 colonnes « Réalisé vs prévu » du mockup fiche budget :
 * - Prévu = planning mensuel si fourni, sinon répartition égale de la prévision annuelle
 * - Réalisé = consommations du mois (événements CONSUMPTION_REGISTERED)
 * Toujours 12 mois d’exercice, même à zéro.
 */
export function buildRealizedVsPlannedChartRows(params: {
  exerciseStartDateIso: string | null | undefined;
  totalForecastAmount: number;
  monthlyTrend: MonthlyTrendPoint[];
  /** Somme planning par index 0..11 (mois d’exercice) — optionnel. */
  plannedAmounts12?: readonly number[] | null;
}): RealizedVsPlannedMonthRow[] {
  const start = parseExerciseStart(params.exerciseStartDateIso);
  const plannedByMonth = new Map(
    params.monthlyTrend.map((row) => [row.month, row]),
  );
  const fallbackPlanned = Math.max(0, params.totalForecastAmount) / 12;

  return Array.from({ length: 12 }, (_, index) => {
    const monthIndex = index + 1;
    const ym = getExerciseMonthCalendarYearMonth(start, monthIndex);
    const monthKey = `${ym.year}-${String(ym.monthIndex0 + 1).padStart(2, '0')}`;
    const monthLabel = FRENCH_MONTH_LABELS_SHORT[ym.monthIndex0] ?? 'Mois';
    const label = monthLetterLabel(ym.monthIndex0);
    const plannedFromGrid = params.plannedAmounts12?.[index];
    const planned =
      plannedFromGrid != null && Number.isFinite(plannedFromGrid)
        ? Math.max(0, plannedFromGrid)
        : fallbackPlanned;
    const realized = Math.max(0, plannedByMonth.get(monthKey)?.consumed ?? 0);
    return {
      monthKey,
      label,
      monthLabel,
      planned,
      realized,
      left: planned,
      right: realized,
    };
  });
}

function parseExerciseStart(iso: string | null | undefined): Date {
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
}

/** Initiale FR type mockup (J F M A M J J A S O N D). */
function monthLetterLabel(monthIndex0: number): string {
  const short = FRENCH_MONTH_LABELS_SHORT[monthIndex0] ?? '';
  return short.charAt(0).toUpperCase() || '?';
}
