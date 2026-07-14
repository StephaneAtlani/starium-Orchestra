'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { projectPointsTab } from '../constants/project-routes';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { isReviewFinalizedOrCancelled, isReviewInConduct } from '../lib/project-review-status';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';

type Props = {
  projectId: string;
  reviewId: string;
};

/**
 * Espace plein écran pour la conduite d’un point projet `IN_PROGRESS`.
 * Les autres statuts sont renvoyés vers la fiche projet (modale d’édition).
 */
export function ProjectReviewConductView({ projectId, reviewId }: Props) {
  const router = useRouter();
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const detailQuery = useProjectReviewDetailQuery(projectId, reviewId || null);

  useEffect(() => {
    if (!projectId || !reviewId) return;
    if (detailQuery.isLoading) return;
    if (detailQuery.error || !detailQuery.data) return;
    const status = detailQuery.data.status;
    if (isReviewInConduct(status)) return;
    // Point finalisé/annulé (souvent juste après l'action de conduite) :
    // retour à la liste sans rouvrir l'éditeur sur un point désormais figé.
    if (isReviewFinalizedOrCancelled(status)) {
      router.replace(projectPointsTab(projectId));
      return;
    }
    // Autres statuts non-conduite encore éditables (planifié / en préparation) :
    // on rouvre l'éditeur pour reprendre la préparation.
    router.replace(`${projectPointsTab(projectId)}&openReview=${reviewId}`);
  }, [
    projectId,
    reviewId,
    detailQuery.isLoading,
    detailQuery.error,
    detailQuery.data,
    router,
  ]);

  if (!projectId || !reviewId) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Point projet introuvable.
      </p>
    );
  }

  if (detailQuery.isLoading) {
    return <LoadingState rows={8} />;
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Impossible de charger ce point projet.
      </p>
    );
  }

  if (!isReviewInConduct(detailQuery.data.status)) {
    return <LoadingState rows={4} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ProjectReviewEditorDialog
        surface="page"
        projectId={projectId}
        reviewId={reviewId}
        canEdit={canEdit}
        onExit={() => router.push(projectPointsTab(projectId))}
      />
    </div>
  );
}
