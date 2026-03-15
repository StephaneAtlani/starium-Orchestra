/**
 * Chargement complet des données pour l’explorateur budgétaire (RFC-FE-004).
 * Boucle pagination jusqu’à tout récupérer — pas de filtres API.
 */

import type { AuthFetch } from '../api/budget-management.api';
import { listEnvelopes, listLines } from '../api/budget-management.api';
import type { BudgetEnvelope, BudgetLine } from '../types/budget-management.types';

const PAGE_SIZE = 100;

/**
 * Récupère toutes les enveloppes du budget en bouclant sur la pagination.
 */
export async function fetchAllEnvelopesForBudget(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetEnvelope[]> {
  const all: BudgetEnvelope[] = [];
  let offset = 0;
  let total = 0;
  let res: Awaited<ReturnType<typeof listEnvelopes>>;
  do {
    res = await listEnvelopes(authFetch, {
      budgetId,
      limit: PAGE_SIZE,
      offset,
    });
    all.push(...res.items);
    total = res.total;
    offset += res.items.length;
  } while (offset < total && res.items.length > 0);
  return all;
}

/**
 * Récupère toutes les lignes du budget en bouclant sur la pagination.
 * Aucun filtre API — le filtrage explorer est côté client (filter-budget-tree).
 */
export async function fetchAllLinesForBudget(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<BudgetLine[]> {
  const all: BudgetLine[] = [];
  let offset = 0;
  let total = 0;
  let res: Awaited<ReturnType<typeof listLines>>;
  do {
    res = await listLines(authFetch, {
      budgetId,
      limit: PAGE_SIZE,
      offset,
    });
    all.push(...res.items);
    total = res.total;
    offset += res.items.length;
  } while (offset < total && res.items.length > 0);
  return all;
}
