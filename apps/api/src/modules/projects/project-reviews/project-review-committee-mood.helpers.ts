import type { ComputedHealth } from '../projects.types';
import { ProjectReviewStatus } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { parseProjectReviewSnapshotPayload } from './project-review-report.builder';
import { parseCommitteeMood } from './project-reviews-snapshot.builder';

export type ProjectCommitteeMoodSummary = {
  committeeMood: ComputedHealth | null;
  committeeMoodReviewId: string | null;
  committeeMoodReviewTitle: string | null;
  committeeMoodReviewDate: string | null;
};

export type ProjectCommitteeMoodHistoryItem = {
  reviewId: string;
  title: string | null;
  reviewDate: string | null;
  reviewType: string;
  status: string;
  committeeMood: ComputedHealth;
};

const emptyCommitteeMoodSummary = (): ProjectCommitteeMoodSummary => ({
  committeeMood: null,
  committeeMoodReviewId: null,
  committeeMoodReviewTitle: null,
  committeeMoodReviewDate: null,
});

export function resolveCommitteeMoodFromReviewRecord(input: {
  contentPayload: unknown;
  snapshotPayload?: unknown | null;
}): ComputedHealth | null {
  const fromContent = parseCommitteeMood(input.contentPayload);
  if (fromContent) return fromContent;
  return (
    parseProjectReviewSnapshotPayload(input.snapshotPayload ?? null)?.review
      .committeeMood ?? null
  );
}

/** Météo du comité : point courant, sinon dernier point finalisé antérieur qui en avait une. */
export function resolveCommitteeMoodWithPreviousReviews(
  currentMood: ComputedHealth | null,
  previousReviews: Array<{
    contentPayload: unknown;
    snapshotPayload: unknown;
  }>,
): ComputedHealth | null {
  if (currentMood) return currentMood;
  for (const prev of previousReviews) {
    const mood = resolveCommitteeMoodFromReviewRecord(prev);
    if (mood) return mood;
  }
  return null;
}

function toCommitteeMoodSummary(
  review: {
    id: string;
    title: string | null;
    reviewDate: Date | null;
  },
  mood: ComputedHealth,
): ProjectCommitteeMoodSummary {
  return {
    committeeMood: mood,
    committeeMoodReviewId: review.id,
    committeeMoodReviewTitle: review.title?.trim() || null,
    committeeMoodReviewDate: review.reviewDate?.toISOString() ?? null,
  };
}

/** Dernière météo comité connue pour la synthèse projet (point en cours puis points finalisés). */
export async function loadLatestCommitteeMoodForProject(
  prisma: PrismaService,
  clientId: string,
  projectId: string,
): Promise<ProjectCommitteeMoodSummary> {
  const reviews = await prisma.projectReview.findMany({
    where: {
      clientId,
      projectId,
      status: {
        in: [
          ProjectReviewStatus.IN_PROGRESS,
          ProjectReviewStatus.IN_REVIEW,
          ProjectReviewStatus.FINALIZED,
        ],
      },
    },
    orderBy: [
      { reviewDate: 'desc' },
      { finalizedAt: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 32,
    select: {
      id: true,
      title: true,
      reviewDate: true,
      status: true,
      contentPayload: true,
      snapshotPayload: true,
    },
  });

  for (const review of reviews) {
    if (
      review.status !== ProjectReviewStatus.IN_PROGRESS &&
      review.status !== ProjectReviewStatus.IN_REVIEW
    ) {
      continue;
    }
    const mood = resolveCommitteeMoodFromReviewRecord(review);
    if (mood) return toCommitteeMoodSummary(review, mood);
  }

  for (const review of reviews) {
    if (review.status !== ProjectReviewStatus.FINALIZED) continue;
    const mood = resolveCommitteeMoodFromReviewRecord(review);
    if (mood) return toCommitteeMoodSummary(review, mood);
  }

  return emptyCommitteeMoodSummary();
}

/** Historique des météos comité renseignées sur les points projet (du plus récent au plus ancien). */
export async function loadCommitteeMoodHistoryForProject(
  prisma: PrismaService,
  clientId: string,
  projectId: string,
): Promise<ProjectCommitteeMoodHistoryItem[]> {
  const reviews = await prisma.projectReview.findMany({
    where: {
      clientId,
      projectId,
      status: {
        in: [
          ProjectReviewStatus.IN_PROGRESS,
          ProjectReviewStatus.IN_REVIEW,
          ProjectReviewStatus.FINALIZED,
        ],
      },
    },
    orderBy: [
      { reviewDate: 'desc' },
      { finalizedAt: 'desc' },
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      reviewDate: true,
      reviewType: true,
      status: true,
      contentPayload: true,
      snapshotPayload: true,
    },
  });

  const items: ProjectCommitteeMoodHistoryItem[] = [];
  for (const review of reviews) {
    const mood = resolveCommitteeMoodFromReviewRecord(review);
    if (!mood) continue;
    items.push({
      reviewId: review.id,
      title: review.title?.trim() || null,
      reviewDate: review.reviewDate?.toISOString() ?? null,
      reviewType: review.reviewType,
      status: review.status,
      committeeMood: mood,
    });
  }
  return items;
}
