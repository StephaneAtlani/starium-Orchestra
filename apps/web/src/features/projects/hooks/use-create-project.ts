'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import type { ApiFormError } from '@/features/budgets/api/types';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  createProject,
  createRetroplanMacro,
  replaceProjectTags,
} from '../api/projects.api';
import { projectDetail } from '../constants/project-routes';
import type { CreateRetroplanMacroPayload, ProjectDetail } from '../types/project.types';

export type CreateProjectPayload = {
  body: Record<string, unknown>;
  /** Étiquettes client — appliquées après création (PUT /projects/:id/tags). */
  tagIds?: string[];
  /** Jalons macro — POST /projects/:id/milestones/retroplan-macro après création. */
  retroplanMacro?: CreateRetroplanMacroPayload;
};

export function useCreateProject() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<ProjectDetail, ApiFormError, CreateProjectPayload>({
    mutationFn: async ({ body, tagIds, retroplanMacro }) => {
      const project = await createProject(authFetch, body);
      if (tagIds?.length) {
        await replaceProjectTags(authFetch, project.id, tagIds);
      }
      if (retroplanMacro) {
        await createRetroplanMacro(authFetch, project.id, retroplanMacro);
      }
      return project;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      const milestoneCount = variables.retroplanMacro?.steps.length ?? 0;
      toast.success(
        milestoneCount > 0
          ? `Projet créé avec ${milestoneCount} jalon${milestoneCount > 1 ? 's' : ''}.`
          : 'Projet créé.',
      );
      router.push(projectDetail(data.id));
    },
    onError: (err: ApiFormError) => {
      toast.error(err.message);
    },
  });
}
