import {
  buildProjectReviewReportContent,
  parseProjectReviewSnapshotPayload,
} from './project-review-report.builder';
import type { ProjectReviewSnapshotPayload } from './project-reviews-snapshot.builder';

const baseSnapshot: ProjectReviewSnapshotPayload = {
  schemaVersion: 2,
  review: {
    type: 'COPIL',
    title: 'Migration opérateur',
    objective: 'Valider le plan de bascule',
    periodStart: '2026-07-01T00:00:00.000Z',
    periodEnd: '2026-07-14T00:00:00.000Z',
    reviewDate: '2026-07-14T19:00:00.000Z',
    durationMinutes: 60,
    facilitatorDisplayName: 'Alice Martin',
    committeeMood: null,
  },
  project: {
    id: 'p1',
    name: 'Telephonie',
    status: 'IN_PROGRESS',
    health: 'ORANGE',
    priority: 'HIGH',
  },
  meeting: { meetingMode: 'REMOTE', location: null },
  participants: [
    {
      userId: 'u1',
      displayName: 'Alice Martin',
      roleLabel: 'Animateur',
      attendanceStatus: 'PRESENT',
    },
  ],
  agenda: [
    {
      id: 'a1',
      title: 'État d’avancement',
      orderIndex: 0,
      status: 'DONE',
      notes: 'Migration à 80 %',
      decisionSummary: 'Go pour bascule vendredi',
      decisions: [
        {
          id: 'd1',
          title: 'Valider la bascule',
          description: null,
          decisionType: 'GO',
          status: 'VALIDATED',
          impact: 'Impact limité sur les utilisateurs',
        },
      ],
      actionItems: [
        {
          id: 'act1',
          title: 'Valider le runbook',
          status: 'OPEN',
          dueDate: '2026-07-16T00:00:00.000Z',
          priority: 'HIGH',
          responsibleUserId: 'u2',
          responsibleDisplayName: 'Bob Dupont',
          contributors: [],
        },
      ],
    },
  ],
  attachments: [
    { title: 'Runbook migration', attachmentType: 'DOCUMENT_REFERENCE', agendaItemTitle: 'État d’avancement' },
  ],
  decisions: [],
  actions: [],
  untreatedAgendaItems: [],
  nextSteps: '2026-07-21T00:00:00.000Z',
  progress: { globalProgress: 80 },
  arbitration: {
    arbitrationMetierStatus: 'VALIDE',
    arbitrationComiteStatus: null,
    arbitrationCodirStatus: null,
    arbitrationStatus: null,
  },
  tasks: { open: 1, inProgress: 2, done: 5, late: 1 },
  risks: {
    open: 2,
    mitigated: 1,
    closed: 0,
    monitored: 0,
    topRisks: [
      { id: 'r1', title: 'Coupure réseau opérateur', criticality: 'HIGH', status: 'OPEN' },
    ],
  },
  milestones: [
    {
      id: 'm1',
      name: 'Bascule production',
      targetDate: '2026-07-18T00:00:00.000Z',
      status: 'PLANNED',
    },
  ],
  budget: {
    links: [
      {
        budgetLineId: 'bl1',
        label: 'OPEX-2026 — Téléphonie',
        allocationType: 'FIXED',
        percentage: null,
        amount: '45000',
      },
    ],
  },
  generatedAt: '2026-07-14T20:00:00.000Z',
};

