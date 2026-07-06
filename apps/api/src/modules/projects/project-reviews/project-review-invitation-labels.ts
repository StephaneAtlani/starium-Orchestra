import type {
  ProjectReviewMeetingMode,
  ProjectReviewType,
} from '@prisma/client';

const REVIEW_TYPE_LABEL: Record<ProjectReviewType, string> = {
  COPIL: 'COPIL',
  COPRO: 'COPRO',
  CODIR_REVIEW: 'Revue CODIR',
  RISK_REVIEW: 'Revue risques',
  MILESTONE_REVIEW: 'Revue jalon',
  AD_HOC: 'Point ad hoc',
  POST_MORTEM: "Retour d'expérience",
  PROJECT_REVIEW: 'Revue projet',
  BUDGET_REVIEW: 'Revue budget',
  ARBITRATION: 'Arbitrage',
  CRISIS_POINT: 'Point de crise',
  OTHER: 'Autre',
};

const MEETING_MODE_LABEL: Record<ProjectReviewMeetingMode, string> = {
  REMOTE: 'Visio',
  ONSITE: 'Présentiel',
  HYBRID: 'Hybride',
};

function formatReviewDateFr(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

export function buildProjectReviewInvitationTitle(
  projectName: string,
): string {
  return `Point projet planifié — ${projectName}`;
}

export function buildProjectReviewInvitationMessage(input: {
  reviewType: ProjectReviewType;
  reviewDate: Date;
  meetingMode: ProjectReviewMeetingMode | null;
  location: string | null;
}): string {
  const typeLabel = REVIEW_TYPE_LABEL[input.reviewType] ?? input.reviewType;
  const dateLabel = formatReviewDateFr(input.reviewDate);
  const parts = [typeLabel, dateLabel];

  if (input.meetingMode) {
    parts.push(MEETING_MODE_LABEL[input.meetingMode] ?? input.meetingMode);
  }

  if (
    input.meetingMode === 'ONSITE' ||
    input.meetingMode === 'HYBRID'
  ) {
    if (input.location?.trim()) {
      parts.push(input.location.trim());
    }
  }

  if (input.meetingMode === 'REMOTE' || input.meetingMode === 'HYBRID') {
    parts.push('Lien de réunion disponible dans le point projet');
  }

  return parts.join(' · ');
}

export function buildProjectReviewEntityLabel(input: {
  title: string | null;
  reviewType: ProjectReviewType;
}): string {
  if (input.title?.trim()) return input.title.trim();
  return REVIEW_TYPE_LABEL[input.reviewType] ?? input.reviewType;
}

export function buildProjectReviewInvitationActionUrl(
  projectId: string,
  reviewId: string,
): string {
  return `/projects/${projectId}?openReview=${reviewId}`;
}

export function buildProjectReviewInvitationMetadata(input: {
  projectId: string;
  reviewId: string;
  reviewDate: Date;
  meetingMode: ProjectReviewMeetingMode | null;
  location: string | null;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    projectId: input.projectId,
    reviewId: input.reviewId,
    reviewDate: input.reviewDate.toISOString(),
  };
  if (input.meetingMode) {
    metadata.meetingMode = input.meetingMode;
  }
  if (input.location?.trim()) {
    metadata.location = input.location.trim();
  }
  return metadata;
}
