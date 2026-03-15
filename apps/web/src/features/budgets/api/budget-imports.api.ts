/**
 * Stub — API budget-imports (futures RFC).
 * Pas d’implémentation des appels dans cette RFC.
 */

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

// Stub: à implémenter dans une RFC dédiée (import UI).
export async function list(_authFetch: AuthFetch, _budgetId: string): Promise<{ items: never[]; total: number }> {
  return { items: [], total: 0 };
}
