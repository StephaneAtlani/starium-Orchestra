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

/** Données réellement envoyées au backend — jamais de flag UI. */
export type CreateProjectPayload = {
  body: Record<string, unknown>;
  tagIds?: string[];
  retroplanMacro?: CreateRetroplanMacroPayload;
};

/** Options locales frontend — jamais sérialisées dans le body HTTP. */
export type CreateProjectMutationOptions = {
  redirectToMicrosoftOptions?: boolean;
};

export type CreateProjectMutationVariables = {
  payload: CreateProjectPayload;
} & CreateProjectMutationOptions;

export function useCreateProject() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation<ProjectDetail, ApiFormError, CreateProjectMutationVariables>({
    mutationFn: async ({ payload, redirectToMicrosoftOptions: _redirect, ...rest }) => {
      void _redirect;
      void rest;
      const { body, tagIds, retroplanMacro } = payload;
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
      const milestoneCount = variables.payload.retroplanMacro?.steps.length ?? 0;
      if (variables.redirectToMicrosoftOptions) {
        toast.success(
          milestoneCount > 0
            ? `Projet créé avec ${milestoneCount} jalon${milestoneCount > 1 ? 's' : ''} — provisioning Teams en cours.`
            : 'Projet créé — provisioning Teams en cours.',
        );
        router.push(`/projects/${data.id}/options?tab=microsoft`);
        return;
      }
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

  return mutation;
}
