import { useQuery } from '@tanstack/react-query';
import { getPlatformUsers } from '../api/get-platform-users';
import type { AdminPlatformUserSummary } from '../types/admin-studio.types';

export function usePlatformUsersQuery() {
  return useQuery<AdminPlatformUserSummary[]>({
    queryKey: ['platform-users'],
    queryFn: getPlatformUsers,
  });
}

