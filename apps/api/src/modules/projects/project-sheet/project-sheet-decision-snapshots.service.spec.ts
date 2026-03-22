import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import { ProjectSheetDecisionSnapshotsService } from './project-sheet-decision-snapshots.service';

describe('ProjectSheetDecisionSnapshotsService', () => {
  const clientId = 'c1';
  const projectId = 'p1';

  function baseProject(overrides: Record<string, unknown> = {}) {
    return {
      id: projectId,
      clientId,
      arbitrationMetierStatus: 'BROUILLON',
      arbitrationComiteStatus: null,
      arbitrationCodirStatus: null,
      name: 'P',
      code: 'C',
      description: null,
      cadreLocation: null,
      cadreQui: null,
      involvedTeams: null,
      kind: 'PROJECT',
      type: 'GOVERNANCE',
      status: 'DRAFT',
      priority: 'MEDIUM',
      criticality: 'MEDIUM',
      businessValueScore: null,
      strategicAlignment: null,
      urgencyScore: null,
      estimatedCost: null,
      estimatedGain: null,
      roi: null,
      riskLevel: null,
      riskResponse: null,
      priorityScore: null,
      arbitrationStatus: null,
      arbitrationMetierRefusalNote: null,
      arbitrationComiteRefusalNote: null,
      arbitrationCodirRefusalNote: null,
      copilRecommendation: 'NOT_SET',
      copilRecommendationNote: null,
      businessProblem: null,
      businessBenefits: null,
      businessSuccessKpis: null,
      swotStrengths: null,
      swotWeaknesses: null,
      swotOpportunities: null,
      swotThreats: null,
      towsActions: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it('ne crée rien si recordDecisionSnapshot !== true', async () => {
    const prisma = {
      projectSheetDecisionSnapshot: { create: jest.fn() },
      project: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const audit = { create: jest.fn() };
    const svc = new ProjectSheetDecisionSnapshotsService(
      prisma as any,
      audit as unknown as AuditLogsService,
    );
    await svc.createSnapshotsAfterSheetUpdateIfNeeded(
      baseProject() as any,
      baseProject({ arbitrationMetierStatus: 'VALIDE' }) as any,
      false,
      { actorUserId: 'u1' },
    );
    expect(prisma.projectSheetDecisionSnapshot.create).not.toHaveBeenCalled();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('ne crée rien si flag true mais pas de transition vers Validé / Refusé', async () => {
    const prisma = {
      projectSheetDecisionSnapshot: { create: jest.fn() },
      project: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const audit = { create: jest.fn() };
    const svc = new ProjectSheetDecisionSnapshotsService(
      prisma as any,
      audit as unknown as AuditLogsService,
    );
    await svc.createSnapshotsAfterSheetUpdateIfNeeded(
      baseProject() as any,
      baseProject() as any,
      true,
      { actorUserId: 'u1' },
    );
    expect(prisma.projectSheetDecisionSnapshot.create).not.toHaveBeenCalled();
  });

  it('crée un snapshot et un audit quand métier passe à REFUSE', async () => {
    const prisma = {
      projectSheetDecisionSnapshot: {
        create: jest.fn().mockResolvedValueOnce({ id: 's1' }),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: projectId }),
      },
      $transaction: jest.fn(),
    };
    const audit = { create: jest.fn().mockResolvedValue(undefined) };
    const svc = new ProjectSheetDecisionSnapshotsService(
      prisma as any,
      audit as unknown as AuditLogsService,
    );

    const existing = baseProject({
      arbitrationMetierStatus: 'EN_COURS',
    });
    const updated = baseProject({
      arbitrationMetierStatus: 'REFUSE',
    });

    await svc.createSnapshotsAfterSheetUpdateIfNeeded(
      existing as any,
      updated as any,
      true,
      { actorUserId: 'u1' },
    );

    expect(prisma.projectSheetDecisionSnapshot.create).toHaveBeenCalledTimes(1);
    expect(audit.create).toHaveBeenCalledTimes(1);
  });

  it('crée un snapshot et un audit par niveau validé', async () => {
    const prisma = {
      projectSheetDecisionSnapshot: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 's1' })
          .mockResolvedValueOnce({ id: 's2' }),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: projectId }),
      },
      $transaction: jest.fn(),
    };
    const audit = { create: jest.fn().mockResolvedValue(undefined) };
    const svc = new ProjectSheetDecisionSnapshotsService(
      prisma as any,
      audit as unknown as AuditLogsService,
    );

    const existing = baseProject({
      arbitrationMetierStatus: 'EN_COURS',
      arbitrationComiteStatus: 'EN_COURS',
      arbitrationCodirStatus: null,
    });
    const updated = baseProject({
      arbitrationMetierStatus: 'VALIDE',
      arbitrationComiteStatus: 'VALIDE',
      arbitrationCodirStatus: null,
    });

    await svc.createSnapshotsAfterSheetUpdateIfNeeded(
      existing as any,
      updated as any,
      true,
      { actorUserId: 'u1' },
    );

    expect(prisma.projectSheetDecisionSnapshot.create).toHaveBeenCalledTimes(2);
    expect(audit.create).toHaveBeenCalledTimes(2);
    expect(audit.create.mock.calls[0][0].action).toBe(
      PROJECT_AUDIT_ACTION.PROJECT_SHEET_DECISION_SNAPSHOT_CREATED,
    );
  });

  it('liste paginée : tri createdAt desc et total', async () => {
    const rows = [
      {
        id: 'a',
        clientId,
        projectId,
        createdAt: new Date('2025-01-02'),
        createdByUserId: null,
        decisionLevel: 'METIER',
        sheetPayload: {},
      },
    ];
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: projectId }),
      },
      projectSheetDecisionSnapshot: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    const audit = { create: jest.fn() };
    const svc = new ProjectSheetDecisionSnapshotsService(
      prisma as any,
      audit as unknown as AuditLogsService,
    );

    const out = await svc.listSnapshots(clientId, projectId, 10, 0);

    expect(out.total).toBe(1);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].decisionLevel).toBe('METIER');
    expect(prisma.projectSheetDecisionSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      }),
    );
  });

  it('getSnapshotById lance NotFound si mauvais scope', async () => {
    const prisma = {
      projectSheetDecisionSnapshot: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = new ProjectSheetDecisionSnapshotsService(
      prisma as any,
      { create: jest.fn() } as unknown as AuditLogsService,
    );

    await expect(
      svc.getSnapshotById(clientId, projectId, 'snap-x'),
    ).rejects.toThrow('Snapshot not found');
  });
});
