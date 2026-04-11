'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  cancelInvoice,
  cancelPurchaseOrder,
  createInvoice,
  createPurchaseOrder,
} from '../api/procurement.api';
import { procurementEntityKeys } from '../lib/procurement-query-keys';
import type { CreateInvoicePayload } from '../types/invoice.types';
import type { CreatePurchaseOrderPayload } from '../types/purchase-order.types';

function invalidatePurchaseOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  clientId: string,
) {
  void queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === 'procurement' &&
      q.queryKey[1] === clientId &&
      q.queryKey[2] === 'purchase-orders',
  });
}

function invalidateInvoiceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  clientId: string,
) {
  void queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === 'procurement' &&
      q.queryKey[1] === clientId &&
      q.queryKey[2] === 'invoices',
  });
}

export function useCreatePurchaseOrderStandalone() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) =>
      createPurchaseOrder(authFetch, payload),
    onSuccess: () => {
      invalidatePurchaseOrderQueries(queryClient, clientId);
    },
  });
}

export function useCreateInvoiceStandalone() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInvoicePayload) => createInvoice(authFetch, payload),
    onSuccess: () => {
      invalidateInvoiceQueries(queryClient, clientId);
    },
  });
}

export function useCancelPurchaseOrderMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseOrderId: string) =>
      cancelPurchaseOrder(authFetch, purchaseOrderId),
    onSuccess: (_data, purchaseOrderId) => {
      invalidatePurchaseOrderQueries(queryClient, clientId);
      void queryClient.invalidateQueries({
        queryKey: procurementEntityKeys.purchaseOrderDetail(clientId, purchaseOrderId),
      });
    },
  });
}

export function useCancelInvoiceMutation() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => cancelInvoice(authFetch, invoiceId),
    onSuccess: (_data, invoiceId) => {
      invalidateInvoiceQueries(queryClient, clientId);
      void queryClient.invalidateQueries({
        queryKey: procurementEntityKeys.invoiceDetail(clientId, invoiceId),
      });
    },
  });
}
