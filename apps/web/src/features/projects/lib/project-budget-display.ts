import type { ProjectBudgetLinkItem } from '../types/project.types';
import { computePercentageLineAllocationAmount } from './project-budget-allocation';

export function parseBudgetAmount(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function formatBudgetEur(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBudgetCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1_000_000)} M€`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1_000)} k€`;
  }
  return formatBudgetEur(value);
}

export function budgetPercentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/** Part du projet sur la ligne (0–1) pour FULL / PERCENTAGE. */
export function projectAllocationShare(link: ProjectBudgetLinkItem): number {
  if (link.allocationType === 'FULL') return 1;
  if (link.allocationType === 'PERCENTAGE') {
    const pct = parseBudgetAmount(link.percentage);
    return pct != null ? pct / 100 : 0;
  }
  return 0;
}

/** Enveloppe budgétaire du projet sur une ligne liée. */
export function projectLinkAllocatedBudget(link: ProjectBudgetLinkItem): number | null {
  if (link.allocationType === 'FIXED') {
    return parseBudgetAmount(link.amount);
  }
  const initial = link.budgetLine.initialAmount;
  if (initial == null) return null;
  if (link.allocationType === 'FULL') return initial;
  if (link.allocationType === 'BUDGET_PERCENTAGE') {
    const budgetTotal = link.budgetLine.budgetTotalInitialAmount;
    const pct = parseBudgetAmount(link.percentage);
    if (budgetTotal == null || pct == null) return null;
    return computePercentageLineAllocationAmount(budgetTotal, pct);
  }
  const pct = parseBudgetAmount(link.percentage);
  if (pct == null) return null;
  return computePercentageLineAllocationAmount(initial, pct);
}

/** Engagé attribué au projet (proratisé selon le mode d’allocation). */
export function projectLinkEngaged(link: ProjectBudgetLinkItem): number {
  const committed = link.budgetLine.committedAmount ?? 0;
  if (link.allocationType === 'FIXED') {
    const cap = parseBudgetAmount(link.amount) ?? 0;
    return Math.min(committed, cap);
  }
  if (link.allocationType === 'BUDGET_PERCENTAGE') {
    const cap = projectLinkAllocatedBudget(link) ?? 0;
    return Math.min(committed, cap);
  }
  return committed * projectAllocationShare(link);
}

/** Réalisé / consommé attribué au projet (proratisé selon le mode d’allocation). */
export function projectLinkRealized(link: ProjectBudgetLinkItem): number {
  const consumed = link.budgetLine.consumedAmount ?? 0;
  if (link.allocationType === 'FIXED') {
    const cap = parseBudgetAmount(link.amount) ?? 0;
    return Math.min(consumed, cap);
  }
  if (link.allocationType === 'BUDGET_PERCENTAGE') {
    const cap = projectLinkAllocatedBudget(link) ?? 0;
    return Math.min(consumed, cap);
  }
  return consumed * projectAllocationShare(link);
}

/** @deprecated Préférer `projectLinkAllocatedBudget` — conservé pour compat. */
export function linkAllocatedAmount(link: ProjectBudgetLinkItem): number | null {
  return projectLinkAllocatedBudget(link);
}

export type ProjectBudgetMetrics = {
  total: number | null;
  engaged: number;
  realized: number;
  restToEngage: number | null;
  available: number | null;
  forecast: number | null;
  forecastDelta: number | null;
  engagedPct: number;
  realizedPct: number;
  restToEngagePct: number;
  capexOpexLabel: string;
  imputedCapex: number;
  imputedOpex: number;
};

export function computeProjectBudgetMetrics(
  links: ProjectBudgetLinkItem[],
  options: {
    targetBudgetAmount?: string | null;
    consumedBudgetAmount?: string | null;
    estimatedCost?: number | null;
  } = {},
): ProjectBudgetMetrics {
  let engaged = 0;
  let realized = 0;
  let allocatedFromLinks = 0;
  let imputedCapex = 0;
  let imputedOpex = 0;
  let hasAllocatedFromLinks = false;

  for (const link of links) {
    engaged += projectLinkEngaged(link);
    realized += projectLinkRealized(link);

    const allocated = projectLinkAllocatedBudget(link);
    if (allocated != null) {
      allocatedFromLinks += allocated;
      hasAllocatedFromLinks = true;
      if (link.budgetLine.expenseType === 'CAPEX') imputedCapex += allocated;
      else imputedOpex += allocated;
    }
  }

  const targetFromProject = parseBudgetAmount(options.targetBudgetAmount);
  const consumedFromProject = parseBudgetAmount(options.consumedBudgetAmount);
  const estimatedCost = options.estimatedCost ?? null;

  const total =
    targetFromProject ??
    (hasAllocatedFromLinks ? allocatedFromLinks : null);

  const realizedValue =
    consumedFromProject != null && consumedFromProject > 0
      ? consumedFromProject
      : realized;

  const restToEngage =
    total != null && total > 0 ? Math.max(0, total - engaged) : null;
  const available =
    total != null && total > 0 ? Math.max(0, total - realizedValue) : null;
  const forecast = estimatedCost ?? (total != null ? realizedValue : null);
  const forecastDelta =
    total != null && forecast != null ? total - forecast : null;

  const engagedPct =
    total != null && total > 0 ? budgetPercentOf(engaged, total) : 0;
  const realizedPct =
    total != null && total > 0 ? budgetPercentOf(realizedValue, total) : 0;
  const restToEngagePct =
    total != null && total > 0 && restToEngage != null
      ? budgetPercentOf(restToEngage, total)
      : 0;

  const capexOpexLabel =
    imputedCapex > 0 || imputedOpex > 0
      ? [imputedCapex > 0 ? 'CAPEX' : null, imputedOpex > 0 ? 'OPEX' : null]
          .filter(Boolean)
          .join(' + ')
      : 'Budget projet';

  return {
    total,
    engaged,
    realized: realizedValue,
    restToEngage,
    available,
    forecast,
    forecastDelta,
    engagedPct,
    realizedPct,
    restToEngagePct,
    capexOpexLabel,
    imputedCapex,
    imputedOpex,
  };
}

/** Agrégat legacy — délégué à la vue projet proratisée. */
export function aggregateProjectBudgetFromLinks(links: ProjectBudgetLinkItem[]) {
  const metrics = computeProjectBudgetMetrics(links);
  return {
    committed: metrics.engaged,
    consumed: metrics.realized,
    allocatedFixed: metrics.imputedCapex + metrics.imputedOpex,
    imputedCapex: metrics.imputedCapex,
    imputedOpex: metrics.imputedOpex,
  };
}
