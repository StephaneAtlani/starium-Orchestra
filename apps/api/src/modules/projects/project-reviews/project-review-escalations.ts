import {
  ProjectReviewStatus,
  ProjectReviewType,
  type ProjectReviewEscalationStatus,
} from '@prisma/client';

export const COPIL_ESCALATION_TARGET_STATUSES: ProjectReviewStatus[] = [
  ProjectReviewStatus.PREPARING,
  ProjectReviewStatus.SCHEDULED,
  ProjectReviewStatus.IN_PROGRESS,
];

export type CopilTargetCandidate = {
  id: string;
  reviewDate: Date | null;
  agendaLockedAt: Date | null;
  title: string | null;
};

/**
 * Choisit le prochain COPIL : date la plus proche ≥ source,
 * sinon premier sans date (dernier recours).
 */
export function resolveNextCopilTarget(
  candidates: CopilTargetCandidate[],
  sourceDate: Date | null,
): CopilTargetCandidate | null {
  if (candidates.length === 0) return null;
  const withDate = candidates
    .filter((c) => c.reviewDate != null)
    .sort(
      (a, b) =>
        (a.reviewDate as Date).getTime() - (b.reviewDate as Date).getTime(),
    );
  const withoutDate = candidates.filter((c) => c.reviewDate == null);

  if (sourceDate) {
    const sourceTs = sourceDate.getTime();
    const upcoming = withDate.find(
      (c) => (c.reviewDate as Date).getTime() >= sourceTs,
    );
    if (upcoming) return upcoming;
  }

  if (withDate.length > 0) {
    // Pas de date future : prendre le plus proche dans le futur relatif, sinon le dernier daté.
    if (sourceDate) {
      const past = [...withDate].reverse();
      return past[0] ?? withoutDate[0] ?? null;
    }
    return withDate[0];
  }

  return withoutDate[0] ?? null;
}

export function canInjectIntoTargetAgenda(
  agendaLockedAt: Date | null | undefined,
): boolean {
  return agendaLockedAt == null;
}

export function buildEscalationAgendaDescription(input: {
  sourceReviewTitle: string;
  sourceReviewDateLabel: string | null;
  sourceAgendaTitle: string | null;
  summary: string | null;
}): string {
  const lines: string[] = [
    `Remontée depuis ${input.sourceReviewTitle}`,
  ];
  if (input.sourceReviewDateLabel) {
    lines.push(`Séance du ${input.sourceReviewDateLabel}`);
  }
  if (input.sourceAgendaTitle) {
    lines.push(`Point d’origine : ${input.sourceAgendaTitle}`);
  }
  if (input.summary?.trim()) {
    lines.push(input.summary.trim());
  }
  return lines.join('\n');
}

export function reviewTitleLabel(
  title: string | null | undefined,
  reviewType: ProjectReviewType | string,
  fallback = 'Point projet',
): string {
  const t = title?.trim();
  if (t) return t;
  if (reviewType === ProjectReviewType.COPIL || reviewType === 'COPIL') {
    return 'COPIL';
  }
  if (reviewType === ProjectReviewType.COPRO || reviewType === 'COPRO') {
    return 'COPROJ';
  }
  return fallback;
}

export function escalationStatusLabel(
  status: ProjectReviewEscalationStatus | string,
): string {
  switch (status) {
    case 'INJECTED':
      return 'Injectée dans l’ODJ COPIL';
    case 'CANCELLED':
      return 'Annulée';
    case 'PENDING':
    default:
      return 'En attente du prochain COPIL';
  }
}
