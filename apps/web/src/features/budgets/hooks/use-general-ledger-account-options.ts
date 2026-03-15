'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { listGeneralLedgerAccounts } from '../api/general-ledger-accounts.api';

/**
 * Options comptes comptables pour le formulaire ligne (RFC-FE-015).
 */
export function useGeneralLedgerAccountOptions() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: budgetQueryKeys.generalLedgerAccountOptions(clientId),
    queryFn: () => listGeneralLedgerAccounts(authFetch, { limit: 200 }),
    enabled: !!clientId,
  });
}
