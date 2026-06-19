'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { AccessExplainerPopover } from '@/features/access-diagnostics/components/access-explainer-popover';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, ChevronRight, ClipboardList, Share2 } from 'lucide-react';
import { WARNING_CODE_LABEL } from '../constants/project-enum-labels';
import { projectDetail, projectsList } from '../constants/project-routes';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
} from '../lib/project-review-post-mortem';
import { ProjectPortfolioBadges } from './project-badges';
import { ProjectSynthesisBanner } from './project-synthesis-banner';
import { ProjectsListRowActionsMenu } from './projects-list-row-actions-menu';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import type { ProjectDetail } from '../types/project.types';

export interface ProjectWorkspaceShellProps {
  projectId: string;
  children: ReactNode;
  /** Actions supplémentaires dans le bandeau (ex. soumission cycle). */
  bannerExtraActions?: ReactNode;
  /** Contenu entre les alertes et le corps de page. */
  afterAlerts?: ReactNode;
}

function ProjectWorkspaceRexCta({
  projectId,
  project,
  canUpdateProject,
}: {
  projectId: string;
  project: ProjectDetail;
  canUpdateProject: boolean;
}) {
  const showPostMortemHeaderCta =
    isPostMortemEligibleProjectStatus(project.status) && canUpdateProject;

  const reviewsForRexCta = useProjectReviewsQuery(projectId, {
    enabled: showPostMortemHeaderCta,
  });

  const draftRexForHeader = useMemo(
    () => findDraftPostMortemReview(reviewsForRexCta.data),
    [reviewsForRexCta.data],
  );

  const rexHeaderHref = useMemo(
    () =>
      draftRexForHeader
        ? `${projectDetail(projectId)}?tab=points&openReview=${draftRexForHeader.id}`
        : `${projectDetail(projectId)}?tab=points&createRetourExperience=1`,
    [projectId, draftRexForHeader],
  );

  const hideBecauseFinalized =
    reviewsForRexCta.isSuccess &&
    hasFinalizedPostMortemReview(reviewsForRexCta.data) &&
    !findDraftPostMortemReview(reviewsForRexCta.data);

  if (!showPostMortemHeaderCta || hideBecauseFinalized) return null;

  return (
    <div className="w-full sm:max-w-sm">
      {reviewsForRexCta.isLoading ? (
        <div
          className="flex h-14 w-full animate-pulse rounded-lg border border-violet-500/30 bg-muted/40 dark:border-violet-400/25"
          aria-hidden
        />
      ) : (
        <Link
          href={rexHeaderHref}
          scroll={false}
          className={cn(
            'group flex w-full items-center gap-2 rounded-lg border px-3 py-2 shadow-sm transition-all',
            'border-violet-500/50 bg-gradient-to-br from-violet-500/15 via-violet-500/[0.07] to-card',
            'dark:border-violet-400/45 dark:from-violet-400/20 dark:via-violet-500/10 dark:to-card',
            'hover:border-violet-500/70 hover:shadow-md hover:from-violet-500/20',
            'dark:hover:border-violet-400/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2',
          )}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm dark:bg-violet-500"
            aria-hidden
          >
            <ClipboardList className="size-4" strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-semibold leading-tight tracking-tight text-foreground">
              {draftRexForHeader
                ? "Continuer le retour d'expérience"
                : "Créer un retour d'expérience"}
            </span>
            <span className="mt-0.5 block text-[0.7rem] leading-snug text-muted-foreground">
              {draftRexForHeader
                ? 'Reprendre le brouillon en cours'
                : 'Objectifs, écarts, leçons — clôture de projet'}
            </span>
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-violet-600 opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-violet-400"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}

/**
 * Chrome commun espace projet : fil d’Ariane, bandeau synthèse, onglets, alertes.
 * Le contenu de chaque section (Aperçu, Fiche, Planning…) se rend en `children` en dessous.
 */
export function ProjectWorkspaceShell({
  projectId,
  children,
  bannerExtraActions,
  afterAlerts,
}: ProjectWorkspaceShellProps) {
  const { data: project, isLoading, error } = useProjectDetailQuery(projectId);
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const { has } = usePermissions();
  const canUpdateProject = has('projects.update');

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

  const showSignals =
    project.signals.isLate ||
    project.signals.isBlocked ||
    project.signals.isCritical ||
    project.signals.hasNoOwner ||
    project.signals.hasPlanningDrift;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <nav
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Fil d'Ariane"
      >
        <Link href={projectsList()} className="hover:text-foreground">
          Pilotage
        </Link>
        <span aria-hidden>/</span>
        <Link href={projectsList()} className="hover:text-foreground">
          Projets
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{project.name}</span>
      </nav>

      <ProjectSynthesisBanner
        project={project}
        shareAction={
          <ResourceAclTriggerButton
            resourceType="PROJECT"
            resourceId={project.id}
            resourceLabel={project.name}
            size="sm"
            label="Partager"
            leadingIcon={Share2}
            alwaysShowLabel
            className="min-h-10 gap-1.5"
          />
        }
        moreActions={
          <>
            {bannerExtraActions}
            <AccessExplainerPopover
              resourceType="PROJECT"
              resourceId={project.id}
              resourceLabel={project.name}
              intent="READ"
              iconOnly
            />
            <ProjectsListRowActionsMenu project={project} />
          </>
        }
      />

      <ProjectWorkspaceTabs
        projectId={projectId}
        projectStatus={project.status}
        presentation="bar"
      />

      {showSignals ? (
        <div className="flex flex-wrap gap-2" aria-label="Signaux portefeuille">
          <ProjectPortfolioBadges signals={project.signals} merged={badgeMerged} />
        </div>
      ) : null}

      <ProjectWorkspaceRexCta
        projectId={projectId}
        project={project}
        canUpdateProject={canUpdateProject}
      />

      {project.warnings.length > 0 ? (
        <Alert
          className="border-amber-500/35 bg-amber-500/5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-600"
          role="status"
        >
          <AlertTriangle className="text-amber-800 dark:text-amber-600" aria-hidden />
          <AlertTitle className="font-semibold text-amber-950 dark:text-amber-600">
            Alertes projet
          </AlertTitle>
          <AlertDescription className="text-amber-950/95 dark:text-amber-600/95">
            {project.warnings.map((w) => WARNING_CODE_LABEL[w] ?? w).join(' · ')}
          </AlertDescription>
        </Alert>
      ) : null}

      {afterAlerts}

      <div className="flex w-full min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
}
