'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import type { ApiFormError } from '@/features/budgets/api/types';
import { projectQueryKeys } from '../lib/project-query-keys';
import { createProject } from '../api/projects.api';
import { projectDetail } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';

export function useCreateProject() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<ProjectDetail, ApiFormError, Record<string, unknown>>({
    mutationFn: async (body) => createProject(authFetch, body),
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
