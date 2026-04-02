'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listCollaboratorsForSkill } from '../api/skills.api';
import { skillQueryKeys } from '../lib/skill-query-keys';
import type { SkillCollaboratorsListParams } from '../types/skill.types';

export function useSkillCollaboratorsForSkill(
  skillId: string | null,
  params: SkillCollaboratorsListParams,
  enabled: boolean,
) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  return useQuery({
    queryKey: skillId
      ? skillQueryKeys.skillCollaborators(clientId, skillId, params)
      : ['teams', clientId, 'skills', 'collaborators-for-skill', 'idle'],
    queryFn: () => listCollaboratorsForSkill(authFetch, skillId!, params),
    enabled: !!clientId && !!skillId && enabled,
  });
}
