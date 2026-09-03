import type { ProjectListItem } from '@/features/projects/types/project.types';
import type { HomeDashboardDeadlineItem } from '../components/home-dashboard-deadlines';
import type { HomeBudgetChartPoint } from '../components/home-dashboard-budget-chart';
import type { RealizedVsPlannedMonthRow } from '@/features/budgets/lib/build-realized-vs-planned-chart';

/**
 * Graphiques dynamiques uniquement — pas de série factice / fallback décoratif.
 * Voir `.cursor/rules/charts-dynamic-only.mdc`.
 */

const PRIORITY_RANK: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const HEALTH_RANK: Record<ProjectListItem['computedHealth'], number> = {
  RED: 0,
  ORANGE: 1,
  GREEN: 2,
};

/** Projets où l’utilisateur connecté a un rôle (owner / sponsor / équipe). */
export function selectMyProjects(items: ProjectListItem[]): ProjectListItem[] {
  return items.filter((p) => (p.myRoles?.length ?? 0) > 0 || Boolean(p.myRole));
}

/** Top projets prioritaires (priorité puis santé, actifs d’abord). */
export function selectPriorityProjects(
  items: ProjectListItem[],
  limit = 5,
): ProjectListItem[] {
  const active = items.filter(
    (p) =>
      p.status === 'IN_PROGRESS' ||
      p.status === 'PLANNED' ||
      p.status === 'ON_HOLD',
  );
  const pool = active.length > 0 ? active : items;
  return [...pool]
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 9;
      const pb = PRIORITY_RANK[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      const ha = HEALTH_RANK[a.computedHealth] ?? 9;
      const hb = HEALTH_RANK[b.computedHealth] ?? 9;
      if (ha !== hb) return ha - hb;
      return (a.name ?? '').localeCompare(b.name ?? '', 'fr');
    })
    .slice(0, limit);
}

export function countHealth(
  items: ProjectListItem[],
): { green: number; orange: number; red: number } {
  let green = 0;
  let orange = 0;
  let red = 0;
  for (const p of items) {
    if (p.status === 'COMPLETED' || p.status === 'CANCELLED' || p.status === 'ARCHIVED') {
      continue;
    }
    if (p.computedHealth === 'GREEN') green += 1;
    else if (p.computedHealth === 'ORANGE') orange += 1;
    else red += 1;
  }
  return { green, orange, red };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Jalons à venir (snapshot liste) dans la fenêtre, triés par date — hors échéus. */
export function selectUpcomingDeadlines(
  items: ProjectListItem[],
  opts: { withinDays?: number; limit?: number; now?: Date } = {},
): HomeDashboardDeadlineItem[] {
  const withinDays = opts.withinDays ?? 45;
  const limit = opts.limit ?? 5;
  const now = opts.now ?? new Date();
  const out: HomeDashboardDeadlineItem[] = [];

  for (const p of items) {
    const ms = p.pilotageSnapshot?.nextMilestone;
    if (!ms?.targetDate) continue;
    const date = new Date(ms.targetDate);
    if (Number.isNaN(date.getTime())) continue;
    const daysLeft = daysBetween(now, date);
    if (daysLeft < 0 || daysLeft > withinDays) continue;
    out.push({
      id: `${p.id}:${ms.targetDate}:${ms.name}`,
      title: ms.name,
      projectId: p.id,
      projectName: p.name,
      dateIso: ms.targetDate,
      daysLeft,
    });
  }

  return out
    .sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title, 'fr'))
    .slice(0, limit);
}

/** Compte les jalons dans les N prochains jours. */
export function countMilestonesWithinDays(
  items: ProjectListItem[],
  withinDays: number,
  now = new Date(),
): { total: number; thisWeek: number } {
  let total = 0;
  let thisWeek = 0;
  for (const p of items) {
    const ms = p.pilotageSnapshot?.nextMilestone;
    if (!ms?.targetDate) continue;
    const date = new Date(ms.targetDate);
    if (Number.isNaN(date.getTime())) continue;
    const daysLeft = daysBetween(now, date);
    if (daysLeft < 0 || daysLeft > withinDays) continue;
    total += 1;
    if (daysLeft <= 7) thisWeek += 1;
  }
  return { total, thisWeek };
}

/** Cumuls réalisé / cible pour la courbe home. */
export function buildHomeBudgetChartPoints(
  rows: RealizedVsPlannedMonthRow[],
): HomeBudgetChartPoint[] {
  let cumRealized = 0;
  let cumTarget = 0;
  return rows.map((row) => {
    cumRealized += row.realized;
    cumTarget += row.planned;
    return {
      label: row.monthLabel,
      realized: cumRealized,
      target: cumTarget,
      monthKey: row.monthKey,
    };
  });
}

