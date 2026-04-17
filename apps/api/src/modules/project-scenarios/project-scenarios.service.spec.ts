import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectScenarioStatus, ProjectStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectScenarioCapacityService } from './project-scenario-capacity.service';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';
import { ProjectScenarioRisksService } from './project-scenario-risks.service';
import { ProjectScenarioResourcePlansService } from './project-scenario-resource-plans.service';
import { ProjectScenarioTasksService } from './project-scenario-tasks.service';
import { ProjectScenariosService } from './project-scenarios.service';

describe('ProjectScenariosService', () => {
  let service: ProjectScenariosService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let scenarioFinancialLines: { buildBudgetSummary: jest.Mock };
  let scenarioCapacity: { buildCapacitySummary: jest.Mock };
  let scenarioResourcePlans: { buildResourceSummary: jest.Mock };
  let scenarioRisks: { buildRiskSummary: jest.Mock };
  let scenarioTasks: { buildTimelineSummary: jest.Mock };

  const clientId = 'client-1';
  const projectId = 'project-1';

  function baseScenario(overrides: Record<string, unknown> = {}) {
    return {
      id: 'scenario-1',
      clientId,
      projectId,
      name: 'Scenario A',
      code: null,
      description: 'desc',
      assumptionSummary: 'summary',
      status: ProjectScenarioStatus.DRAFT,
      version: 1,
      isBaseline: false,
      selectedAt: null,
      selectedByUserId: null,
      archivedAt: null,
      archivedByUserId: null,
      createdAt: new Date('2026-04-19T12:00:00.000Z'),
      updatedAt: new Date('2026-04-19T12:00:00.000Z'),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      project: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      projectScenario: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(async (input: unknown) => {
        if (typeof input === 'function') {
          return input(prisma);
        }
        return Promise.all(input as Promise<unknown>[]);
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    scenarioFinancialLines = {
      buildBudgetSummary: jest.fn().mockResolvedValue({
        plannedTotal: '0.00',
        forecastTotal: '0.00',
        actualTotal: '0.00',
        varianceVsBaseline: null,
        varianceVsActual: '0.00',
        budgetCoverageRate: null,
      }),
    };
    scenarioResourcePlans = {
      buildResourceSummary: jest.fn().mockResolvedValue({
        plannedDaysTotal: '0',
        plannedCostTotal: '0',
        plannedFtePeak: null,
        distinctResources: 0,
      }),
    };
    scenarioCapacity = {
      buildCapacitySummary: jest.fn().mockResolvedValue({
        overCapacityCount: 0,
        underCapacityCount: 0,
        peakLoadPct: null,
        averageLoadPct: null,
      }),
    };
    scenarioTasks = {
      buildTimelineSummary: jest.fn().mockResolvedValue({
        plannedStartDate: null,
        plannedEndDate: null,
        criticalPathDuration: null,
        milestoneCount: 0,
      }),
    };
    scenarioRisks = {
      buildRiskSummary: jest.fn().mockResolvedValue({
        criticalRiskCount: 0,
        averageCriticality: null,
        maxCriticality: null,
      }),
    };
    service = new ProjectScenariosService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      scenarioFinancialLines as unknown as ProjectScenarioFinancialLinesService,
      scenarioCapacity as unknown as ProjectScenarioCapacityService,
      scenarioResourcePlans as unknown as ProjectScenarioResourcePlansService,
      scenarioRisks as unknown as ProjectScenarioRisksService,
      scenarioTasks as unknown as ProjectScenarioTasksService,
    );
  });

  it('create : initialise un scénario DRAFT avec isBaseline=false', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.aggregate.mockResolvedValue({ _max: { version: null } });
    prisma.projectScenario.create.mockResolvedValue(baseScenario());

    const result = await service.create(clientId, projectId, { name: 'Scenario A' });

    expect(prisma.projectScenario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectScenarioStatus.DRAFT,
          isBaseline: false,
          version: 1,
        }),
      }),
    );
    expect(result.status).toBe(ProjectScenarioStatus.DRAFT);
    expect(result.isBaseline).toBe(false);
  });

  it('getOne : refuse un état incohérent status/isBaseline', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(
      baseScenario({ status: ProjectScenarioStatus.DRAFT, isBaseline: true }),
    );

    await expect(service.getOne(clientId, projectId, 'scenario-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('getOne : injecte budgetSummary via service financier', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(baseScenario());

    const result = await service.getOne(clientId, projectId, 'scenario-1');

    expect(scenarioFinancialLines.buildBudgetSummary).toHaveBeenCalledWith(
      clientId,
      projectId,
      'scenario-1',
    );
    expect(result.budgetSummary).toEqual({
      plannedTotal: '0.00',
      forecastTotal: '0.00',
      actualTotal: '0.00',
      varianceVsBaseline: null,
      varianceVsActual: '0.00',
      budgetCoverageRate: null,
    });
    expect(scenarioResourcePlans.buildResourceSummary).toHaveBeenCalledWith(
      clientId,
      projectId,
      'scenario-1',
    );
    expect(result.resourceSummary).toEqual({
      plannedDaysTotal: '0',
      plannedCostTotal: '0',
      plannedFtePeak: null,
      distinctResources: 0,
    });
    expect(scenarioTasks.buildTimelineSummary).toHaveBeenCalledWith(
      clientId,
      projectId,
      'scenario-1',
    );
    expect(result.timelineSummary).toEqual({
      plannedStartDate: null,
      plannedEndDate: null,
      criticalPathDuration: null,
      milestoneCount: 0,
    });
    expect(scenarioCapacity.buildCapacitySummary).toHaveBeenCalledWith(
      clientId,
      projectId,
      'scenario-1',
    );
    expect(result.capacitySummary).toEqual({
      overCapacityCount: 0,
      underCapacityCount: 0,
      peakLoadPct: null,
      averageLoadPct: null,
    });
    expect(scenarioRisks.buildRiskSummary).toHaveBeenCalledWith(
      clientId,
      projectId,
      'scenario-1',
    );
    expect(result.riskSummary).toEqual({
      criticalRiskCount: 0,
      averageCriticality: null,
      maxCriticality: null,
    });
  });

  it('duplicate : calcule une version monotone via MAX(version)+1', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(baseScenario({ version: 2 }));
    prisma.projectScenario.aggregate.mockResolvedValue({ _max: { version: 7 } });
    prisma.projectScenario.create.mockResolvedValue(
      baseScenario({
        id: 'scenario-8',
        name: 'Scenario A (copie v8)',
        version: 8,
      }),
    );

    const result = await service.duplicate(clientId, projectId, 'scenario-1');

    expect(prisma.projectScenario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 8,
          status: ProjectScenarioStatus.DRAFT,
          isBaseline: false,
          code: null,
        }),
      }),
    );
    expect(result.version).toBe(8);
  });

  it('list conserve capacitySummary à null pour éviter le N+1', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findMany.mockResolvedValue([baseScenario()]);
    prisma.projectScenario.count.mockResolvedValue(1);

    const result = await service.list(clientId, projectId, { limit: 20, offset: 0 });
    expect(result.items[0].capacitySummary).toBeNull();
    expect(result.items[0].riskSummary).toBeNull();
  });

  it("getOne : retourne 404 si le scénario n'appartient pas au projet demandé", async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(null);

    await expect(service.getOne(clientId, projectId, 'foreign-scenario')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('select : resynchronise status -> isBaseline et archive les autres scénarios', async () => {
    const selected = baseScenario({
      status: ProjectScenarioStatus.SELECTED,
      isBaseline: true,
      selectedAt: new Date('2026-04-19T14:00:00.000Z'),
      selectedByUserId: 'user-1',
    });
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst
      .mockResolvedValueOnce(baseScenario())
      .mockResolvedValueOnce({ id: 'scenario-old' });
    prisma.projectScenario.updateMany.mockResolvedValue({ count: 1 });
    prisma.projectScenario.update.mockResolvedValue(selected);

    const result = await service.select(clientId, projectId, 'scenario-1', {
      actorUserId: 'user-1',
      meta: {},
    });

    expect(prisma.projectScenario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectScenarioStatus.ARCHIVED,
          isBaseline: false,
        }),
      }),
    );
    expect(prisma.projectScenario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectScenarioStatus.SELECTED,
          isBaseline: true,
        }),
      }),
    );
    expect(result.status).toBe(ProjectScenarioStatus.SELECTED);
    expect(result.isBaseline).toBe(true);
  });

  it("archive : refuse d'archiver un scénario SELECTED tant qu'aucun autre n'est sélectionné", async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(
      baseScenario({ status: ProjectScenarioStatus.SELECTED, isBaseline: true }),
    );

    await expect(service.archive(clientId, projectId, 'scenario-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it("select : mappe proprement l'erreur de contrainte d'unicité SELECTED", async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(baseScenario());
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.select(clientId, projectId, 'scenario-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('selectAndTransition : exécute sélection + archivage + update statut projet', async () => {
    const selected = baseScenario({
      status: ProjectScenarioStatus.SELECTED,
      isBaseline: true,
      selectedAt: new Date('2026-04-19T14:00:00.000Z'),
      selectedByUserId: 'user-1',
    });
    prisma.project.findFirst
      .mockResolvedValueOnce({ id: projectId })
      .mockResolvedValueOnce({ status: ProjectStatus.DRAFT });
    prisma.project.update.mockResolvedValue({ status: ProjectStatus.PLANNED });
    prisma.projectScenario.findFirst
      .mockResolvedValueOnce(baseScenario())
      .mockResolvedValueOnce({ id: 'scenario-old' });
    prisma.projectScenario.findMany.mockResolvedValue([{ id: 'scenario-old' }]);
    prisma.projectScenario.updateMany.mockResolvedValue({ count: 1 });
    prisma.projectScenario.update.mockResolvedValue(selected);

    const result = await service.selectAndTransition(
      clientId,
      projectId,
      'scenario-1',
      {
        targetProjectStatus: 'PLANNED',
        decisionNote: '  validée CODIR  ',
        archiveOtherScenarios: false,
      },
      {
        actorUserId: 'user-1',
        meta: {},
      },
    );

    expect(prisma.projectScenario.updateMany).toHaveBeenCalled();
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: { status: ProjectStatus.PLANNED },
      select: { status: true },
    });
    expect(result).toEqual({
      scenarioId: 'scenario-1',
      projectId,
      selectedStatus: ProjectScenarioStatus.SELECTED,
      projectStatus: ProjectStatus.PLANNED,
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'project.status.changed_from_scenario_selection',
        newValue: expect.objectContaining({
          status: ProjectStatus.PLANNED,
          decisionNote: '  validée CODIR  ',
        }),
      }),
    );
  });

  it('selectAndTransition : idempotent si projet déjà au statut cible', async () => {
    const selected = baseScenario({
      status: ProjectScenarioStatus.SELECTED,
      isBaseline: true,
      selectedAt: new Date('2026-04-19T14:00:00.000Z'),
      selectedByUserId: 'user-1',
    });
    prisma.project.findFirst
      .mockResolvedValueOnce({ id: projectId })
      .mockResolvedValueOnce({ status: ProjectStatus.PLANNED });
    prisma.projectScenario.findFirst
      .mockResolvedValueOnce(baseScenario())
      .mockResolvedValueOnce({ id: 'scenario-old' });
    prisma.projectScenario.findMany.mockResolvedValue([{ id: 'scenario-old' }]);
    prisma.projectScenario.updateMany.mockResolvedValue({ count: 1 });
    prisma.projectScenario.update.mockResolvedValue(selected);

    const result = await service.selectAndTransition(clientId, projectId, 'scenario-1', {
      targetProjectStatus: 'PLANNED',
      decisionNote: null,
    });

    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(result.projectStatus).toBe(ProjectStatus.PLANNED);
  });

  it('selectAndTransition : refuse un scénario ARCHIVED', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(
      baseScenario({ status: ProjectScenarioStatus.ARCHIVED, isBaseline: false }),
    );

    await expect(
      service.selectAndTransition(clientId, projectId, 'scenario-1', {
        targetProjectStatus: 'IN_PROGRESS',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('selectAndTransition : mappe P2002 en conflit', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: projectId });
    prisma.projectScenario.findFirst.mockResolvedValue(baseScenario());
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.selectAndTransition(clientId, projectId, 'scenario-1', {
        targetProjectStatus: 'IN_PROGRESS',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
