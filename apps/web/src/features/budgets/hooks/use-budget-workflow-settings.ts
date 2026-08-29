'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';

export type BudgetWorkflowResolved = {
  requireEnvelopesNonDraftForBudgetValidated: boolean;
  snapshotIncludedBudgetLineStatuses: string[];
  landingForecastEnabled: boolean;
  midYearDefaultLineStatus: string;
  midYearDefaultEnvelopeStatus: string;
  midYearRequireJustification: boolean;
};

type Response = {
  resolved: BudgetWorkflowResolved;
};

export function useBudgetWorkflowSettings() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: ['budget-workflow-settings', clientId],
    queryFn: async (): Promise<Response> => {
      const res = await authFetch('/api/clients/active/budget-workflow-settings');
      if (!res.ok) throw new Error('Impossible de charger les paramètres workflow budget');
      return res.json() as Promise<Response>;
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });
}
