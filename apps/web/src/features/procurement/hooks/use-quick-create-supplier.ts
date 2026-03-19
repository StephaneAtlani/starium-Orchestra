'use client';

import { useMutation } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { quickCreateSupplier } from '../api/procurement.api';

export function useQuickCreateSupplier() {
  const authFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (payload: { name: string }) =>
      quickCreateSupplier(authFetch, payload),
  });
}

