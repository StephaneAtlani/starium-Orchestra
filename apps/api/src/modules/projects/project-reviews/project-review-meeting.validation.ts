import { BadRequestException } from '@nestjs/common';
import type { ProjectReviewMeetingMode } from '@prisma/client';
import { ProjectReviewStatus } from '@prisma/client';

export const PROJECT_REVIEW_MEETING_MODE_VALUES = [
  'REMOTE',
  'ONSITE',
  'HYBRID',
] as const;

export const PROJECT_REVIEW_CREATION_MODE_VALUES = [
  'PREPARING',
  'SCHEDULED',
  'IMMEDIATE',
  /** Legacy — mappé vers SCHEDULED */
  'PLANNED',
] as const;

export type ProjectReviewCreationMode =
  (typeof PROJECT_REVIEW_CREATION_MODE_VALUES)[number];

export function resolveCreationStatus(
  creationMode: ProjectReviewCreationMode | undefined,
): ProjectReviewStatus {
  switch (creationMode) {
    case 'SCHEDULED':
    case 'PLANNED':
      return ProjectReviewStatus.SCHEDULED;
    case 'IMMEDIATE':
      return ProjectReviewStatus.IN_PROGRESS;
    case 'PREPARING':
    default:
      return ProjectReviewStatus.PREPARING;
  }
}

export function assertValidMeetingUrl(url: string | undefined | null): void {
  if (url == null || url.trim() === '') return;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new BadRequestException('URL de réunion invalide');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException(
      'URL de réunion invalide : seuls les protocoles http et https sont autorisés',
    );
  }
}

export function assertMeetingFieldsCoherence(
  meetingMode: ProjectReviewMeetingMode | null | undefined,
  meetingUrl: string | null | undefined,
  location: string | null | undefined,
): void {
  const url = meetingUrl?.trim();
  const loc = location?.trim();
  const mode = meetingMode ?? null;

  if (url && mode !== 'REMOTE' && mode !== 'HYBRID') {
    throw new BadRequestException(
      'Un lien de réunion nécessite un mode Visio (REMOTE) ou Hybride (HYBRID)',
    );
  }
  if (loc && mode !== 'ONSITE' && mode !== 'HYBRID') {
    throw new BadRequestException(
      'Un lieu nécessite un mode Présentiel (ONSITE) ou Hybride (HYBRID)',
    );
  }
}
