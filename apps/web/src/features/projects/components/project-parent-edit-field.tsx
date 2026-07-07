'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/use-permissions';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { updateProject } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectDetail } from '../types/project.types';
import { ProjectParentCombobox } from './project-parent-combobox';

export function ProjectParentEditField({ project }: { project: ProjectDetail }) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const [errorText, setErrorText] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (parentProjectId: string | null) =>
      updateProject(authFetch, project.id, { parentProjectId }),
    onSuccess: (updated) => {
      setErrorText(null);
      queryClient.setQueryData(projectQueryKeys.detail(clientId, project.id), updated);
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list(clientId, {}) });
    },
    onError: (err: Error) => {
      setErrorText(err.message || 'Impossible de mettre à jour le projet parent.');
    },
  });

  if (!canEdit) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
      <ProjectParentCombobox
        label="Projet parent"
        value={project.parentProject?.id ?? null}
        excludeProjectId={project.id}
        currentParent={project.parentProject ?? null}
        disabled={mutation.isPending}
        errorText={errorText}
        onValueChange={(parentProjectId) => mutation.mutate(parentProjectId)}
      />
    </div>
  );
}
