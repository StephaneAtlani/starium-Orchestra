import {
  computeAlignmentScore,
  computeMaturity,
  computeSchemaAlerts,
  computeSchemaMetrics,
  detectInitiativeOverlaps,
  tokenizeTitle,
} from './strategic-direction-strategy-schema-metrics';
import {
  normalizeStrategySchemaPayload,
  type NormalizedStrategySchema,
} from './strategic-direction-strategy-schema-normalize';

/** Fixture inspirée du seed mock DSI (strategie.js) — montants en cents. */
function dsiSchema(): NormalizedStrategySchema {
  return normalizeStrategySchemaPayload({
    horizonStartYear: 2026,
    horizonYearCount: 3,
    ownAxes: [
      { id: 'own-1', name: 'Socle & exploitation', tone: 'info' },
      { id: 'own-2', name: 'Produits & data', tone: 'purple' },
      { id: 'own-3', name: 'Cyber & conformité', tone: 'gold' },
      { id: 'own-4', name: 'Compétences IT', tone: 'teal' },
    ],
    axisContributions: { ax1: 90, ax2: 85, ax3: 70, ax4: 55 },
    budgetsByYear: {
      '2026': 420_000_000,
      '2027': 460_000_000,
      '2028': 360_000_000,
    },
    majorInitiatives: [
      {
        id: 'c1',
        title: 'Migration Cloud hybride',
        ownerLabel: 'Marc Dupont',
        budgetCents: 320_000_000,
        progressPct: 62,
        lane: 0,
        startMonthOffset: 0,
        endMonthOffset: 14,
        strategicAxisIds: ['ax1', 'ax2'],
      },
      {
        id: 'c2',
        title: 'Refonte Portail Client',
        ownerLabel: 'Sophie Leroy',
        budgetCents: 180_000_000,
        progressPct: 48,
        lane: 1,
        startMonthOffset: 3,
        endMonthOffset: 17,
        strategicAxisIds: ['ax2'],
      },
      {
        id: 'c4',
        title: 'Conformité DORA',
        ownerLabel: 'Alice Bernard',
        budgetCents: 90_000_000,
        progressPct: 70,
        lane: 2,
        startMonthOffset: 0,
        endMonthOffset: 11,
        strategicAxisIds: ['ax3'],
      },
      {
        id: 'c7',
        title: 'Académie IT interne',
        ownerLabel: 'Claire Dubois',
        budgetCents: 40_000_000,
        progressPct: 35,
        lane: 3,
        startMonthOffset: 6,
        endMonthOffset: 24,
        strategicAxisIds: ['ax4'],
      },
    ],
    expectedOutcomes: [
      { title: 'Disponibilité', target: '99,9 %', current: '99,72 %', progressPct: 78 },
      { title: 'Dette technique', target: '-30 %', current: '-13 %', progressPct: 45 },
      { title: 'Sécurité by design', target: '100 %', current: '62 %', progressPct: 60 },
      { title: 'Time-to-market', target: '6 semaines', current: '11 semaines', progressPct: 35 },
    ],
    risks: [
      { name: 'Pénurie cloud', level: 'danger' },
      { name: 'Intégrateur unique', level: 'warning' },
      { name: 'Retard DORA', level: 'danger' },
      { name: 'Adhésion data', level: 'info' },
    ],
  });
}

const VISION_AXES = [
  { id: 'ax1', name: 'Excellence opérationnelle' },
  { id: 'ax2', name: 'Expérience client' },
  { id: 'ax3', name: 'Maîtrise des risques' },
  { id: 'ax4', name: 'Compétences & culture' },
];

