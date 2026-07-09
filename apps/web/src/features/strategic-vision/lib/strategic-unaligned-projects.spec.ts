import { describe, expect, it } from 'vitest';
import {
  extractUnalignedProjectListItems,
  parseStrategicAlertProjectId,
  resolveCockpitUnalignedProjectsCount,
} from './strategic-unaligned-projects';
import type { StrategicVisionAlertDto } from '../types/strategic-vision.types';

function alert(
  overrides: Partial<StrategicVisionAlertDto> & Pick<StrategicVisionAlertDto, 'id' | 'type'>,
): StrategicVisionAlertDto {
  return {
    severity: 'MEDIUM',
    targetType: 'PROJECT',
    directionId: null,
    directionName: 'Non affecté',
    targetLabel: 'PRJ-01 - Portail',
    message: 'Projet non aligné',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('strategic-unaligned-projects', () => {
  it('parseStrategicAlertProjectId extrait l’id projet', () => {
    expect(parseStrategicAlertProjectId('strategic-project-unaligned:p-123')).toBe('p-123');
  });

  it('parseStrategicAlertProjectId rejette les ids invalides', () => {
    expect(parseStrategicAlertProjectId('strategic-objective-overdue:o-1')).toBeNull();
    expect(parseStrategicAlertProjectId('strategic-project-unaligned:')).toBeNull();
  });

  it('extractUnalignedProjectListItems filtre et trie les alertes projet', () => {
    const items = extractUnalignedProjectListItems([
      alert({
        id: 'strategic-project-unaligned:p-2',
        type: 'PROJECT_UNALIGNED',
        targetLabel: 'B - Beta',
      }),
      alert({
        id: 'strategic-objective-overdue:o-1',
        type: 'OBJECTIVE_OVERDUE',
        targetLabel: 'Objectif',
      }),
      alert({
        id: 'strategic-project-unaligned:p-1',
        type: 'PROJECT_UNALIGNED',
        targetLabel: 'A - Alpha',
      }),
    ]);

    expect(items).toEqual([
      { projectId: 'p-1', label: 'A - Alpha' },
      { projectId: 'p-2', label: 'B - Beta' },
    ]);
  });

  it('resolveCockpitUnalignedProjectsCount respecte le filtre direction', () => {
    const kpisByDirection = {
      rows: [
        { directionId: 'd-1', unalignedProjectsCount: 3 },
        { directionId: null, unalignedProjectsCount: 2 },
      ],
      global: { unalignedProjectsCount: 5 },
      generatedAt: '',
    };

    expect(resolveCockpitUnalignedProjectsCount('ALL', undefined, kpisByDirection as never)).toBe(5);
    expect(resolveCockpitUnalignedProjectsCount('d-1', undefined, kpisByDirection as never)).toBe(3);
    expect(resolveCockpitUnalignedProjectsCount('UNASSIGNED', undefined, kpisByDirection as never)).toBe(2);
  });
});
