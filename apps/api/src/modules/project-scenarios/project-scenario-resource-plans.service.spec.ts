import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectScenarioStatus, ResourceType } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectScenarioResourcePlansService } from './project-scenario-resource-plans.service';

describe('ProjectScenarioResourcePlansService', () => {
  let service: ProjectScenarioResourcePlansService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  const clientId = 'client-1';
  const projectId = 'project-1';
  const scenarioId = 'scenario-1';

  const scenario = {
    id: scenarioId,
    clientId,
    projectId,
    status: ProjectScenarioStatus.DRAFT,
  };

  beforeEach(() => {
    prisma = {
      projectScenario: { findFirst: jest.fn().mockResolvedValue(scenario) },
      resource: { findFirst: jest.fn() },
      projectScenarioResourcePlan: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (input: unknown) => {
        if (Array.isArray(input)) return Promise.all(input);
        if (typeof input === 'function') return input(prisma);
        return input;
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectScenarioResourcePlansService(
      prisma,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it("refuse une ressource d'un autre client", async () => {
    prisma.resource.findFirst.mockResolvedValue(null);

    await expect(
      service.create(clientId, projectId, scenarioId, { resourceId: 'foreign-resource' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuse allocationPct hors bornes', async () => {
    prisma.resource.findFirst.mockResolvedValue({
      id: 'resource-1',
      name: 'Alice',
      code: 'R1',
      type: ResourceType.HUMAN,
      dailyRate: new Prisma.Decimal('500'),
    });

    await expect(
      service.create(clientId, projectId, scenarioId, {
        resourceId: 'resource-1',
        allocationPct: '150',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse plannedDays négatif', async () => {
    prisma.resource.findFirst.mockResolvedValue({
      id: 'resource-1',
      name: 'Alice',
      code: 'R1',
      type: ResourceType.HUMAN,
      dailyRate: new Prisma.Decimal('500'),
    });

    await expect(
      service.create(clientId, projectId, scenarioId, {
        resourceId: 'resource-1',
        plannedDays: '-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse endDate < startDate', async () => {
    prisma.resource.findFirst.mockResolvedValue({
      id: 'resource-1',
      name: 'Alice',
      code: 'R1',
      type: ResourceType.HUMAN,
      dailyRate: new Prisma.Decimal('500'),
    });

    await expect(
      service.create(clientId, projectId, scenarioId, {
        resourceId: 'resource-1',
        startDate: new Date('2026-05-10T00:00:00.000Z'),
        endDate: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('plannedCostTotal: HUMAN + dailyRate uniquement', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValue([
      {
        id: 'p1',
        clientId,
        scenarioId,
        resourceId: 'r1',
        roleLabel: null,
        allocationPct: null,
        plannedDays: new Prisma.Decimal('5'),
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r1',
          name: 'Alice',
          code: 'R1',
          type: ResourceType.HUMAN,
          dailyRate: new Prisma.Decimal('300'),
        },
      },
      {
        id: 'p2',
        clientId,
        scenarioId,
        resourceId: 'r2',
        roleLabel: null,
        allocationPct: null,
        plannedDays: new Prisma.Decimal('10'),
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r2',
          name: 'Laptop',
          code: 'MAT1',
          type: ResourceType.MATERIAL,
          dailyRate: new Prisma.Decimal('100'),
        },
      },
      {
        id: 'p3',
        clientId,
        scenarioId,
        resourceId: 'r3',
        roleLabel: null,
        allocationPct: null,
        plannedDays: new Prisma.Decimal('4'),
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r3',
          name: 'Bob',
          code: 'R2',
          type: ResourceType.HUMAN,
          dailyRate: null,
        },
      },
    ]);

    const summary = await service.getSummary(clientId, projectId, scenarioId);
    expect(summary.plannedCostTotal).toBe('1500');
    expect(summary.plannedDaysTotal).toBe('19');
  });

  it('distinctResources compte une ressource unique même avec plusieurs plans', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValue([
      {
        id: 'p1',
        clientId,
        scenarioId,
        resourceId: 'r1',
        roleLabel: null,
        allocationPct: null,
        plannedDays: new Prisma.Decimal('2'),
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r1',
          name: 'Alice',
          code: 'R1',
          type: ResourceType.HUMAN,
          dailyRate: new Prisma.Decimal('100'),
        },
      },
      {
        id: 'p2',
        clientId,
        scenarioId,
        resourceId: 'r1',
        roleLabel: null,
        allocationPct: null,
        plannedDays: new Prisma.Decimal('3'),
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r1',
          name: 'Alice',
          code: 'R1',
          type: ResourceType.HUMAN,
          dailyRate: new Prisma.Decimal('100'),
        },
      },
    ]);

    const summary = await service.getSummary(clientId, projectId, scenarioId);
    expect(summary.distinctResources).toBe(1);
  });

  it('plannedFtePeak calcule le pic avec chevauchement', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValue([
      {
        id: 'p1',
        clientId,
        scenarioId,
        resourceId: 'r1',
        roleLabel: null,
        allocationPct: new Prisma.Decimal('50'),
        plannedDays: null,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-03T00:00:00.000Z'),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r1',
          name: 'Alice',
          code: 'R1',
          type: ResourceType.HUMAN,
          dailyRate: new Prisma.Decimal('100'),
        },
      },
      {
        id: 'p2',
        clientId,
        scenarioId,
        resourceId: 'r2',
        roleLabel: null,
        allocationPct: new Prisma.Decimal('70'),
        plannedDays: null,
        startDate: new Date('2026-06-02T00:00:00.000Z'),
        endDate: new Date('2026-06-02T00:00:00.000Z'),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r2',
          name: 'Bob',
          code: 'R2',
          type: ResourceType.HUMAN,
          dailyRate: new Prisma.Decimal('100'),
        },
      },
    ]);

    const summary = await service.getSummary(clientId, projectId, scenarioId);
    expect(summary.plannedFtePeak).toBe('1.2');
  });

  it('plannedFtePeak = null si données insuffisantes', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValue([
      {
        id: 'p1',
        clientId,
        scenarioId,
        resourceId: 'r1',
        roleLabel: null,
        allocationPct: null,
        plannedDays: new Prisma.Decimal('5'),
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        resource: {
          id: 'r1',
          name: 'Alice',
          code: 'R1',
          type: ResourceType.HUMAN,
          dailyRate: new Prisma.Decimal('100'),
        },
      },
    ]);

    const summary = await service.getSummary(clientId, projectId, scenarioId);
    expect(summary.plannedFtePeak).toBeNull();
  });

  it('refuse mutations si scénario ARCHIVED', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce({
      ...scenario,
      status: ProjectScenarioStatus.ARCHIVED,
    });

    await expect(
      service.create(clientId, projectId, scenarioId, { resourceId: 'resource-1' }),
    ).rejects.toThrow(ConflictException);
  });
});
