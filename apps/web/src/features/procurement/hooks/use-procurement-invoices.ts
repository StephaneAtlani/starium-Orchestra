'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getInvoice, listInvoices } from '../api/procurement.api';
import { procurementEntityKeys } from '../lib/procurement-query-keys';

function stableParamsKey(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

export function useInvoicesListQuery(params: {
  offset: number;
  limit: number;
  search?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  includeCancelled?: boolean;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const key = stableParamsKey({
    o: params.offset,
    l: params.limit,
    s: params.search ?? '',
    sup: params.supplierId ?? '',
    po: params.purchaseOrderId ?? '',
    c: params.includeCancelled ?? false,
  });

  return useQuery({
    queryKey: procurementEntityKeys.invoicesList(clientId, key),
    queryFn: () =>
      listInvoices(authFetch, {
        offset: params.offset,
        limit: params.limit,
        search: params.search?.trim() || undefined,
        supplierId: params.supplierId,
        purchaseOrderId: params.purchaseOrderId,
        includeCancelled: params.includeCancelled,
      }),
    enabled: Boolean(clientId),
  });
}

export function useInvoiceDetailQuery(invoiceId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: procurementEntityKeys.invoiceDetail(clientId, invoiceId ?? ''),
    queryFn: () => getInvoice(authFetch, invoiceId!),
    enabled: Boolean(clientId && invoiceId),
  });
}
