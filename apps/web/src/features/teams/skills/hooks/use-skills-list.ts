'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listSkills } from '../api/skills.api';
import { skillQueryKeys } from '../lib/skill-query-keys';
import type { SkillsListParams } from '../types/skill.types';

export function useSkillsList(params: SkillsListParams) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: skillQueryKeys.list(clientId, params),
    queryFn: () => listSkills(authFetch, params),
    enabled: !!clientId,
  });
}
