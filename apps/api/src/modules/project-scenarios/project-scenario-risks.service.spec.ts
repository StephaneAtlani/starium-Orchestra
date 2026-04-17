import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectScenarioStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RiskTaxonomyService } from '../risk-taxonomy/risk-taxonomy.service';
import { ProjectScenarioRisksService } from './project-scenario-risks.service';

describe('ProjectScenarioRisksService', () => {
  let service: ProjectScenarioRisksService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let riskTaxonomy: { assertUsableRiskTypeForWrite: jest.Mock };

  const clientId = 'client-1';
  const projectId = 'project-1';
  const scenarioId = 'scenario-1';

  beforeEach(() => {
    prisma = {
      projectScenario: { findFirst: jest.fn() },
      projectScenarioRisk: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (input: unknown) => Promise.all(input as Promise<unknown>[])),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    riskTaxonomy = { assertUsableRiskTypeForWrite: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectScenarioRisksService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      riskTaxonomy as unknown as RiskTaxonomyService,
    );
    prisma.projectScenario.findFirst.mockResolvedValue({
      id: scenarioId,
      status: ProjectScenarioStatus.DRAFT,
    });
  });

  it('calcule criticalityScore = probability * impact à la création', async () => {
    prisma.projectScenarioRisk.create.mockResolvedValue({
      id: 'risk-1',
      clientId,
      scenarioId,
      riskTypeId: null,
      title: 'Risque',
      description: null,
      probability: 4,
      impact: 5,
      criticalityScore: 20,
      mitigationPlan: null,
      ownerLabel: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      riskType: null,
    });

    await service.create(clientId, projectId, scenarioId, {
      title: 'Risque',
      probability: 4,
      impact: 5,
    });

    expect(prisma.projectScenarioRisk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          probability: 4,
          impact: 5,
          criticalityScore: 20,
        }),
      }),
    );
  });

  it('refuse hors scope client/projet/scénario', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce(null);
    await expect(service.list(clientId, projectId, scenarioId, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuse mutation si scénario archivé', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce({
      id: scenarioId,
      status: ProjectScenarioStatus.ARCHIVED,
    });
    await expect(
      service.create(clientId, projectId, scenarioId, {
        title: 'Risque',
        probability: 2,
        impact: 3,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('valide riskTypeId client-scopé si fourni', async () => {
    prisma.projectScenarioRisk.create.mockResolvedValue({
      id: 'risk-1',
      clientId,
      scenarioId,
      riskTypeId: 'rt-1',
      title: 'Risque',
      description: null,
      probability: 2,
      impact: 3,
      criticalityScore: 6,
      mitigationPlan: null,
      ownerLabel: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      riskType: { id: 'rt-1', code: 'OPS', name: 'Opérationnel' },
    });

    await service.create(clientId, projectId, scenarioId, {
      title: 'Risque',
      riskTypeId: 'rt-1',
      probability: 2,
      impact: 3,
    });

    expect(riskTaxonomy.assertUsableRiskTypeForWrite).toHaveBeenCalledWith(clientId, 'rt-1');
  });

  it('update partiel: merge puis recalcule criticalityScore sur état final', async () => {
    prisma.projectScenarioRisk.findFirst.mockResolvedValueOnce({
      id: 'risk-1',
      clientId,
      scenarioId,
      riskTypeId: null,
      title: 'Risque',
      description: null,
      probability: 2,
      impact: 3,
      criticalityScore: 6,
      mitigationPlan: null,
      ownerLabel: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    prisma.projectScenarioRisk.update.mockResolvedValue({
      id: 'risk-1',
      clientId,
      scenarioId,
      riskTypeId: null,
      title: 'Risque',
      description: null,
      probability: 2,
      impact: 5,
      criticalityScore: 10,
      mitigationPlan: null,
      ownerLabel: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
      riskType: null,
    });

    await service.update(clientId, projectId, scenarioId, 'risk-1', { impact: 5 });

    expect(prisma.projectScenarioRisk.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          impact: 5,
          criticalityScore: 10,
        }),
      }),
    );
  });

  it('GET /risk-summary retourne 0/null quand il n’y a aucun risque', async () => {
    prisma.projectScenarioRisk.findMany.mockResolvedValueOnce([]);

    const result = await service.getSummary(clientId, projectId, scenarioId);
    expect(result).toEqual({
      criticalRiskCount: 0,
      averageCriticality: null,
      maxCriticality: null,
    });
  });

  it('GET /risk-summary calcule le seuil critique >= 15', async () => {
    prisma.projectScenarioRisk.findMany.mockResolvedValueOnce([
      { criticalityScore: 6 },
      { criticalityScore: 15 },
      { criticalityScore: 20 },
    ]);

    const result = await service.getSummary(clientId, projectId, scenarioId);
    expect(result).toEqual({
      criticalRiskCount: 2,
      averageCriticality: 13.67,
      maxCriticality: 20,
    });
  });

  it('GET /risks retourne le format paginé avec tri DESC', async () => {
    prisma.projectScenarioRisk.findMany.mockResolvedValueOnce([
      {
        id: 'risk-1',
        clientId,
        scenarioId,
        riskTypeId: null,
        title: 'Risque',
        description: null,
        probability: 3,
        impact: 4,
        criticalityScore: 12,
        mitigationPlan: null,
        ownerLabel: null,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        riskType: null,
      },
    ]);
    prisma.projectScenarioRisk.count.mockResolvedValueOnce(1);

    const result = await service.list(clientId, projectId, scenarioId, { limit: 20, offset: 0 });

    expect(prisma.projectScenarioRisk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'risk-1',
          criticalityScore: 12,
        }),
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });
});
