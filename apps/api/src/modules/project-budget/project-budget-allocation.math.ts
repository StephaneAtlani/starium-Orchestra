/**
 * Imputation V1 projet ↔ ligne (RFC-PROJ-010-B).
 * Heuristique proportionnelle / FIXED — pas un FinancialEvent PROJECT.
 */

export type ProjectBudgetAllocationMode =
  | 'FULL'
  | 'PERCENTAGE'
  | 'BUDGET_PERCENTAGE'
  | 'FIXED';

export type ProjectBudgetAllocationInput = {
  allocationType: ProjectBudgetAllocationMode;
  percentage: number | null;
  amount: number | null;
  lineInitial: number | null;
  budgetTotalInitial: number | null;
  lineCommitted: number | null;
  lineConsumed: number | null;
};

export type ProjectBudgetAllocationResult = {
  /** Part 0–1 pour FULL / PERCENTAGE ; 0 pour FIXED / BUDGET_PERCENTAGE (montant absolu). */
  share: number;
  projectAllocatedAmount: number | null;
  imputedCommitted: number | null;
  imputedConsumed: number | null;
};

/** Aligné FE `computePercentageLineAllocationAmount` (ceil). */
export function computePercentageLineAllocationAmount(
  baseAmount: number,
  percentage: number,
): number | null {
  if (baseAmount <= 0 || percentage <= 0) return null;
  return Math.ceil((baseAmount * percentage) / 100);
}

function asFinite(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return null;
  return n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcule la part allouée au projet et l’imputation engagé/consommé de la ligne.
 */
export function computeProjectBudgetAllocation(
  input: ProjectBudgetAllocationInput,
): ProjectBudgetAllocationResult {
  const lineInitial = asFinite(input.lineInitial);
  const budgetTotal = asFinite(input.budgetTotalInitial);
  const lineCommitted = asFinite(input.lineCommitted) ?? 0;
  const lineConsumed = asFinite(input.lineConsumed) ?? 0;
  const percentage = asFinite(input.percentage);
  const amount = asFinite(input.amount);

  switch (input.allocationType) {
    case 'FULL': {
      const share = 1;
      const allocated = lineInitial;
      return {
        share,
        projectAllocatedAmount: allocated,
        imputedCommitted: allocated == null ? null : round2(share * lineCommitted),
        imputedConsumed: allocated == null ? null : round2(share * lineConsumed),
      };
    }
    case 'PERCENTAGE': {
      const share = percentage != null && percentage > 0 ? percentage / 100 : 0;
      const allocated =
        lineInitial == null || percentage == null
          ? null
          : computePercentageLineAllocationAmount(lineInitial, percentage);
      return {
        share,
        projectAllocatedAmount: allocated,
        imputedCommitted: round2(share * lineCommitted),
        imputedConsumed: round2(share * lineConsumed),
      };
    }
    case 'BUDGET_PERCENTAGE': {
      const allocated =
        budgetTotal == null || percentage == null
          ? null
          : computePercentageLineAllocationAmount(budgetTotal, percentage);
      // Prorata vs plafond ligne pour imputer engagé/consommé ligne.
      let share = 0;
      if (allocated != null && lineInitial != null && lineInitial > 0) {
        share = Math.min(1, allocated / lineInitial);
      }
      return {
        share,
        projectAllocatedAmount: allocated,
        imputedCommitted: allocated == null ? null : round2(share * lineCommitted),
        imputedConsumed: allocated == null ? null : round2(share * lineConsumed),
      };
    }
    case 'FIXED': {
      const allocated = amount != null && amount > 0 ? amount : null;
      return {
        share: 0,
        projectAllocatedAmount: allocated,
        imputedCommitted:
          allocated == null ? null : round2(Math.min(allocated, lineCommitted)),
        imputedConsumed:
          allocated == null ? null : round2(Math.min(allocated, lineConsumed)),
      };
    }
    default: {
      const _exhaustive: never = input.allocationType;
      return _exhaustive;
    }
  }
}

export const IMPUTATION_BASIS_V1 = 'PROPORTIONAL_V1' as const;
export type ImputationBasisV1 = typeof IMPUTATION_BASIS_V1;

export const PROJECT_BUDGET_KPI_LINK_CAP = 500;
