'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getPurchaseOrder, listPurchaseOrders } from '../api/procurement.api';
import { procurementEntityKeys } from '../lib/procurement-query-keys';

function stableParamsKey(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

export function usePurchaseOrdersListQuery(params: {
  offset: number;
  limit: number;
  search?: string;
  supplierId?: string;
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
    c: params.includeCancelled ?? false,
  });

  return useQuery({
    queryKey: procurementEntityKeys.purchaseOrdersList(clientId, key),
    queryFn: () =>
      listPurchaseOrders(authFetch, {
        offset: params.offset,
        limit: params.limit,
        search: params.search?.trim() || undefined,
        supplierId: params.supplierId,
        includeCancelled: params.includeCancelled,
      }),
    enabled: Boolean(clientId),
  });
}

export function usePurchaseOrderDetailQuery(purchaseOrderId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: procurementEntityKeys.purchaseOrderDetail(clientId, purchaseOrderId ?? ''),
    queryFn: () => getPurchaseOrder(authFetch, purchaseOrderId!),
    enabled: Boolean(clientId && purchaseOrderId),
  });
}
