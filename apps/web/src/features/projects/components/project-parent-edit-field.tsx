'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/use-permissions';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from '@/lib/toast';
import { updateProject } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { projectDetail } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { ProjectParentCombobox, PROJECT_PARENT_NONE_LABEL } from './project-parent-combobox';

function formatParentLabel(project: NonNullable<ProjectDetail['parentProject']>) {
  return `${project.code} — ${project.name}`;
}

/** API `parseApiFormError` renvoie un objet `{ message }`, pas `Error`. */
function parentUpdateErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return 'Impossible de mettre à jour le projet parent.';
}

/** Choix / affichage du projet parent (fiche projet, formulaires). */
export function ProjectParentField({ project }: { project: ProjectDetail }) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const { data: liveProject } = useProjectDetailQuery(project.id);
  const effectiveProject = liveProject ?? project;

  const [errorText, setErrorText] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (parentProjectId: string | null) =>
      updateProject(authFetch, project.id, { parentProjectId }),
    onSuccess: (updated) => {
      setErrorText(null);
      queryClient.setQueryData(projectQueryKeys.detail(clientId, project.id), updated);
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list(clientId, {}) });
    },
  });

  const handleParentChange = useCallback(
    (parentProjectId: string | null) => {
      const currentParentId = effectiveProject.parentProject?.id ?? null;
      if (parentProjectId === currentParentId) return;

      void mutation
        .mutateAsync(parentProjectId)
        .catch((err: unknown) => {
          const message = parentUpdateErrorMessage(err);
          setErrorText(message);
          toast.error(message);
        });
    },
    [effectiveProject.parentProject?.id, mutation],
  );

  if (canEdit) {
    return (
      <ProjectParentCombobox
        label="Projet parent"
        value={effectiveProject.parentProject?.id ?? null}
        excludeProjectId={effectiveProject.id}
        currentParent={effectiveProject.parentProject ?? null}
        disabled={mutation.isPending}
        errorText={errorText}
        onValueChange={handleParentChange}
        hint="Sélectionnez un projet parent ou « Aucun projet parent » pour une racine."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">Projet parent</p>
      {effectiveProject.parentProject ? (
        <Link
          href={projectDetail(effectiveProject.parentProject.id)}
          className="text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {formatParentLabel(effectiveProject.parentProject)}
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">{PROJECT_PARENT_NONE_LABEL}</p>
      )}
    </div>
  );
}

/** @deprecated Utiliser `ProjectParentField`. */
export const ProjectParentEditField = ProjectParentField;
