import { projectWarningLabel } from '../../constants/project-enum-labels';
import {
  formatPortfolioBudgetCompact,
  parseProjectBudgetAmount,
  projectBudgetConsumptionPercent,
  projectListProgressPercent,
} from '../../lib/projects-list-display';
import type { ProjectListItem, ProjectsPortfolioSummary } from '../../types/project.types';

export type CodirStatusBucket = 'inProgress' | 'late' | 'planned' | 'completed';

export type CodirStatusBreakdown = Record<CodirStatusBucket, number>;

export type CodirAttentionBadge = 'decision' | 'risk' | 'capacity';

export type CodirAttentionPoint = {
  projectId: string;
  projectName: string;
  title: string;
  meta: string;
  badge: CodirAttentionBadge;
  sortKey: number;
};

export type CodirDeckKpis = {
  activeProjects: number;
  activeProjectsDeltaLabel: string | null;
  averageProgress: number | null;
  averageProgressLabel: string | null;
  budgetConsumedPercent: number | null;
  budgetConsumedLabel: string | null;
  /** Budget cible agrégé (libellé compact pour sous-titre couverture). */
  targetBudgetLabel: string | null;
  criticalRisks: number;
  criticalRisksLabel: string | null;
  milestonesOnTimePercent: number | null;
  milestonesOnTimeLabel: string | null;
};

const HEALTH_ORDER: Record<ProjectListItem['computedHealth'], number> = {
  RED: 0,
  ORANGE: 1,
  GREEN: 2,
};

const CRIT_ORDER: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export function sortDeckProjects(items: ProjectListItem[]): ProjectListItem[] {
  return [...items].sort((a, b) => {
    const ha = HEALTH_ORDER[a.computedHealth] ?? 9;
    const hb = HEALTH_ORDER[b.computedHealth] ?? 9;
    if (ha !== hb) return ha - hb;
    const ca = CRIT_ORDER[a.criticality] ?? 9;
    const cb = CRIT_ORDER[b.criticality] ?? 9;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name, 'fr');
  });
}

export function computeStatusBreakdown(projects: ProjectListItem[]): CodirStatusBreakdown {
  const breakdown: CodirStatusBreakdown = {
    inProgress: 0,
    late: 0,
    planned: 0,
    completed: 0,
  };

  for (const p of projects) {
    if (p.status === 'COMPLETED') {
      breakdown.completed += 1;
      continue;
    }
    if (p.signals.isLate) {
      breakdown.late += 1;
      continue;
    }
    if (p.status === 'PLANNED' || p.status === 'DRAFT') {
      breakdown.planned += 1;
      continue;
    }
    if (p.status === 'IN_PROGRESS') {
      breakdown.inProgress += 1;
      continue;
    }
    breakdown.inProgress += 1;
  }

  return breakdown;
}

export function computeAverageProgress(projects: ProjectListItem[]): number | null {
  if (projects.length === 0) return null;
  const values = projects.map((p) => projectListProgressPercent(p));
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}

export function computeBudgetConsumedPercent(
  summary: ProjectsPortfolioSummary | undefined,
): number | null {
  if (!summary) return null;
  const target = parseProjectBudgetAmount(summary.totalTargetBudgetAmount);
  const consumed = parseProjectBudgetAmount(summary.totalConsumedBudgetAmount);
  if (target == null || target <= 0 || consumed == null) return null;
  return Math.round((consumed / target) * 100);
}

/** Agrège budgets cible / consommé depuis une liste de projets (périmètre présentation). */
export function sumProjectBudgetAmounts(projects: ProjectListItem[]): {
  totalTarget: number | null;
  totalConsumed: number | null;
} {
  let target = 0;
  let consumed = 0;
  let hasTarget = false;
  let hasConsumed = false;

  for (const p of projects) {
    const t = parseProjectBudgetAmount(p.targetBudgetAmount);
    const c = parseProjectBudgetAmount(p.consumedBudgetAmount);
    if (t != null) {
      target += t;
      hasTarget = true;
    }
    if (c != null) {
      consumed += c;
      hasConsumed = true;
    }
  }

  return {
    totalTarget: hasTarget ? target : null,
    totalConsumed: hasConsumed ? consumed : null,
  };
}

function budgetKpisFromTotals(
  totalTarget: number | null,
  totalConsumed: number | null,
): Pick<CodirDeckKpis, 'budgetConsumedPercent' | 'budgetConsumedLabel' | 'targetBudgetLabel'> {
  const budgetPct =
    totalTarget != null && totalTarget > 0 && totalConsumed != null
      ? Math.round((totalConsumed / totalTarget) * 100)
      : null;

  const targetBudgetLabel =
    totalTarget != null ? formatPortfolioBudgetCompact(String(totalTarget)) : null;

  return {
    budgetConsumedPercent: budgetPct,
    budgetConsumedLabel:
      totalTarget != null && totalConsumed != null
        ? `${formatPortfolioBudgetCompact(String(totalConsumed))} / ${formatPortfolioBudgetCompact(String(totalTarget))}`
        : targetBudgetLabel,
    targetBudgetLabel,
  };
}

/** KPI diaporama — calculés uniquement sur le périmètre filtré (statuts / étiquettes). */
export function computePresentationDeckKpis(projects: ProjectListItem[]): CodirDeckKpis {
  const milestones = computeMilestonesOnTimePercent(projects);
  const { totalTarget, totalConsumed } = sumProjectBudgetAmounts(projects);
  const budget = budgetKpisFromTotals(totalTarget, totalConsumed);

  return {
    activeProjects: projects.length,
    activeProjectsDeltaLabel: null,
    averageProgress: computeAverageProgress(projects),
    averageProgressLabel: null,
    ...budget,
    criticalRisks: projects.filter((p) => p.signals.isCritical).length,
    criticalRisksLabel: 'arbitrage requis',
    milestonesOnTimePercent: milestones.percent,
    milestonesOnTimeLabel: milestones.label,
  };
}

