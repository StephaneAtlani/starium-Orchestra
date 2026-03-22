/**
 * Mémorise le dernier budget / exercice choisi pour le cockpit (par client actif).
 * Permet d’aligner la vue Budget Cockpit sur le budget ouvert depuis Budgets → détail.
 */

const PREFIX = 'starium.budgetCockpit.selection';

export type BudgetCockpitSelection = {
  exerciseId: string;
  budgetId: string;
};

function key(clientId: string): string {
  return `${PREFIX}:${clientId}`;
}

export function loadBudgetCockpitSelection(
  clientId: string,
): BudgetCockpitSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BudgetCockpitSelection>;
    if (
      typeof parsed.exerciseId === 'string' &&
      typeof parsed.budgetId === 'string' &&
      parsed.exerciseId &&
      parsed.budgetId
    ) {
      return { exerciseId: parsed.exerciseId, budgetId: parsed.budgetId };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBudgetCockpitSelection(
  clientId: string,
  selection: BudgetCockpitSelection,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(clientId), JSON.stringify(selection));
  } catch {
    // quota / private mode
  }
}
