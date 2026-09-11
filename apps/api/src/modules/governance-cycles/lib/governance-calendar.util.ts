import type { ProjectReviewType } from '@prisma/client';

const REVIEW_TYPE_LABEL: Record<string, string> = {
  COPIL: 'Point COPIL',
  COPRO: 'Point COPRO',
  CODIR_REVIEW: 'Point CODIR',
  RISK_REVIEW: 'Point risques',
  MILESTONE_REVIEW: 'Point jalons',
  AD_HOC: 'Point ad hoc',
  POST_MORTEM: "Retour d'expérience",
  PROJECT_REVIEW: 'Point projet',
  BUDGET_REVIEW: 'Revue budgétaire',
  ARBITRATION: 'Arbitrage',
  CRISIS_POINT: 'Point de crise',
  OTHER: 'Autre point',
};

export function parseCalendarRange(
  fromIso: string,
  toIso: string,
): { from: Date; to: Date } | { error: string } {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: 'from and to must be valid ISO dates' };
  }
  if (from.getTime() > to.getTime()) {
    return { error: 'from must be less than or equal to to' };
  }
  return { from, to };
}

export function projectReviewTypeLabel(
  reviewType: ProjectReviewType | string | null | undefined,
): string {
  if (!reviewType) return 'Point projet';
  return REVIEW_TYPE_LABEL[reviewType] ?? 'Point projet';
}

export function projectReviewCalendarTitle(input: {
  title: string | null | undefined;
  reviewType: ProjectReviewType | string;
  projectName: string | null | undefined;
}): string {
  const explicit = input.title?.trim();
  if (explicit) return explicit;
  const typeLabel = projectReviewTypeLabel(input.reviewType);
  const projectName = input.projectName?.trim();
  if (projectName) return `${typeLabel} — ${projectName}`;
  return typeLabel;
}

export function cycleInstanceCalendarTitle(input: {
  label: string | null | undefined;
  periodLabel: string | null | undefined;
  cycleName: string | null | undefined;
}): string {
  const label = input.label?.trim();
  if (label) return label;
  const period = input.periodLabel?.trim();
  const cycleName = input.cycleName?.trim();
  if (period && cycleName) return `${cycleName} — ${period}`;
  if (cycleName) return cycleName;
  if (period) return `Instance ${period}`;
  return 'Instance de cycle';
}

/** Filtre les IDs projet autorisés pour l’agrégat calendrier (tests / isolation). */
export function filterEventsByAuthorizedProjectIds<
  T extends { kind: string; projectId?: string | null },
>(events: T[], authorizedProjectIds: ReadonlySet<string>): T[] {
  return events.filter((event) => {
    if (event.kind !== 'PROJECT_REVIEW') return true;
    if (!event.projectId) return false;
    return authorizedProjectIds.has(event.projectId);
  });
}

export function isDateInInclusiveRange(
  date: Date,
  from: Date,
  to: Date,
): boolean {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}
