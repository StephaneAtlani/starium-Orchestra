import { normalizeStrategySchemaPayload } from './strategic-direction-strategy-schema-normalize';

describe('normalizeStrategySchemaPayload', () => {
  it('mappe le legacy majorInitiatives { title, description }', () => {
    const schema = normalizeStrategySchemaPayload({
      horizonLabel: '2026 → 2028',
      majorInitiatives: [{ title: 'Migration Cloud', description: 'Socle hybride' }],
    });

    expect(schema.horizonStartYear).toBe(2026);
    expect(schema.horizonYearCount).toBe(3);
    expect(schema.majorInitiatives).toHaveLength(1);
    expect(schema.majorInitiatives[0]).toMatchObject({
      title: 'Migration Cloud',
      description: 'Socle hybride',
      progressPct: 0,
      lane: 0,
      startMonthOffset: 0,
      endMonthOffset: 3,
      strategicAxisIds: [],
    });
  });

  it('mappe le legacy expectedOutcomes { label, target }', () => {
    const schema = normalizeStrategySchemaPayload({
      expectedOutcomes: [{ label: 'Disponibilité', target: '99,9 %' }],
    });

    expect(schema.expectedOutcomes[0]).toEqual({
      title: 'Disponibilité',
      ownerLabel: '—',
      target: '99,9 %',
      current: '—',
      unit: '',
      progressPct: 0,
    });
  });

  it('conserve unit sur expectedOutcomes', () => {
    const schema = normalizeStrategySchemaPayload({
      expectedOutcomes: [
        { title: 'Délai clôture', target: '5', current: '9', unit: 'jours', progressPct: 40 },
      ],
    });
    expect(schema.expectedOutcomes[0]?.unit).toBe('jours');
  });

  it('mappe le legacy kpis { name, target, unit }', () => {
    const schema = normalizeStrategySchemaPayload({
      kpis: [{ name: 'Disponibilité', target: '99,72 %', unit: 'cible 99,9 %' }],
    });

    expect(schema.kpis[0]).toEqual({
      label: 'Disponibilité',
      value: '99,72 %',
      detail: 'cible 99,9 %',
    });
  });

  it('mappe le legacy risks { label, mitigation }', () => {
    const schema = normalizeStrategySchemaPayload({
      risks: [{ label: 'Pénurie cloud', mitigation: 'Académie IT' }],
    });

    expect(schema.risks[0]).toMatchObject({
      name: 'Pénurie cloud',
      level: 'info',
      mitigation: 'Académie IT',
    });
  });

  it('accepte la forme mock structurée (offsets, ga, budgets)', () => {
    const schema = normalizeStrategySchemaPayload({
      horizonStartYear: 2026,
      horizonYearCount: 3,
      ownAxes: [{ id: 'own-1', name: 'Socle & exploitation', tone: 'info' }],
      budgetsByYear: { '2026': 420_000_000, bad: -1, '20xx': 1 },
      axisContributions: { ax1: 90, ax2: 150 },
      majorInitiatives: [
        {
          id: 'c1',
          n: 'Migration Cloud hybride',
          own: 'Marc Dupont',
          bud: 320_000_000,
          pct: 62,
          lane: 0,
          s: 0,
          e: 14,
          ga: ['ax1', 'ax2'],
          prj: ['Migration Cloud'],
          ms: [{ m: 5, l: 'Bascule du socle' }],
        },
      ],
      expectedOutcomes: [
        {
          t: 'Disponibilité des services critiques',
          who: 'Marc Dupont',
          kpi: '99,9 %',
          cur: '99,72 %',
          pct: 78,
        },
      ],
      contentBlocks: [{ k: 'text', t: 'Principes', b: 'Cloud d’abord' }],
    });

    expect(schema.ownAxes).toEqual([
      { id: 'own-1', name: 'Socle & exploitation', tone: 'info' },
    ]);
    expect(schema.budgetsByYear).toEqual({ '2026': 420_000_000 });
    expect(schema.axisContributions.ax1).toBe(90);
    expect(schema.axisContributions.ax2).toBe(100);
    expect(schema.majorInitiatives[0]).toMatchObject({
      id: 'c1',
      title: 'Migration Cloud hybride',
      ownerLabel: 'Marc Dupont',
      budgetCents: 320_000_000,
      progressPct: 62,
      startMonthOffset: 0,
      endMonthOffset: 14,
      strategicAxisIds: ['ax1', 'ax2'],
      linkedProjectNames: ['Migration Cloud'],
    });
    expect(schema.majorInitiatives[0].milestones).toEqual([
      { monthOffset: 5, label: 'Bascule du socle' },
    ]);
    expect(schema.expectedOutcomes[0].progressPct).toBe(78);
    expect(schema.contentBlocks[0]).toMatchObject({
      kind: 'text',
      title: 'Principes',
      body: 'Cloud d’abord',
    });
  });

  it('normalise un bloc document avec documentId', () => {
    const schema = normalizeStrategySchemaPayload({
      contentBlocks: [
        { kind: 'document', title: 'Charte architecture', body: 'V1', documentId: 'doc-1' },
      ],
    });
    expect(schema.contentBlocks[0]).toEqual({
      kind: 'document',
      title: 'Charte architecture',
      body: 'V1',
      documentId: 'doc-1',
    });
  });

  it('fournit 3 axes propres par défaut si absents', () => {
    const schema = normalizeStrategySchemaPayload({});
    expect(schema.ownAxes).toHaveLength(3);
    expect(schema.ownAxes[0].name).toContain('à nommer');
  });
});
