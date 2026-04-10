'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import {
  archiveInvoiceAttachment,
  archivePurchaseOrderAttachment,
  downloadInvoiceAttachment,
  downloadPurchaseOrderAttachment,
  listInvoiceAttachments,
  listPurchaseOrderAttachments,
  uploadInvoiceAttachment,
  uploadPurchaseOrderAttachment,
} from '../api/procurement.api';
import { procurementAttachmentKeys } from '../lib/procurement-query-keys';
import type { ProcurementAttachmentCategory } from '../types/procurement-attachment.types';

export function usePurchaseOrderAttachments(
  purchaseOrderId: string | null,
  enabled: boolean,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: procurementAttachmentKeys.purchaseOrder(clientId, purchaseOrderId ?? ''),
    queryFn: () => listPurchaseOrderAttachments(authFetch, purchaseOrderId!),
    enabled: Boolean(enabled && clientId && purchaseOrderId),
  });
}

export function useInvoiceAttachments(invoiceId: string | null, enabled: boolean) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: procurementAttachmentKeys.invoice(clientId, invoiceId ?? ''),
    queryFn: () => listInvoiceAttachments(authFetch, invoiceId!),
    enabled: Boolean(enabled && clientId && invoiceId),
  });
}

export function usePurchaseOrderAttachmentMutations(purchaseOrderId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidate = () => {
    if (purchaseOrderId) {
      void queryClient.invalidateQueries({
        queryKey: procurementAttachmentKeys.purchaseOrder(clientId, purchaseOrderId),
      });
    }
  };

  const upload = useMutation({
    mutationFn: async (payload: {
      file: File;
      name?: string;
      category?: ProcurementAttachmentCategory;
    }) =>
      uploadPurchaseOrderAttachment(authFetch, purchaseOrderId!, payload.file, {
        name: payload.name,
        category: payload.category,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Document enregistré.');
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Échec de l’envoi du fichier.');
    },
  });

  const archive = useMutation({
    mutationFn: (attachmentId: string) =>
      archivePurchaseOrderAttachment(authFetch, purchaseOrderId!, attachmentId),
    onSuccess: () => {
      invalidate();
      toast.success('Document archivé.');
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Archivage impossible.');
    },
  });

  const download = async (attachmentId: string) => {
    const { blob, filename } = await downloadPurchaseOrderAttachment(
      authFetch,
      purchaseOrderId!,
      attachmentId,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { upload, archive, download };
}

export function useInvoiceAttachmentMutations(invoiceId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidate = () => {
    if (invoiceId) {
      void queryClient.invalidateQueries({
        queryKey: procurementAttachmentKeys.invoice(clientId, invoiceId),
      });
    }
  };

  const upload = useMutation({
    mutationFn: async (payload: {
      file: File;
      name?: string;
      category?: ProcurementAttachmentCategory;
    }) =>
      uploadInvoiceAttachment(authFetch, invoiceId!, payload.file, {
        name: payload.name,
        category: payload.category,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Document enregistré.');
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Échec de l’envoi du fichier.');
    },
  });

  const archive = useMutation({
    mutationFn: (attachmentId: string) =>
      archiveInvoiceAttachment(authFetch, invoiceId!, attachmentId),
    onSuccess: () => {
      invalidate();
      toast.success('Document archivé.');
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Archivage impossible.');
    },
  });

  const download = async (attachmentId: string) => {
    const { blob, filename } = await downloadInvoiceAttachment(
      authFetch,
      invoiceId!,
      attachmentId,
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { upload, archive, download };
}
