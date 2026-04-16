import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectScenarioStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectScenariosService } from './project-scenarios.service';

describe('ProjectScenariosService', () => {
  let service: ProjectScenariosService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

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
      },
      projectScenario: {
        findMany: jest.fn(),
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
    service = new ProjectScenariosService(
      prisma,
      auditLogs as unknown as AuditLogsService,
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
});
