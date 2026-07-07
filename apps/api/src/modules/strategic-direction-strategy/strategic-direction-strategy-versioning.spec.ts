import {
  buildStrategyVersionSummaries,
  compareStrategicDirectionStrategies,
} from './strategic-direction-strategy-versioning';

describe('strategic-direction-strategy-versioning', () => {
  it('ordonne les versions archivées puis la version active', () => {
    const versions = buildStrategyVersionSummaries(
      [
        {
          id: 'current',
          status: 'APPROVED',
          title: 'Stratégie actuelle',
          archivedAt: null,
          archivedReason: null,
          approvedAt: new Date('2026-03-01'),
          updatedAt: new Date('2026-03-01'),
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'v1',
          status: 'ARCHIVED',
          title: 'Ancienne',
          archivedAt: new Date('2026-02-01'),
          archivedReason: 'Adaptation',
          approvedAt: new Date('2026-01-15'),
          updatedAt: new Date('2026-02-01'),
          createdAt: new Date('2026-01-01'),
        },
      ],
      'current',
    );

    expect(versions.map((v) => v.id)).toEqual(['v1', 'current']);
    expect(versions[0]?.versionNumber).toBe(1);
    expect(versions[1]?.versionNumber).toBe(2);
    expect(versions[1]?.isCurrent).toBe(true);
  });

  it('calcule un diff champ à champ et sur les liens', () => {
    const diff = compareStrategicDirectionStrategies({
      left: {
        id: 'left',
        versionLabel: 'v1 · archivée',
        title: 'Ancien titre',
        ambition: 'Ambition A',
        context: 'Contexte A',
        horizonLabel: '2024-2026',
        ownerLabel: 'Alice',
        strategicPriorities: [{ title: 'Priorité 1' }],
        expectedOutcomes: [],
        kpis: [],
        majorInitiatives: [],
        risks: [],
        axes: [{ id: 'axis-1', name: 'Axe 1' }],
        objectives: [{ id: 'obj-1', title: 'Objectif 1' }],
      },
      right: {
        id: 'right',
        versionLabel: 'v2 · version actuelle (APPROVED)',
        title: 'Nouveau titre',
        ambition: 'Ambition A',
        context: 'Contexte B',
        horizonLabel: '2026-2028',
        ownerLabel: 'Alice',
        strategicPriorities: [{ title: 'Priorité 2' }],
        expectedOutcomes: [],
        kpis: [],
        majorInitiatives: [],
        risks: [],
        axes: [{ id: 'axis-2', name: 'Axe 2' }],
        objectives: [{ id: 'obj-1', title: 'Objectif 1' }, { id: 'obj-2', title: 'Objectif 2' }],
      },
    });

    expect(diff.hasChanges).toBe(true);
    expect(diff.fields.find((field) => field.field === 'title')?.changed).toBe(true);
    expect(diff.fields.find((field) => field.field === 'ambition')?.changed).toBe(false);
    expect(diff.axes.removed).toEqual(['Axe 1']);
    expect(diff.axes.added).toEqual(['Axe 2']);
    expect(diff.objectives.unchanged).toEqual(['Objectif 1']);
    expect(diff.objectives.added).toEqual(['Objectif 2']);
    expect(diff.collections[0]?.removed).toEqual(['Priorité 1']);
    expect(diff.collections[0]?.added).toEqual(['Priorité 2']);
  });
});
