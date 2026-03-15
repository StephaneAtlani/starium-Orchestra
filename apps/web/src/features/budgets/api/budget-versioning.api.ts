/**
 * Stub — API budget-versioning (futures RFC).
 * Pas d’implémentation des appels dans cette RFC.
 */

export type AuthFetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

// Stub: à implémenter dans une RFC dédiée (versioning UI).
export async function getVersionHistory(_authFetch: AuthFetch, _budgetId: string): Promise<{ items: never[] }> {
  return { items: [] };
}
