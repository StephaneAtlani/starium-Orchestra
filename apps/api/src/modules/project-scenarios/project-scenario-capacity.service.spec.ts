import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectScenarioStatus, ResourceType } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectScenarioCapacityService } from './project-scenario-capacity.service';

describe('ProjectScenarioCapacityService', () => {
  let service: ProjectScenarioCapacityService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  const clientId = 'client-1';
  const projectId = 'project-1';
  const scenarioId = 'scenario-1';

  beforeEach(() => {
    prisma = {
      projectScenario: { findFirst: jest.fn() },
      projectScenarioResourcePlan: { findMany: jest.fn() },
      projectScenarioCapacitySnapshot: {
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      resource: { delete: jest.fn() },
      $transaction: jest.fn(async (input: unknown) => {
        if (typeof input === 'function') {
          return input(prisma);
        }
        return Promise.all(input as Promise<unknown>[]);
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectScenarioCapacityService(prisma, auditLogs as unknown as AuditLogsService);
    prisma.projectScenario.findFirst.mockResolvedValue({
      id: scenarioId,
      status: ProjectScenarioStatus.DRAFT,
    });
  });

  it('recompute détecte une surcharge si plannedLoadPct > 100', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValueOnce([
      {
        resourceId: 'res-1',
        allocationPct: new Prisma.Decimal('120.00'),
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    prisma.projectScenarioCapacitySnapshot.deleteMany.mockResolvedValueOnce({ count: 0 });
    prisma.projectScenarioCapacitySnapshot.createMany.mockResolvedValueOnce({ count: 1 });

    await service.recompute(clientId, projectId, scenarioId);

    expect(prisma.projectScenarioCapacitySnapshot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            plannedLoadPct: new Prisma.Decimal('120.00'),
            availableCapacityPct: new Prisma.Decimal('100.00'),
            variancePct: new Prisma.Decimal('-20.00'),
            status: 'OVER_CAPACITY',
          }),
        ],
      }),
    );
  });

  it('recompute détecte une sous-charge si plannedLoadPct < 100', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValueOnce([
      {
        resourceId: 'res-1',
        allocationPct: new Prisma.Decimal('40.00'),
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    prisma.projectScenarioCapacitySnapshot.deleteMany.mockResolvedValueOnce({ count: 0 });
    prisma.projectScenarioCapacitySnapshot.createMany.mockResolvedValueOnce({ count: 1 });

    await service.recompute(clientId, projectId, scenarioId);

    expect(prisma.projectScenarioCapacitySnapshot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            status: 'UNDER_CAPACITY',
            variancePct: new Prisma.Decimal('60.00'),
          }),
        ],
      }),
    );
  });

  it('recompute produit un statut OK si plannedLoadPct = 100', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValueOnce([
      {
        resourceId: 'res-1',
        allocationPct: new Prisma.Decimal('100.00'),
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    prisma.projectScenarioCapacitySnapshot.deleteMany.mockResolvedValueOnce({ count: 0 });
    prisma.projectScenarioCapacitySnapshot.createMany.mockResolvedValueOnce({ count: 1 });

    await service.recompute(clientId, projectId, scenarioId);

    expect(prisma.projectScenarioCapacitySnapshot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ status: 'OK', variancePct: new Prisma.Decimal('0.00') })],
      }),
    );
  });

  it('somme plusieurs plans sur la même ressource et le même jour', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValueOnce([
      {
        resourceId: 'res-1',
        allocationPct: new Prisma.Decimal('40.00'),
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
      },
      {
        resourceId: 'res-1',
        allocationPct: new Prisma.Decimal('30.00'),
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    prisma.projectScenarioCapacitySnapshot.deleteMany.mockResolvedValueOnce({ count: 0 });
    prisma.projectScenarioCapacitySnapshot.createMany.mockResolvedValueOnce({ count: 1 });

    await service.recompute(clientId, projectId, scenarioId);

    expect(prisma.projectScenarioCapacitySnapshot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ plannedLoadPct: new Prisma.Decimal('70.00') })],
      }),
    );
  });

  it('recompute est idempotent et replace full', async () => {
    prisma.projectScenarioResourcePlan.findMany.mockResolvedValue([
      {
        resourceId: 'res-1',
        allocationPct: new Prisma.Decimal('50.00'),
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);
    prisma.projectScenarioCapacitySnapshot.deleteMany.mockResolvedValue({ count: 2 });
    prisma.projectScenarioCapacitySnapshot.createMany.mockResolvedValue({ count: 1 });

    const first = await service.recompute(clientId, projectId, scenarioId);
    const second = await service.recompute(clientId, projectId, scenarioId);

    expect(prisma.projectScenarioCapacitySnapshot.deleteMany).toHaveBeenCalledWith({
      where: { clientId, projectId, scenarioId },
    });
    expect(first).toEqual({ scenarioId, deletedCount: 2, createdCount: 1 });
    expect(second).toEqual({ scenarioId, deletedCount: 2, createdCount: 1 });
  });

  it('refuse recompute si scénario archivé', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce({
      id: scenarioId,
      status: ProjectScenarioStatus.ARCHIVED,
    });

    await expect(service.recompute(clientId, projectId, scenarioId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('applique une isolation stricte client/projet/scénario', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce(null);
    await expect(service.list(clientId, projectId, scenarioId, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('GET /capacity renvoie le format paginé et sérialise les décimaux en string', async () => {
    prisma.projectScenarioCapacitySnapshot.findMany.mockResolvedValueOnce([
      {
        id: 'snap-1',
        clientId,
        projectId,
        scenarioId,
        resourceId: 'res-1',
        snapshotDate: new Date('2026-06-01T00:00:00.000Z'),
        plannedLoadPct: new Prisma.Decimal('70.00'),
        availableCapacityPct: new Prisma.Decimal('100.00'),
        variancePct: new Prisma.Decimal('30.00'),
        status: 'UNDER_CAPACITY',
        resource: { id: 'res-1', name: 'Alice', type: ResourceType.HUMAN },
      },
    ]);
    prisma.projectScenarioCapacitySnapshot.count.mockResolvedValueOnce(1);

    const result = await service.list(clientId, projectId, scenarioId, { limit: 20, offset: 0 });

    expect(result).toEqual({
      items: [
        {
          id: 'snap-1',
          clientId,
          projectId,
          scenarioId,
          resourceId: 'res-1',
          snapshotDate: '2026-06-01T00:00:00.000Z',
          plannedLoadPct: '70',
          availableCapacityPct: '100',
          variancePct: '30',
          status: 'UNDER_CAPACITY',
          resource: { id: 'res-1', name: 'Alice', type: ResourceType.HUMAN },
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('GET /capacity retourne items = [] si zéro snapshot', async () => {
    prisma.projectScenarioCapacitySnapshot.findMany.mockResolvedValueOnce([]);
    prisma.projectScenarioCapacitySnapshot.count.mockResolvedValueOnce(0);

    const result = await service.list(clientId, projectId, scenarioId, {});
    expect(result).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('GET /capacity-summary retourne 0/null si zéro snapshot', async () => {
    prisma.projectScenarioCapacitySnapshot.findMany.mockResolvedValueOnce([]);

    const summary = await service.getSummary(clientId, projectId, scenarioId);
    expect(summary).toEqual({
      overCapacityCount: 0,
      underCapacityCount: 0,
      peakLoadPct: null,
      averageLoadPct: null,
    });
  });

  it('refuse la suppression Resource quand référencée par snapshot (Restrict)', async () => {
    prisma.resource.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(prisma.resource.delete({ where: { id: 'res-1' } })).rejects.toThrow();
  });
});
