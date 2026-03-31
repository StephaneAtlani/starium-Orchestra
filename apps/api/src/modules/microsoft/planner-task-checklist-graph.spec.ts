import { buildPlannerChecklistPatchBody } from './planner-task-checklist-graph';

describe('planner-task-checklist-graph', () => {
  it('aligne les lignes Starium et met null sur les clés Graph orphelines', () => {
    const patch = buildPlannerChecklistPatchBody(
      [
        {
          title: 'A',
          isChecked: false,
          sortOrder: 0,
          plannerChecklistItemKey: '11111111-1111-1111-1111-111111111111',
        },
      ],
      {
        '11111111-1111-1111-1111-111111111111': { title: 'Old' },
        '22222222-2222-2222-2222-222222222222': { title: 'Ghost' },
      },
    );
    expect(patch['22222222-2222-2222-2222-222222222222']).toBeNull();
    expect(patch['11111111-1111-1111-1111-111111111111']).toMatchObject({
      '@odata.type': 'microsoft.graph.plannerChecklistItem',
      title: 'A',
      isChecked: false,
    });
  });
});
