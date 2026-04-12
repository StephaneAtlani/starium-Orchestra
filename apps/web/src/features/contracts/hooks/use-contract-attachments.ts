'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import {
  archiveContractAttachment,
  downloadContractAttachment,
  listContractAttachments,
  uploadContractAttachment,
} from '../api/contracts.api';
import { contractsKeys } from '../lib/contracts-query-keys';
import type { ContractAttachmentCategory } from '../types/contract.types';

export function useContractAttachments(contractId: string | null, enabled: boolean) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: contractsKeys.attachments(clientId, contractId ?? ''),
    queryFn: () => listContractAttachments(authFetch, contractId!),
    enabled: Boolean(enabled && clientId && contractId),
  });
}

export function useContractAttachmentMutations(contractId: string | null) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const invalidate = () => {
    if (contractId) {
      void queryClient.invalidateQueries({
        queryKey: contractsKeys.attachments(clientId, contractId),
      });
    }
  };

  const upload = useMutation({
    mutationFn: async (payload: {
      file: File;
      name?: string;
      category?: ContractAttachmentCategory;
    }) =>
      uploadContractAttachment(authFetch, contractId!, payload.file, {
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
      archiveContractAttachment(authFetch, contractId!, attachmentId),
    onSuccess: () => {
      invalidate();
      toast.success('Document archivé.');
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Archivage impossible.');
    },
  });

  const download = async (attachmentId: string) => {
    const { blob, filename } = await downloadContractAttachment(
      authFetch,
      contractId!,
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
