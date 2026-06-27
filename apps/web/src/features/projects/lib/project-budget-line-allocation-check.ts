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

export type BudgetLineAllocationWarning = {
  severity: 'warning' | 'danger';
  lineLabel: string;
  lineBudget: number;
  lineRemaining: number;
  projectAllocation: number;
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

  if (!exceedsLineBudget && !exceedsLineRemaining) return null;

  return {
    severity: exceedsLineBudget ? 'danger' : 'warning',
    lineLabel: formatLineLabel(line),
    lineBudget,
    lineRemaining,
    projectAllocation,
    exceedsLineBudget,
    exceedsLineRemaining,
  };
}
