'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import {
  activateBudgetEnvelope,
  activateBudgetLine,
  submitBudgetEnvelope,
  submitBudgetLine,
} from '../api/budget-landing-forecast.api';

function useInvalidateBudgetScope() {
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  return () => {
    if (!clientId) return;
    void qc.invalidateQueries({ queryKey: budgetQueryKeys.all(clientId) });
  };
}

export function useSubmitBudgetLine() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateBudgetScope();
  return useMutation({
    mutationFn: (id: string) => submitBudgetLine(authFetch, id),
    onSuccess: () => {
      toast.success('Ligne soumise');
      invalidate();
    },
    onError: (err) =>
      toast.error('Soumission impossible', { description: (err as Error).message }),
  });
}

export function useActivateBudgetLine() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateBudgetScope();
  return useMutation({
    mutationFn: (id: string) => activateBudgetLine(authFetch, id),
    onSuccess: () => {
      toast.success('Ligne activée');
      invalidate();
    },
    onError: (err) =>
      toast.error('Activation impossible', { description: (err as Error).message }),
  });
}

export function useSubmitBudgetEnvelope() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateBudgetScope();
  return useMutation({
    mutationFn: (id: string) => submitBudgetEnvelope(authFetch, id),
    onSuccess: () => {
      toast.success('Enveloppe soumise');
      invalidate();
    },
    onError: (err) =>
      toast.error('Soumission impossible', { description: (err as Error).message }),
  });
}

export function useActivateBudgetEnvelope() {
  const authFetch = useAuthenticatedFetch();
  const invalidate = useInvalidateBudgetScope();
  return useMutation({
    mutationFn: (id: string) => activateBudgetEnvelope(authFetch, id),
    onSuccess: () => {
      toast.success('Enveloppe activée', {
        description: 'L’enveloppe est active. Les lignes restent à valider.',
      });
      invalidate();
    },
    onError: (err) =>
      toast.error('Activation impossible', { description: (err as Error).message }),
  });
}