describe('project-review-report.builder', () => {
  it('génère un HTML riche avec météo, risques, liens et sans URL sensible', () => {
    const report = buildProjectReviewReportContent({
      projectName: 'Telephonie',
      projectId: 'p1',
      reviewId: 'r1',
      snapshot: baseSnapshot,
      appBaseUrl: 'https://app.starium.test',
      clientOrganization: {
        name: 'NeoTech AI',
        logoUrl: null,
      },
    });

    expect(report.subject).toContain('Telephonie');
    expect(report.text).toContain('Organisation : NeoTech AI');
    expect(report.text).toContain('Météo du comité');
    expect(report.text).toContain('Coupure réseau opérateur');
    expect(report.text).toContain('Bascule production');
    expect(report.text).toContain('OPEX-2026');
    expect(report.html).toContain('NeoTech AI');
    expect(report.html).toContain('data:image/svg+xml');
    expect(report.html).toContain('https://app.starium.test/brand/logo-horizontal-white.png');
    expect(report.html).toContain('Météo du comité');
    expect(report.html).toContain('Accès rapide');
    expect(report.html).toContain('https://app.starium.test/projects/p1/risks');
    expect(report.html).toContain('Alice Martin');
    expect(report.html).toContain('Montant fixe');
    expect(report.html).toContain('#0e0e10');
    expect(report.html).toContain('#e8a317');
    expect(report.html).not.toMatch(/#1e293b|#1d4ed8|#334155/i);
    expect(report.html).not.toMatch(/meetingUrl/i);
    expect(report.html).not.toMatch(/externalEmail/i);
  });

  it('affiche le libellé métier du type d’allocation budget (pas le code)', () => {
    const report = buildProjectReviewReportContent({
      projectName: 'Telephonie',
      projectId: 'p1',
      reviewId: 'r1',
      snapshot: {
        ...baseSnapshot,
        budget: {
          links: [
            {
              budgetLineId: 'bl1',
              label: 'OPEX-2026 — Téléphonie',
              allocationType: 'FULL',
              percentage: null,
              amount: null,
            },
          ],
        },
      },
      appBaseUrl: 'https://app.starium.test',
      clientOrganization: { name: 'NeoTech AI', logoUrl: null },
    });

    expect(report.html).toContain('Intégral (100 % de la ligne)');
    expect(report.html).not.toContain('>FULL<');
    expect(report.text).toContain('Intégral (100 % de la ligne)');
    expect(report.text).not.toContain('(FULL)');
  });

  it('utilise la météo du comité du point avec repli sur les points précédents', () => {
    const withPointMood = buildProjectReviewReportContent({
      projectName: 'Telephonie',
      projectId: 'p1',
      reviewId: 'r1',
      snapshot: {
        ...baseSnapshot,
        project: { ...baseSnapshot.project, health: 'GREEN' },
        review: { ...baseSnapshot.review, committeeMood: 'RED' },
      },
      appBaseUrl: 'https://app.starium.test',
      clientOrganization: { name: 'NeoTech AI', logoUrl: null },
    });

    expect(withPointMood.text).toContain('Météo du comité : Difficile');
    expect(withPointMood.html).toContain('Météo du comité');
    expect(withPointMood.html).toContain('Difficile');
    expect(withPointMood.html).toContain('viewBox="0 0 24 24"');
    expect(withPointMood.text).not.toContain('Sain');
    expect(withPointMood.text).not.toContain('Critique');

    const withoutMood = buildProjectReviewReportContent({
      projectName: 'Telephonie',
      projectId: 'p1',
      reviewId: 'r1',
      snapshot: baseSnapshot,
      appBaseUrl: 'https://app.starium.test',
      clientOrganization: { name: 'NeoTech AI', logoUrl: null },
    });

    expect(withoutMood.text).toContain('Météo du comité : Non renseignée');
    expect(withoutMood.html).toContain('Non renseignée');
    expect(withoutMood.text).not.toContain('Attention');
    expect(withoutMood.text).not.toContain('Critique');
    expect(withoutMood.text).not.toContain('Mitigé');
  });

  it('affiche les libellés métier des statuts d’arbitrage (pas les codes)', () => {
    const report = buildProjectReviewReportContent({
      projectName: 'Telephonie',
      projectId: 'p1',
      reviewId: 'r1',
      snapshot: {
        ...baseSnapshot,
        arbitration: {
          arbitrationMetierStatus: 'SOUMIS_VALIDATION',
          arbitrationComiteStatus: 'EN_COURS',
          arbitrationCodirStatus: null,
          arbitrationStatus: 'TO_REVIEW',
        },
      },
      appBaseUrl: 'https://app.starium.test',
      clientOrganization: { name: 'NeoTech AI', logoUrl: null },
    });

    expect(report.html).toContain('À arbitrer');
    expect(report.html).toContain('Soumis à validation');
    expect(report.html).toContain('En préparation');
    expect(report.html).not.toContain('>TO_REVIEW<');
    expect(report.text).toContain('Global : À arbitrer');
    expect(report.text).not.toContain('TO_REVIEW');
  });

  it('parseProjectReviewSnapshotPayload refuse schemaVersion != 2', () => {
    expect(parseProjectReviewSnapshotPayload({ schemaVersion: 1 })).toBeNull();
    expect(parseProjectReviewSnapshotPayload(baseSnapshot)?.review.title).toBe(
      'Migration opérateur',
    );
  });
});
