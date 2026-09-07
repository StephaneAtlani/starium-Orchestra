'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { projectDetail, projectReviewConduct } from '../constants/project-routes';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
} from '../lib/project-review-post-mortem';
import { ProjectReviewsContextBanner } from './project-reviews-context-banner';

/**
 * Bandeau REX sur l’onglet Aperçu — CTA vers la page du point, pas une modale.
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

  const searchParams = useSearchParams();
  const router = useRouter();
  const openedOpenReviewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!postMortemEligible) return;
    const id = searchParams.get('openReview');
    if (!id?.trim()) {
      openedOpenReviewRef.current = null;
      return;
    }
    if (openedOpenReviewRef.current === id) return;
    openedOpenReviewRef.current = id;
    router.replace(projectReviewConduct(projectId, id));
  }, [searchParams, router, postMortemEligible, projectId]);

  if (!postMortemEligible) return null;

  const onPrimaryAction = () => {
    if (draftPostMortem) {
      router.push(projectReviewConduct(projectId, draftPostMortem.id));
      return;
    }
    router.push(`${projectDetail(projectId)}?tab=points&createRetourExperience=1`, {
      scroll: false,
    });
  };

  return (
    <ProjectReviewsContextBanner
      postMortemEligible
      finalizedPostMortem={finalizedPostMortem}
      draftPostMortem={draftPostMortem}
      canEdit={canEdit}
      onPrimaryAction={onPrimaryAction}
      variant="overview"
    />
  );
}
