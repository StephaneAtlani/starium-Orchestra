import {
  ProjectReviewStatus,
  type ProjectReviewDescentStatus,
} from '@prisma/client';
import {
  canInjectIntoTargetAgenda,
  resolveNextCopilTarget,
  reviewTitleLabel,
  type CopilTargetCandidate,
} from './project-review-escalations';

export { canInjectIntoTargetAgenda, reviewTitleLabel };

export const COPRO_DESCENT_TARGET_STATUSES: ProjectReviewStatus[] = [
  ProjectReviewStatus.PREPARING,
  ProjectReviewStatus.SCHEDULED,
  ProjectReviewStatus.IN_PROGRESS,
];

export type CoproTargetCandidate = CopilTargetCandidate;

/**
 * Choisit le prochain COPRO : même algo que resolveNextCopilTarget
 * (date la plus proche ≥ source, sinon premier sans date).
 */
export function resolveNextCoproTarget(
  candidates: CoproTargetCandidate[],
  sourceDate: Date | null,
): CoproTargetCandidate | null {
  return resolveNextCopilTarget(candidates, sourceDate);
}

export function buildDescentAgendaDescription(input: {
  sourceReviewTitle: string;
  sourceReviewDateLabel: string | null;
  summary: string | null;
}): string {
  const head = input.sourceReviewDateLabel
    ? `Descente depuis ${input.sourceReviewTitle} · ${input.sourceReviewDateLabel}`
    : `Descente depuis ${input.sourceReviewTitle}`;
  const lines: string[] = [head];
  if (input.summary?.trim()) {
    lines.push(input.summary.trim());
  }
  return lines.join('\n');
}

export function descentStatusLabel(
  status: ProjectReviewDescentStatus | string,
): string {
  switch (status) {
    case 'INJECTED':
      return 'Injectée dans l’ODJ COPROJ';
    case 'CANCELLED':
      return 'Annulée';
    case 'PENDING':
    default:
      return 'En attente du prochain COPROJ';
  }
}
