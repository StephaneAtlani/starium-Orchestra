import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getClients } from '../api/get-clients';
import { createClient, type CreateClientPayload } from '../api/create-client';
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

