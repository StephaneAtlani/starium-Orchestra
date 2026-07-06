import { buildProjectListPilotageSnapshot } from './project-list-pilotage-snapshot';

describe('buildProjectListPilotageSnapshot', () => {
  const baseProject = {
    targetEndDate: new Date('2026-01-15'),
    status: 'IN_PROGRESS' as const,
  };

  it('liste les jalons en retard et le prochain jalon', () => {
    const snap = buildProjectListPilotageSnapshot({
      project: baseProject,
      tasks: [],
      risks: [],
      milestones: [
        {
          id: 'm1',
          name: 'Recette métier',
          status: 'DELAYED',
          targetDate: new Date('2026-03-01'),
        } as any,
        {
          id: 'm2',
          name: 'Mise en prod',
          status: 'PLANNED',
          targetDate: new Date('2026-06-01'),
        } as any,
      ],
      signals: {
        isLate: false,
        isBlocked: false,
        hasNoOwner: false,
        hasNoTasks: true,
        hasNoRisks: true,
        hasNoMilestones: false,
        hasPlanningDrift: true,
        isCritical: false,
      },
      ownerDisplayName: 'Alice Martin',
      openTasksCount: 0,
      openRisksCount: 0,
    });

    expect(snap.delayedMilestones[0]?.name).toBe('Recette métier');
    expect(snap.nextMilestone?.name).toBe('Mise en prod');
    expect(snap.issues.some((l) => l.includes('Recette métier'))).toBe(true);
    expect(snap.ok.some((l) => l.includes('Mise en prod'))).toBe(true);
  });

  it('expose tâches et risques ouverts dans TRJ sans les traiter comme alertes', () => {
    const snap = buildProjectListPilotageSnapshot({
      project: { targetEndDate: null, status: 'IN_PROGRESS' },
      tasks: [
        { name: 'Migration données', status: 'IN_PROGRESS', plannedEndDate: null } as any,
        { name: 'Tests sécu', status: 'TODO', plannedEndDate: null } as any,
      ],
      risks: [
        {
          title: 'Indispo fournisseur',
          status: 'OPEN',
          criticalityScore: 6,
          criticalityLevel: 'MEDIUM',
        } as any,
      ],
      milestones: [],
      signals: {
        isLate: false,
        isBlocked: false,
        hasNoOwner: false,
        hasNoTasks: false,
        hasNoRisks: false,
        hasNoMilestones: true,
        hasPlanningDrift: false,
        isCritical: false,
      },
      ownerDisplayName: null,
      openTasksCount: 2,
      openRisksCount: 1,
    });

    expect(snap.openTasks.map((t) => t.name)).toEqual(
      expect.arrayContaining(['Migration données', 'Tests sécu']),
    );
    expect(snap.openRisks[0]?.title).toBe('Indispo fournisseur');
    expect(snap.issues).not.toContain('Risque ouvert : Indispo fournisseur');
    expect(snap.issues.some((l) => l.includes('Migration données'))).toBe(false);
    expect(snap.ok).toContain('Registre des risques alimenté');
  });

  it('signale uniquement les risques élevés ou critiques', () => {
    const snap = buildProjectListPilotageSnapshot({
      project: { targetEndDate: null, status: 'IN_PROGRESS' },
      tasks: [],
      risks: [
        {
          title: 'Indispo fournisseur',
          status: 'OPEN',
          criticalityScore: 12,
          criticalityLevel: 'HIGH',
        } as any,
      ],
      milestones: [],
      signals: {
        isLate: false,
        isBlocked: false,
        hasNoOwner: false,
        hasNoTasks: true,
        hasNoRisks: false,
        hasNoMilestones: true,
        hasPlanningDrift: false,
        isCritical: false,
      },
      ownerDisplayName: null,
      openTasksCount: 0,
      openRisksCount: 1,
    });

    expect(snap.issues).toContain('Risque élevé : Indispo fournisseur');
  });
});
