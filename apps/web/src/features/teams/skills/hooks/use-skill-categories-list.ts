'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listSkillCategories } from '../api/skill-categories.api';
import { skillQueryKeys } from '../lib/skill-query-keys';
import type { SkillCategoriesListParams } from '../types/skill.types';

export function useSkillCategoriesList(params: SkillCategoriesListParams = {}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: skillQueryKeys.categoriesList(clientId, params),
    queryFn: () => listSkillCategories(authFetch, params),
    enabled: !!clientId,
  });
}