export function resolveTodayMonthIndex(
  points: HomeBudgetChartPoint[],
  now = new Date(),
): number | null {
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const idx = points.findIndex((p) => p.monthKey === key);
  return idx >= 0 ? idx : null;
}

export function budgetChartHasSignal(points: HomeBudgetChartPoint[]): boolean {
  return points.some((p) => p.realized > 0 || p.target > 0);
}

/**
 * Filtre les mois de la série avant cumul — période dynamique.
 * `month` : 2 derniers mois (minimum pour une courbe).
 * `quarter` : 3 derniers mois.
 * `year` : série complète.
 */
export function filterMonthlyRowsByPeriod<T extends { monthKey: string }>(
  rows: T[],
  period: 'month' | 'quarter' | 'year',
  now = new Date(),
): T[] {
  if (period === 'year' || rows.length === 0) return rows;
  const keep = period === 'month' ? 2 : 3;
  const keys = new Set<string>();
  for (let i = 0; i < keep; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  const filtered = rows.filter((r) => keys.has(r.monthKey));
  return filtered.length > 0 ? filtered : rows.slice(-keep);
}

/** @deprecated Prefer filterMonthlyRowsByPeriod then buildHomeBudgetChartPoints. */
export function filterBudgetPointsByPeriod(
  points: HomeBudgetChartPoint[],
  period: 'month' | 'quarter' | 'year',
  now = new Date(),
): HomeBudgetChartPoint[] {
  return filterMonthlyRowsByPeriod(points, period, now);
}

/**
 * Accepte une série uniquement si ≥ 2 points numériques finis.
 * Pas de fallback décoratif.
 */
export function dynamicSparkSeries(
  values: ReadonlyArray<number | null | undefined>,
): number[] | null {
  const clean = values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  return clean.length >= 2 ? clean : null;
}

/** Sparkline budget = cumul réalisé mensuel (API CONSUMPTION_TREND). */
export function sparkFromBudgetPoints(
  points: HomeBudgetChartPoint[],
): number[] | null {
  if (!budgetChartHasSignal(points)) return null;
  return dynamicSparkSeries(points.map((p) => p.realized));
}

/**
 * Sparkline projets = créations M-1 / M (métriques portfolio-summary).
 * Pas d’historique « actifs » → on n’invente pas de points.
 */
export function sparkFromProjectCreations(
  createdPreviousMonth: number | undefined,
  createdThisMonth: number | undefined,
): number[] | null {
  if (createdPreviousMonth == null || createdThisMonth == null) return null;
  return dynamicSparkSeries([createdPreviousMonth, createdThisMonth]);
}

/**
 * Sparkline risques = compte critiques ouverts par mois de détection (API risques).
 */
export function sparkFromCriticalRiskDetectedDates(
  detectedAtIsos: ReadonlyArray<string | null | undefined>,
  months = 6,
  now = new Date(),
): number[] | null {
  const buckets: number[] = Array.from({ length: months }, () => 0);
  const monthKeys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  const index = new Map(monthKeys.map((k, i) => [k, i]));
  let hit = 0;
  for (const iso of detectedAtIsos) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = index.get(key);
    if (idx == null) continue;
    buckets[idx] = (buckets[idx] ?? 0) + 1;
    hit += 1;
  }
  if (hit === 0) return null;
  return dynamicSparkSeries(buckets);
}

/**
 * Sparkline jalons = effectifs par semaine civile à venir (nextMilestone réels).
 */
export function sparkFromUpcomingMilestonesByWeek(
  items: ProjectListItem[],
  weeks = 6,
  now = new Date(),
): number[] | null {
  const buckets: number[] = Array.from({ length: weeks }, () => 0);
  let hit = 0;
  for (const p of items) {
    const ms = p.pilotageSnapshot?.nextMilestone;
    if (!ms?.targetDate) continue;
    const date = new Date(ms.targetDate);
    if (Number.isNaN(date.getTime())) continue;
    const daysLeft = daysBetween(now, date);
    if (daysLeft < 0 || daysLeft >= weeks * 7) continue;
    const weekIdx = Math.min(weeks - 1, Math.floor(daysLeft / 7));
    buckets[weekIdx] = (buckets[weekIdx] ?? 0) + 1;
    hit += 1;
  }
  if (hit === 0) return null;
  return dynamicSparkSeries(buckets);
}
