import { describe, expect, it } from 'vitest';
import {
  formatVisionWorkflowDateTime,
  hasVisionWorkflowContent,
  partitionStrategicVisions,
} from './strategic-vision-workflow';
import type { StrategicVisionDto } from '../types/strategic-vision.types';

function vision(overrides: Partial<StrategicVisionDto>): StrategicVisionDto {
  return {
    id: 'v1',
    clientId: 'c1',
    title: 'Vision 2026',
    statement: 'Statement',
    horizonLabel: '2026-2030',
    isActive: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    axes: [],
    ...overrides,
  };
}

describe('strategic-vision-workflow', () => {
  it('hasVisionWorkflowContent retourne true si droits de gestion', () => {
    expect(hasVisionWorkflowContent([], true, false)).toBe(true);
    expect(hasVisionWorkflowContent([], false, true)).toBe(true);
  });

  it('partitionStrategicVisions sépare actif, brouillons et archives', () => {
    const result = partitionStrategicVisions([
      vision({ id: 'a', isActive: true, title: 'Active', updatedAt: '2026-03-01T00:00:00.000Z' }),
      vision({ id: 'd', title: 'Draft', updatedAt: '2026-02-01T00:00:00.000Z' }),
      vision({
        id: 'r',
        title: 'ARCHIVE · Old',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);

    expect(result.activeVision?.id).toBe('a');
    expect(result.draftVisions.map((item) => item.id)).toEqual(['d']);
    expect(result.archivedVisions.map((item) => item.id)).toEqual(['r']);
  });

  it('formatVisionWorkflowDateTime formate en locale fr', () => {
    expect(formatVisionWorkflowDateTime('invalid')).toBe('Non défini');
    expect(formatVisionWorkflowDateTime('2026-01-15T10:30:00.000Z')).toContain('2026');
  });
});
