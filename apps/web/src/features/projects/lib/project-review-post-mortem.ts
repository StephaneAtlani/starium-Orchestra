import type { ProjectReviewType } from '../types/project.types';

/** Statuts projet pour lesquels seuls des post-mortems peuvent être créés (nouveaux points). */
export const POST_MORTEM_ELIGIBLE_PROJECT_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;

export function isPostMortemEligibleProjectStatus(status: string): boolean {
  return (POST_MORTEM_ELIGIBLE_PROJECT_STATUSES as readonly string[]).includes(status);
}

/** Types de revue de pilotage (hors post-mortem). */
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
 * (grand-père : brouillon COPIL sur projet déjà clos → COPIL + POST_MORTEM).
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
