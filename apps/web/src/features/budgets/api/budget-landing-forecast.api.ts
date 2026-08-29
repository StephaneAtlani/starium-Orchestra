import type { AuthFetch } from './budget-management.api';
import type { LandingForecastState } from '../types/budget-landing-forecast.types';

export async function getLandingForecast(
  authFetch: AuthFetch,
  budgetId: string,
): Promise<LandingForecastState> {
  const res = await authFetch(`/api/budgets/${budgetId}/landing-forecast`);
  if (!res.ok) {
    throw new Error('Impossible de charger la prévision d’atterrissage');
  }
  return res.json() as Promise<LandingForecastState>;
}

export async function validateLandingForecast(
  authFetch: AuthFetch,
  budgetId: string,
  arbitratedSnapshotId: string,
): Promise<LandingForecastState> {
  const res = await authFetch(`/api/budgets/${budgetId}/landing-forecast/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arbitratedSnapshotId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new Error(body.message ?? 'Validation impossible');
  }
  return res.json() as Promise<LandingForecastState>;
}

export async function applyLandingForecast(
  authFetch: AuthFetch,
  budgetId: string,
  arbitratedSnapshotId: string,
): Promise<LandingForecastState> {
  const res = await authFetch(`/api/budgets/${budgetId}/landing-forecast/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arbitratedSnapshotId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new Error(body.message ?? 'Activation impossible');
  }
  return res.json() as Promise<LandingForecastState>;
}

export async function submitBudgetLine(authFetch: AuthFetch, id: string) {
  const res = await authFetch(`/api/budget-lines/${id}/submit`, { method: 'POST' });
  if (!res.ok) throw new Error('Soumission de la ligne impossible');
  return res.json();
}

export async function activateBudgetLine(authFetch: AuthFetch, id: string) {
  const res = await authFetch(`/api/budget-lines/${id}/activate`, { method: 'POST' });
  if (!res.ok) throw new Error('Activation de la ligne impossible');
  return res.json();
}

export async function submitBudgetEnvelope(authFetch: AuthFetch, id: string) {
  const res = await authFetch(`/api/budget-envelopes/${id}/submit`, { method: 'POST' });
  if (!res.ok) throw new Error('Soumission de l’enveloppe impossible');
  return res.json();
}

export async function activateBudgetEnvelope(authFetch: AuthFetch, id: string) {
  const res = await authFetch(`/api/budget-envelopes/${id}/activate`, { method: 'POST' });
  if (!res.ok) throw new Error('Activation de l’enveloppe impossible');
  return res.json();
}
