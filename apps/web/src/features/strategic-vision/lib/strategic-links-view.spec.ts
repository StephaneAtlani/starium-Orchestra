import { describe, expect, it } from 'vitest';
import { buildStrategicProjectLinkRows } from './strategic-links-view';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';

describe('buildStrategicProjectLinkRows', () => {
  it('retient uniquement les liens PROJECT et affiche targetLabelSnapshot', () => {
    const objectives: StrategicObjectiveDto[] = [
      {
        id: 'obj-1',
        clientId: 'c1',
        axisId: 'axis-1',
        title: 'Objectif A',
        description: null,
        ownerLabel: 'DSI',
        directionId: null,
        direction: null,
        status: 'ON_TRACK',
        deadline: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        links: [
          {
            id: 'l-1',
            clientId: 'c1',
            objectiveId: 'obj-1',
            linkType: 'PROJECT',
            targetId: 'proj-uuid-1',
            targetLabelSnapshot: 'Migration ERP',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'l-2',
            clientId: 'c1',
            objectiveId: 'obj-1',
            linkType: 'RISK',
            targetId: 'risk-uuid-9',
            targetLabelSnapshot: 'Risque cybers',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ];

    const rows = buildStrategicProjectLinkRows(objectives);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: 'l-1',
      objectiveTitle: 'Objectif A',
      targetLabelSnapshot: 'Migration ERP',
    });
    expect(JSON.stringify(rows)).not.toContain('proj-uuid-1');
  });
});
