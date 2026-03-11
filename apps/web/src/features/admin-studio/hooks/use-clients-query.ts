import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getClients } from '../api/get-clients';
import { createClient, type CreateClientPayload } from '../api/create-client';
import { updateClient, type UpdateClientPayload } from '../api/update-client';
import type { AdminClientSummary } from '../types/admin-studio.types';

export function useClientsQuery() {
  const { accessToken } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery<AdminClientSummary[]>({
    queryKey: ['admin-clients'],
    queryFn: () => getClients(authenticatedFetch),
    enabled: !!accessToken,
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();

  return useMutation<AdminClientSummary, Error, CreateClientPayload>({
    mutationFn: (payload) => createClient(authenticatedFetch, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();

  return useMutation<
    AdminClientSummary,
    Error,
    { clientId: string; payload: UpdateClientPayload }
  >({
    mutationFn: ({ clientId, payload }) =>
      updateClient(authenticatedFetch, clientId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
  });
}

