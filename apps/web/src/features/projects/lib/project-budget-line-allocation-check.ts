import {
  computePercentageLineAllocationAmount,
  parseAllocationPercentage,
  parseFixedLinkAmount,
} from './project-budget-allocation';

export type BudgetLineAllocationRef = {
  code?: string | null;
  name: string;
  initialAmount: number;
  remainingAmount: number;
};

export type BudgetLineAllocationWarningKind =
  | 'line_budget'
  | 'line_remaining'
  | 'budget_percentage_overrun';

export type BudgetLineAllocationWarning = {
  severity: 'info' | 'warning' | 'danger';
  kind: BudgetLineAllocationWarningKind;
  lineLabel: string;
  lineBudget: number;
  lineRemaining: number;
  projectAllocation: number;
  /** Écart imputé en dépassement (mode % du budget). */
  lineOverrun?: number;
  exceedsLineBudget: boolean;
  exceedsLineRemaining: boolean;
};

function formatLineLabel(line: BudgetLineAllocationRef): string {
  return line.code ? `${line.code} — ${line.name}` : line.name;
}

function resolveProjectAllocationAmount(
  line: BudgetLineAllocationRef,
  mode: 'FIXED' | 'PERCENTAGE' | 'BUDGET_PERCENTAGE',
  amount: string,
  percentage: string,
  budgetTotalInitialAmount?: number | null,
): number | null {
  if (mode === 'FIXED') {
    return parseFixedLinkAmount(amount.trim() || null);
  }
  const pct = parseAllocationPercentage(percentage.trim() || null);
  if (pct == null) return null;
  if (mode === 'BUDGET_PERCENTAGE') {
    if (budgetTotalInitialAmount == null || budgetTotalInitialAmount <= 0) return null;
    return computePercentageLineAllocationAmount(budgetTotalInitialAmount, pct);
  }
  if (line.initialAmount <= 0) return null;
  return computePercentageLineAllocationAmount(line.initialAmount, pct);
}

export function getBudgetLineAllocationWarning(
  line: BudgetLineAllocationRef | null | undefined,
  options: {
    mode: 'FIXED' | 'PERCENTAGE' | 'BUDGET_PERCENTAGE';
    amount?: string;
    percentage?: string;
    budgetTotalInitialAmount?: number | null;
  },
): BudgetLineAllocationWarning | null {
  if (!line) return null;

  const projectAllocation = resolveProjectAllocationAmount(
    line,
    options.mode,
    options.amount ?? '',
    options.percentage ?? '',
    options.budgetTotalInitialAmount,
  );
  if (projectAllocation == null || projectAllocation <= 0) return null;

  const lineBudget = line.initialAmount;
  const lineRemaining = Math.max(0, line.remainingAmount);
  const exceedsLineBudget = projectAllocation > lineBudget;
  const exceedsLineRemaining = projectAllocation > lineRemaining;

  if (options.mode === 'BUDGET_PERCENTAGE' && exceedsLineBudget) {
    const lineOverrun = projectAllocation - lineBudget;
    return {
      severity: 'info',
      kind: 'budget_percentage_overrun',
      lineLabel: formatLineLabel(line),
      lineBudget,
      lineRemaining,
      projectAllocation,
      lineOverrun,
      exceedsLineBudget: true,
      exceedsLineRemaining,
    };
  }

  if (!exceedsLineBudget && !exceedsLineRemaining) return null;

  return {
    severity: exceedsLineBudget ? 'danger' : 'warning',
    kind: exceedsLineBudget ? 'line_budget' : 'line_remaining',
    lineLabel: formatLineLabel(line),
    lineBudget,
    lineRemaining,
    projectAllocation,
    exceedsLineBudget,
    exceedsLineRemaining,
  };
}

/** Alerte visuelle bloquante (PERCENTAGE / FIXED) — pas pour le dépassement % budget. */
export function isBlockingLineAllocationWarning(
  warning: BudgetLineAllocationWarning,
): boolean {
  return warning.kind !== 'budget_percentage_overrun';
}
