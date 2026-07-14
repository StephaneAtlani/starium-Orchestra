import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewType,
} from '../types/project.types';
import {
  getAgendaPresetForReviewType,
  type ReviewAgendaPresetRow,
} from './project-review-agenda-presets';
import { sortReviewAgendaItems } from './review-agenda-utils';

export function agendaApiItemsMatchPreset(
  items: ProjectReviewAgendaItemApi[],
  preset: ReviewAgendaPresetRow[],
): boolean {
  const sorted = sortReviewAgendaItems(items);
  if (sorted.length !== preset.length) return false;
  return sorted.every((item, index) => {
    const expected = preset[index];
    return (
      item.title === expected.title &&
      (item.description ?? '') === expected.description &&
      item.itemType === expected.itemType
    );
  });
}

export function isAgendaCleanForReviewType(
  items: ProjectReviewAgendaItemApi[],
  reviewType: ProjectReviewType,
): boolean {
  if (items.length === 0) return true;
  const preset = getAgendaPresetForReviewType(reviewType);
  if (preset.length === 0) return false;
  return agendaApiItemsMatchPreset(items, preset);
}

type AgendaMutations = {
  createAgendaItem: (args: {
    reviewId: string;
    body: Record<string, unknown>;
  }) => Promise<unknown>;
  updateAgendaItem: (args: {
    reviewId: string;
    agendaItemId: string;
    body: Record<string, unknown>;
  }) => Promise<unknown>;
};

export async function applyAgendaPresetToReview(
  reviewId: string,
  reviewType: ProjectReviewType,
  existingItems: ProjectReviewAgendaItemApi[],
  mutations: AgendaMutations,
): Promise<{ extraItemsKept: number }> {
  const preset = getAgendaPresetForReviewType(reviewType);
  const sorted = sortReviewAgendaItems(existingItems);

  for (let index = 0; index < preset.length; index += 1) {
    const row = preset[index];
    const body = {
      title: row.title,
      description: row.description || null,
      itemType: row.itemType,
    };
    const existing = sorted[index];
    if (existing) {
      await mutations.updateAgendaItem({
        reviewId,
        agendaItemId: existing.id,
        body,
      });
    } else {
      await mutations.createAgendaItem({ reviewId, body });
    }
  }

  return { extraItemsKept: Math.max(0, sorted.length - preset.length) };
}
