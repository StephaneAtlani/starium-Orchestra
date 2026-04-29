'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { meQueryKeys } from '@/lib/me-query-keys';
import {
  createEmailIdentity,
  deleteEmailIdentity,
  getEmailIdentities,
  resendEmailIdentityVerification,
  setDefaultClient,
  setDefaultEmailIdentityForClient,
  updateEmailIdentity,
  type CreateEmailIdentityPayload,
  type MeClient,
  type MeEmailIdentity,
  type UpdateEmailIdentityPayload,
} from '@/services/me';

export function useMeClientsQuery() {
  const authFetch = useAuthenticatedFetch();
  const { accessToken } = useAuth();

  return useQuery<MeClient[], Error>({
    queryKey: meQueryKeys.clients(),
    queryFn: async (): Promise<MeClient[]> => {
      const res = await authFetch('/api/me/clients');
      if (!res.ok) {
        throw new Error('Impossible de récupérer la liste des clients');
      }
      return (await res.json()) as MeClient[];
    },
    enabled: !!accessToken,
  });
}

export function useEmailIdentitiesQuery() {
  const authFetch = useAuthenticatedFetch();
  const { accessToken } = useAuth();

  return useQuery<MeEmailIdentity[], Error>({
    queryKey: meQueryKeys.emailIdentities(),
    queryFn: () => getEmailIdentities(authFetch),
    enabled: !!accessToken,
  });
}

export function useCreateEmailIdentityMutation() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEmailIdentityPayload) =>
      createEmailIdentity(authFetch, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.emailIdentities() });
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.clients() });
    },
  });
}

export function useSetDefaultClientMutation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => {
      if (!accessToken) {
        return Promise.reject(new Error('Non authentifié'));
      }
      return setDefaultClient(accessToken, clientId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.clients() });
    },
  });
}

export function useUpdateEmailIdentityMutation() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      identityId,
      body,
    }: {
      identityId: string;
      body: UpdateEmailIdentityPayload;
    }) => updateEmailIdentity(authFetch, identityId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.emailIdentities() });
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.clients() });
    },
  });
}

export function useDeleteEmailIdentityMutation() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (identityId: string) => deleteEmailIdentity(authFetch, identityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.emailIdentities() });
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.clients() });
    },
  });
}

export function useResendEmailIdentityVerificationMutation() {
  const authFetch = useAuthenticatedFetch();

  return useMutation({
    mutationFn: (identityId: string) =>
      resendEmailIdentityVerification(authFetch, identityId),
  });
}

export function useSetDefaultEmailIdentityMutation() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      emailIdentityId,
    }: {
      clientId: string;
      emailIdentityId: string;
    }) => setDefaultEmailIdentityForClient(authFetch, clientId, emailIdentityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKeys.clients() });
    },
  });
}
