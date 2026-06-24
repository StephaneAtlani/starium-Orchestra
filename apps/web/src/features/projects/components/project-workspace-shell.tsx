'use client';

import { type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { AlertCircle, Share2 } from 'lucide-react';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { ProjectSynthesisBanner } from './project-synthesis-banner';
import { ProjectsListRowActionsMenu } from './projects-list-row-actions-menu';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';

export interface ProjectWorkspaceShellProps {
  projectId: string;
  children: ReactNode;
  /** Actions supplémentaires dans le bandeau (ex. soumission cycle). */
  bannerExtraActions?: ReactNode;
  /** Contenu entre les alertes et le corps de page. */
  afterAlerts?: ReactNode;
}

/**
 * Chrome commun espace projet : bandeau synthèse, onglets, contenu.
 */
export function ProjectWorkspaceShell({
  projectId,
  children,
  bannerExtraActions,
  afterAlerts,
}: ProjectWorkspaceShellProps) {
  const { data: project, isLoading, error } = useProjectDetailQuery(projectId);

  if (!projectId) {
    return <p className="text-sm text-destructive">Identifiant de projet manquant.</p>;
  }

  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (error || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle aria-hidden />
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col">
      <ProjectSynthesisBanner
        project={project}
        shareAction={
          <ResourceAclTriggerButton
            resourceType="PROJECT"
            resourceId={project.id}
            resourceLabel={project.name}
            variant="outline"
            size="sm"
            label="Partager"
            leadingIcon={Share2}
            alwaysShowLabel
            className="starium-btn starium-btn-secondary h-auto min-h-0 px-[15px] py-[9px] shadow-none"
          />
        }
        moreActions={
          <>
            {bannerExtraActions}
            <ProjectsListRowActionsMenu project={project} />
          </>
        }
      />

      <ProjectWorkspaceTabs
        projectId={projectId}
        projectStatus={project.status}
        presentation="bar"
      />

      {afterAlerts}

      <div className="flex w-full min-w-0 flex-col">{children}</div>
    </div>
  );
}
