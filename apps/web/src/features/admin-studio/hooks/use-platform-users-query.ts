import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getPlatformUsers } from '../api/get-platform-users';
import type { AdminPlatformUserSummary } from '../types/admin-studio.types';

export function usePlatformUsersQuery() {
  const { accessToken } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery<AdminPlatformUserSummary[]>({
    queryKey: ['platform-users'],
    queryFn: () => getPlatformUsers(authenticatedFetch),
    enabled: !!accessToken,
  });
}

