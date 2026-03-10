import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClients } from '../api/get-clients';
import { createClient } from '../api/create-client';
import type { AdminClientSummary } from '../types/admin-studio.types';

export function useClientsQuery() {
  return useQuery<AdminClientSummary[]>({
    queryKey: ['admin-clients'],
    queryFn: getClients,
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    },
  });
}

