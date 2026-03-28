import type { ProjectReviewListItem, ProjectReviewType } from '../types/project.types';

/**
 * Brouillon de retour d'expérience non finalisé (le plus récemment mis à jour si plusieurs).
 */
export function findDraftPostMortemReview(
  items: ProjectReviewListItem[] | undefined,
): ProjectReviewListItem | null {
  if (!items?.length) return null;
  const drafts = items.filter(
    (r) => r.reviewType === 'POST_MORTEM' && r.status === 'DRAFT',
  );
  if (!drafts.length) return null;
  drafts.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return drafts[0] ?? null;
}

/** Au moins un retour d'expérience figé — plus de CTA « créer / continuer » sur la synthèse. */
export function hasFinalizedPostMortemReview(
  items: ProjectReviewListItem[] | undefined,
): boolean {
  if (!items?.length) return false;
  return items.some(
    (r) => r.reviewType === 'POST_MORTEM' && r.status === 'FINALIZED',
  );
}

/** Statuts projet pour lesquels seuls des retours d'expérience peuvent être créés (nouveaux points). */
export const POST_MORTEM_ELIGIBLE_PROJECT_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;

export function isPostMortemEligibleProjectStatus(status: string): boolean {
  return (POST_MORTEM_ELIGIBLE_PROJECT_STATUSES as readonly string[]).includes(status);
}

/** Types de revue de pilotage (hors retour d'expérience). */
export const REVIEW_TYPES_PILOTAGE: ProjectReviewType[] = [
  'COPIL',
  'COPRO',
  'CODIR_REVIEW',
  'RISK_REVIEW',
  'MILESTONE_REVIEW',
  'AD_HOC',
];

/**
 * Options du sélecteur « type de revue » selon le statut projet et le type courant
 * (grand-père : brouillon COPIL sur projet déjà clos → COPIL + retour d'expérience).
 */
export function getReviewTypeOptionsForEditor(
  projectStatus: string | undefined,
  currentReviewType: ProjectReviewType,
): ProjectReviewType[] {
  const eligible = projectStatus
    ? isPostMortemEligibleProjectStatus(projectStatus)
    : false;
  if (!eligible) {
    return [...REVIEW_TYPES_PILOTAGE];
  }
  if (currentReviewType === 'POST_MORTEM') {
    return ['POST_MORTEM'];
  }
  return [currentReviewType, 'POST_MORTEM'];
}
