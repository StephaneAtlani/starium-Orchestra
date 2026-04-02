'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listSkillCategoryOptions } from '../api/skill-categories.api';
import { skillQueryKeys } from '../lib/skill-query-keys';

export function useSkillCategoryOptions() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: skillQueryKeys.categoryOptions(clientId),
    queryFn: () => listSkillCategoryOptions(authFetch, { limit: 200 }),
    enabled: !!clientId,
  });
}
