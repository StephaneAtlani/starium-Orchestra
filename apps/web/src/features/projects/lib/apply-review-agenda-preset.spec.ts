import { describe, expect, it, vi } from 'vitest';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';
import {
  agendaApiItemsMatchPreset,
  applyAgendaPresetToReview,
  isAgendaCleanForReviewType,
} from './apply-review-agenda-preset';
import { getAgendaPresetForReviewType } from './project-review-agenda-presets';

function apiItem(
  partial: Partial<ProjectReviewAgendaItemApi> & Pick<ProjectReviewAgendaItemApi, 'id' | 'title'>,
): ProjectReviewAgendaItemApi {
  return {
    description: null,
    itemType: 'INFORMATION',
    objective: null,
    expectedDecision: null,
    orderIndex: 0,
    plannedDurationMinutes: null,
    ownerUserId: null,
    ownerDisplayName: null,
    status: 'TODO',
    notes: null,
    decisionSummary: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('apply-review-agenda-preset', () => {
  it('isAgendaCleanForReviewType accepte un ODJ vide', () => {
    expect(isAgendaCleanForReviewType([], 'COPIL')).toBe(true);
  });

  it('agendaApiItemsMatchPreset compare titre, description et type', () => {
    const preset = getAgendaPresetForReviewType('AD_HOC');
    const items = preset.map((row, index) =>
      apiItem({
        id: `item-${index}`,
        title: row.title,
        description: row.description,
        itemType: row.itemType,
        orderIndex: index,
      }),
    );
    expect(agendaApiItemsMatchPreset(items, preset)).toBe(true);
  });

  it('applyAgendaPresetToReview met à jour puis crée les points manquants', async () => {
    const createAgendaItem = vi.fn().mockResolvedValue({});
    const updateAgendaItem = vi.fn().mockResolvedValue({});

    const result = await applyAgendaPresetToReview(
      'review-1',
      'AD_HOC',
      [
        apiItem({
          id: 'existing-1',
          title: 'Ancien',
          orderIndex: 0,
        }),
      ],
      { createAgendaItem, updateAgendaItem },
    );

    expect(updateAgendaItem).toHaveBeenCalledTimes(1);
    expect(createAgendaItem).toHaveBeenCalledTimes(2);
    expect(result.extraItemsKept).toBe(0);
  });
});
