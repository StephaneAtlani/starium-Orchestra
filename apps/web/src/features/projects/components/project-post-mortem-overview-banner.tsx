'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { projectDetail } from '../constants/project-routes';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
} from '../lib/project-review-post-mortem';
import { ProjectReviewEditorDialog } from './project-review-editor-dialog';
import { ProjectReviewsContextBanner } from './project-reviews-context-banner';

/**
 * Bandeau REX sur l’onglet Aperçu — CTA prioritaire + éditeur sans quitter la synthèse.
 */
export function ProjectPostMortemOverviewBanner({
  projectId,
  projectStatus,
}: {
  projectId: string;
  projectStatus: string;
}) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const postMortemEligible = isPostMortemEligibleProjectStatus(projectStatus);

  const list = useProjectReviewsQuery(projectId, { enabled: postMortemEligible });
  const draftPostMortem = useMemo(
    () => findDraftPostMortemReview(list.data),
    [list.data],
  );
  const finalizedPostMortem = useMemo(
    () => hasFinalizedPostMortemReview(list.data),
    [list.data],
  );

  const [editorReviewId, setEditorReviewId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const openedOpenReviewRef = useRef<string | null>(null);

  const openEditor = useCallback((id: string) => {
    setEditorReviewId(id);
    setEditorOpen(true);
  }, []);

  /** Lien direct : `?openReview=<id>` depuis l’aperçu. */
  useEffect(() => {
    if (!postMortemEligible) return;
    const id = searchParams.get('openReview');
    if (!id?.trim()) {
      openedOpenReviewRef.current = null;
      return;
    }
    if (openedOpenReviewRef.current === id) return;
    openedOpenReviewRef.current = id;
    openEditor(id);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('openReview');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, openEditor, postMortemEligible]);

  if (!postMortemEligible) return null;

  const onPrimaryAction = () => {
    if (draftPostMortem) {
      openEditor(draftPostMortem.id);
      return;
    }
    router.push(`${projectDetail(projectId)}?tab=points&createRetourExperience=1`, {
      scroll: false,
    });
  };

  return (
    <>
      <ProjectReviewsContextBanner
        postMortemEligible
        finalizedPostMortem={finalizedPostMortem}
        draftPostMortem={draftPostMortem}
        canEdit={canEdit}
        onPrimaryAction={onPrimaryAction}
        variant="overview"
      />

      <ProjectReviewEditorDialog
        projectId={projectId}
        reviewId={editorReviewId}
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditorReviewId(null);
        }}
        canEdit={canEdit}
      />
    </>
  );
}
