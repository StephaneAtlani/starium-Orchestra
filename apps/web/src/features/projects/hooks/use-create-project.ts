'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import type { ApiFormError } from '@/features/budgets/api/types';
import { projectQueryKeys } from '../lib/project-query-keys';
import { createProject, replaceProjectTags } from '../api/projects.api';
import { projectDetail } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';

export type CreateProjectPayload = {
  body: Record<string, unknown>;
  /** Étiquettes client — appliquées après création (PUT /projects/:id/tags). */
  tagIds?: string[];
};

export function useCreateProject() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<ProjectDetail, ApiFormError, CreateProjectPayload>({
    mutationFn: async ({ body, tagIds }) => {
      const project = await createProject(authFetch, body);
      if (tagIds?.length) {
        await replaceProjectTags(authFetch, project.id, tagIds);
      }
      return project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      toast.success('Projet créé.');
      router.push(projectDetail(data.id));
    },
    onError: (err: ApiFormError) => {
      toast.error(err.message);
    },
  });
}