export function computeMilestonesOnTimePercent(projects: ProjectListItem[]): {
  percent: number | null;
  label: string | null;
} {
  let total = 0;
  let onTime = 0;

  for (const p of projects) {
    const delayed = p.delayedMilestonesCount;
    const snap = p.pilotageSnapshot;
    const delayedFromSnap = snap?.delayedMilestones.length ?? 0;
    const moreDelayed = snap?.moreDelayedMilestones ?? 0;
    const projectDelayed = Math.max(delayed, delayedFromSnap + moreDelayed);

    if (projectDelayed === 0 && !snap?.nextMilestone && p.signals.hasNoMilestones) {
      continue;
    }

    const projectTotal = Math.max(1, projectDelayed + (snap?.ok.length ?? 0));
    total += projectTotal;
    onTime += Math.max(0, projectTotal - projectDelayed);
  }

  if (total === 0) return { percent: null, label: null };
  const percent = Math.round((onTime / total) * 100);
  return { percent, label: `${onTime} / ${total} jalons` };
}

export function computeDeckKpis(
  projects: ProjectListItem[],
  summary: ProjectsPortfolioSummary | undefined,
): CodirDeckKpis {
  const target = parseProjectBudgetAmount(summary?.totalTargetBudgetAmount);
  const consumed = parseProjectBudgetAmount(summary?.totalConsumedBudgetAmount);
  const budget = budgetKpisFromTotals(target, consumed);
  const milestones = computeMilestonesOnTimePercent(projects);

  const createdThis = summary?.projectsCreatedThisMonth ?? 0;
  const createdPrev = summary?.projectsCreatedPreviousMonth ?? 0;
  const delta = createdThis - createdPrev;

  return {
    activeProjects: summary?.activeProjects ?? projects.length,
    activeProjectsDeltaLabel:
      summary != null
        ? delta === 0
          ? 'Stable vs mois dernier'
          : `${delta > 0 ? '+' : ''}${delta} vs mois dernier`
        : null,
    averageProgress: computeAverageProgress(projects),
    averageProgressLabel: null,
    ...budget,
    criticalRisks: summary?.criticalProjects ?? projects.filter((p) => p.signals.isCritical).length,
    criticalRisksLabel: 'arbitrage requis',
    milestonesOnTimePercent: milestones.percent,
    milestonesOnTimeLabel: milestones.label,
  };
}

function attentionSortKey(project: ProjectListItem): number {
  const health = HEALTH_ORDER[project.computedHealth] ?? 9;
  const crit = CRIT_ORDER[project.criticality] ?? 9;
  return health * 10 + crit;
}

function primaryAttentionForProject(project: ProjectListItem): {
  title: string;
  meta: string;
  badge: CodirAttentionBadge;
} | null {
  const budgetPct = projectBudgetConsumptionPercent(
    project.targetBudgetAmount,
    project.consumedBudgetAmount,
  );

  if (budgetPct != null && budgetPct >= 85) {
    return {
      title: `${project.name} — dépassement budgétaire (${Math.round(budgetPct)} %)`,
      meta: 'Arbitrage budget à trancher',
      badge: 'decision',
    };
  }

  if (project.signals.isLate) {
    return {
      title: `${project.name} — retard sur échéance`,
      meta: project.targetEndDate
        ? `Fin cible ${new Date(project.targetEndDate).toLocaleDateString('fr-FR')}`
        : 'Replanifier ou arbitrer',
      badge: 'risk',
    };
  }

  if (project.signals.isCritical || project.criticality === 'HIGH') {
    return {
      title: `${project.name} — criticité pilotage élevée`,
      meta: `${project.openRisksCount} risque(s) ouvert(s)`,
      badge: 'capacity',
    };
  }

  const warning = project.warnings[0];
  if (warning) {
    return {
      title: `${project.name} — ${projectWarningLabel(warning)}`,
      meta: 'Point à traiter en comité',
      badge: project.computedHealth === 'RED' ? 'decision' : 'risk',
    };
  }

  if (project.computedHealth === 'ORANGE' || project.computedHealth === 'RED') {
    return {
      title: `${project.name} — santé ${project.computedHealth === 'RED' ? 'critique' : 'à surveiller'}`,
      meta: `${project.openTasksCount} tâche(s) ouverte(s)`,
      badge: project.computedHealth === 'RED' ? 'decision' : 'risk',
    };
  }

  return null;
}

export function computeAttentionPoints(
  projects: ProjectListItem[],
  limit = 3,
): CodirAttentionPoint[] {
  const points: CodirAttentionPoint[] = [];

  for (const p of sortDeckProjects(projects)) {
    const att = primaryAttentionForProject(p);
    if (!att) continue;
    points.push({
      projectId: p.id,
      projectName: p.name,
      title: att.title,
      meta: att.meta,
      badge: att.badge,
      sortKey: attentionSortKey(p),
    });
  }

  return points.sort((a, b) => a.sortKey - b.sortKey).slice(0, limit);
}

/** Index slide projet dans le deck (couverture=0, synthèse=1, projets=2+). */
export function projectSlideIndex(deckIndex: number): number {
  return deckIndex + 2;
}

export function totalPresentationSlides(projectCount: number): number {
  return 2 + projectCount;
}
