/**
 * Mémorise l’exercice et le budget affichés au chargement du cockpit.
 *
 * - **Sans `userId`** : périmètre **client** (mode Global) — partagé entre utilisateurs du même client.
 * - **Avec `userId`** : périmètre **compte** (mode Personnalisé) — défaut d’affichage propre à l’utilisateur.
 *
 * Les liens depuis la liste / détail budget continuent d’écrire le stockage **client** pour aligner la navigation.
 */

const PREFIX = 'starium.budgetCockpit.selection';

export type BudgetCockpitSelection = {
  exerciseId: string;
  budgetId: string;
};

function buildStorageKey(clientId: string, userId?: string): string {
  if (userId) return `${PREFIX}:${clientId}:user:${userId}`;
  return `${PREFIX}:${clientId}`;
}

export function loadBudgetCockpitSelection(
  clientId: string,
  options?: { userId?: string },
): BudgetCockpitSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(buildStorageKey(clientId, options?.userId));
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
  options?: { userId?: string },
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      buildStorageKey(clientId, options?.userId),
      JSON.stringify(selection),
    );
  } catch {
    // quota / private mode
  }
}
