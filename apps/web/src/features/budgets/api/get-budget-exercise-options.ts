/**
 * API options exercices — pour le filtre exerciseId de la page budgets (RFC-FE-003).
 */

import type { AuthFetch } from './budget-management.api';
import { listExercises } from './budget-management.api';
import type { BudgetExerciseSummary } from '../types/budget-list.types';

export async function getBudgetExerciseOptions(
  authFetch: AuthFetch,
): Promise<BudgetExerciseSummary[]> {
  const res = await listExercises(authFetch, { limit: 100 });
  return res.items.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    startDate: item.startDate,
    endDate: item.endDate,
    status: item.status as BudgetExerciseSummary['status'],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}
