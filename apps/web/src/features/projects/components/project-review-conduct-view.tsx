'use client';

import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { projectPointsTab } from '../constants/project-routes';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { isReviewFinalizedOrCancelled } from '../lib/project-review-status';
import { ProjectReviewDocumentView } from './project-review-document-view';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';

type Props = {
  projectId: string;
  reviewId: string;
};

/**
 * Page unique du point : éditeur tant qu’il n’est pas figé, document ensuite.
 * Tous les statuts restent sur `/reviews/:id`.
 */
export function ProjectReviewConductView({ projectId, reviewId }: Props) {
  const router = useRouter();
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const detailQuery = useProjectReviewDetailQuery(projectId, reviewId || null);

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

  if (isReviewFinalizedOrCancelled(detailQuery.data.status)) {
    return (
      <ProjectReviewDocumentView
        projectId={projectId}
        review={detailQuery.data}
        canEdit={canEdit}
      />
    );
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
