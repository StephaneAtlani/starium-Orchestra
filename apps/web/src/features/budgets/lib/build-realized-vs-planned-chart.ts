import {
  FRENCH_MONTH_LABELS_SHORT,
  defaultReferenceDateUtc,
  listExerciseCalendarMonths,
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
 * Construit les colonnes « Réalisé vs prévu » sur la **durée réelle** de l’exercice
 * (`startDate` → `endDate`, mois civils UTC inclusifs).
 * - Prévu = planning mensuel indexé 1..12 si fourni, sinon répartition égale sur N mois
 * - Réalisé = consommations du mois (événements CONSUMPTION_REGISTERED)
 * Sans `endDate` → 12 mois depuis `startDate` (comportement historique).
 */
export function buildRealizedVsPlannedChartRows(params: {
  exerciseStartDateIso: string | null | undefined;
  exerciseEndDateIso?: string | null | undefined;
  totalForecastAmount: number;
  monthlyTrend: MonthlyTrendPoint[];
  /**
   * Somme planning par index 0..11 (mois d’exercice 1..12, RFC-023).
   * Au-delà du 12ᵉ mois d’un exercice long : repli sur la répartition égale.
   */
  plannedAmounts12?: readonly number[] | null;
}): RealizedVsPlannedMonthRow[] {
  const start = parseExerciseDate(params.exerciseStartDateIso) ?? defaultStart();
  const end = parseExerciseDate(params.exerciseEndDateIso);
  const months = listExerciseCalendarMonths(start, end);
  const plannedByMonth = new Map(
    params.monthlyTrend.map((row) => [row.month, row]),
  );
  const monthCount = Math.max(1, months.length);
  const fallbackPlanned = Math.max(0, params.totalForecastAmount) / monthCount;

  return months.map((month, index) => {
    const monthLabel = FRENCH_MONTH_LABELS_SHORT[month.monthIndex0] ?? 'Mois';
    const label = monthLetterLabel(month.monthIndex0);
    const plannedFromGrid =
      index < 12 ? params.plannedAmounts12?.[index] : undefined;
    const planned =
      plannedFromGrid != null && Number.isFinite(plannedFromGrid)
        ? Math.max(0, plannedFromGrid)
        : fallbackPlanned;
    const realized = Math.max(
      0,
      plannedByMonth.get(month.monthKey)?.consumed ?? 0,
    );
    return {
      monthKey: month.monthKey,
      label,
      monthLabel,
      planned,
      realized,
      left: planned,
      right: realized,
    };
  });
}

/** Mois à mettre en fenêtre (exercices longs) : mois courant UTC, sinon dernier mois avec du réalisé. */
export function resolveInitialRealizedVsPlannedMonthKey(
  rows: readonly RealizedVsPlannedMonthRow[],
  referenceDate: Date = defaultReferenceDateUtc(),
): string | null {
  if (rows.length === 0) return null;
  const currentKey = `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, '0')}`;
  if (rows.some((row) => row.monthKey === currentKey)) return currentKey;
  const latestWithRealized = [...rows].reverse().find((row) => row.realized > 0);
  return latestWithRealized?.monthKey ?? rows[0]?.monthKey ?? null;
}

function parseExerciseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function defaultStart(): Date {
  return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
}

/** Initiale FR type mockup (J F M A M J J A S O N D). */
function monthLetterLabel(monthIndex0: number): string {
  const short = FRENCH_MONTH_LABELS_SHORT[monthIndex0] ?? '';
  return short.charAt(0).toUpperCase() || '?';
}
