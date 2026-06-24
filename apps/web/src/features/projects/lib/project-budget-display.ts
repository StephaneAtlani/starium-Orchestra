import type { ProjectBudgetLinkItem } from '../types/project.types';

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

export function linkAllocatedAmount(link: ProjectBudgetLinkItem): number | null {
  if (link.allocationType === 'FIXED') {
    return parseBudgetAmount(link.amount);
  }
  return null;
}

export function aggregateProjectBudgetFromLinks(links: ProjectBudgetLinkItem[]) {
  let committed = 0;
  let consumed = 0;
  let allocatedFixed = 0;
  let imputedCapex = 0;
  let imputedOpex = 0;

  for (const link of links) {
    committed += link.budgetLine.committedAmount ?? 0;
    consumed += link.budgetLine.consumedAmount ?? 0;
    const fixed = linkAllocatedAmount(link);
    if (fixed != null) {
      allocatedFixed += fixed;
      if (link.budgetLine.expenseType === 'CAPEX') imputedCapex += fixed;
      else imputedOpex += fixed;
    }
  }

  return { committed, consumed, allocatedFixed, imputedCapex, imputedOpex };
}