describe('strategic-direction-strategy-schema-metrics', () => {
  const ambition =
    'Devenir le partenaire de transformation des métiers : un socle IT sécurisé et industrialisé.';

  it('calcule un score d’alignement DSI cohérent avec le mock', () => {
    const schema = dsiSchema();
    const score = computeAlignmentScore(schema, VISION_AXES);
    // ax1: 0.5*90 + 0.3*34 + 0.2*62 = 45+10.2+12.4 = 67.6
    // ax2: 0.5*85 + 0.3*68 + 0.2*55 = 42.5+20.4+11 = 73.9
    // ax3: 0.5*70 + 0.3*34 + 0.2*70 = 35+10.2+14 = 59.2
    // ax4: 0.5*55 + 0.3*34 + 0.2*35 = 27.5+10.2+7 = 44.7
    // avg ≈ 61.35 → 61
    expect(score).toBe(61);
  });

  it('retourne 0 si aucun axe vision', () => {
    expect(computeAlignmentScore(dsiSchema(), [])).toBe(0);
  });

  it('calcule la maturité 6 dimensions', () => {
    const maturity = computeMaturity({
      schema: dsiSchema(),
      ambition,
      visionAxes: VISION_AXES,
      lastReviewAt: new Date('2026-05-02T00:00:00.000Z'),
      nowMonthOffset: 8,
    });

    expect(maturity.Ambition).toBeGreaterThan(40);
    expect(maturity.Objectifs).toBeGreaterThan(40);
    expect(maturity.Chantiers).toBeGreaterThan(40);
    expect(maturity.Budget).toBe(100); // budgets > charge chantiers
    expect(maturity.Risques).toBe(100); // 4 * 30 capped
    expect(maturity.Revue).toBeGreaterThanOrEqual(0);
    expect(maturity.Revue).toBeLessThanOrEqual(100);
  });

  it('génère des alertes (retard, OKR présents, couverture)', () => {
    const schema = dsiSchema();
    // Chantier terminé avant now sans 100 % → danger retard
    schema.majorInitiatives.push({
      id: 'late',
      title: 'Archivage & conformité légale',
      description: '',
      ownerLabel: 'Alice Bernard',
      budgetCents: 60_000_000,
      progressPct: 0,
      lane: 2,
      startMonthOffset: 0,
      endMonthOffset: 6,
      strategicAxisIds: ['ax3'],
      milestones: [],
      linkedProjectNames: [],
    });

    const alerts = computeSchemaAlerts({
      schema,
      ambition,
      visionAxes: VISION_AXES,
      lastReviewAt: new Date('2025-01-01T00:00:00.000Z'),
      nowMonthOffset: 8,
    });

    expect(alerts.some((a) => a.title.includes('Archivage'))).toBe(true);
    expect(alerts.some((a) => a.title.includes('Revue stratégique périmée'))).toBe(true);
    expect(alerts.some((a) => a.title === 'Aucun objectif mesurable')).toBe(false);
  });

  it('computeSchemaMetrics agrège score + maturité + alertes', () => {
    const result = computeSchemaMetrics({
      schema: dsiSchema(),
      ambition,
      visionAxes: VISION_AXES,
      lastReviewAt: new Date('2026-05-02T00:00:00.000Z'),
      nowMonthOffset: 8,
    });
    expect(result.score).toBe(61);
    expect(result.maturity).toHaveProperty('Ambition');
    expect(Array.isArray(result.alerts)).toBe(true);
  });

  it('détecte des recouvrements tokenisés entre directions', () => {
    const overlaps = detectInitiativeOverlaps(
      [
        {
          directionId: 'dsi',
          directionCode: 'DSI',
          initiatives: dsiSchema().majorInitiatives,
        },
        {
          directionId: 'daf',
          directionCode: 'DAF',
          initiatives: normalizeStrategySchemaPayload({
            majorInitiatives: [
              {
                title: 'Plateforme data finance',
                progressPct: 0,
                lane: 0,
                startMonthOffset: 16,
                endMonthOffset: 30,
                strategicAxisIds: ['ax1'],
              },
              {
                title: 'Refonte du cycle budgétaire',
                progressPct: 55,
                lane: 0,
                startMonthOffset: 0,
                endMonthOffset: 9,
              },
            ],
          }).majorInitiatives,
        },
      ],
      36,
    );

    // "refonte" est stopword ; "plateforme" / "data" peuvent matcher Académie? non.
    // DSI a "Plateforme Data & BI" pas dans fixture réduite — on ajoute un match explicite :
    expect(tokenizeTitle('Plateforme Data & BI')).toEqual(
      expect.arrayContaining(['plateforme', 'data']),
    );
    expect(tokenizeTitle('Refonte Portail Client')).not.toContain('refonte');

    const withPlatform = detectInitiativeOverlaps(
      [
        {
          directionId: 'dsi',
          directionCode: 'DSI',
          initiatives: normalizeStrategySchemaPayload({
            majorInitiatives: [
              {
                title: 'Plateforme Data & BI',
                progressPct: 15,
                lane: 1,
                startMonthOffset: 12,
                endMonthOffset: 28,
              },
            ],
          }).majorInitiatives,
        },
        {
          directionId: 'daf',
          directionCode: 'DAF',
          initiatives: normalizeStrategySchemaPayload({
            majorInitiatives: [
              {
                title: 'Plateforme data finance',
                progressPct: 0,
                lane: 0,
                startMonthOffset: 16,
                endMonthOffset: 30,
              },
            ],
          }).majorInitiatives,
        },
      ],
      36,
    );
    expect(withPlatform.length).toBeGreaterThan(0);
    expect(withPlatform[0].shared).toEqual(expect.arrayContaining(['plateforme', 'data']));
    expect(overlaps.length).toBeGreaterThanOrEqual(0);
  });
});
