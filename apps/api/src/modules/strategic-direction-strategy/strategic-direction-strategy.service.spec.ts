import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

describe('StrategicDirectionStrategyService', () => {
  const prisma = {
    $transaction: jest.fn(),
    strategicDirection: { findFirst: jest.fn() },
    strategicVision: { findFirst: jest.fn() },
    strategicAxis: { findMany: jest.fn() },
    strategicObjective: { findMany: jest.fn() },
    strategicDirectionStrategyAxisLink: { findMany: jest.fn(), createMany: jest.fn() },
    strategicDirectionStrategyObjectiveLink: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    strategicDirectionStrategy: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  let service: StrategicDirectionStrategyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StrategicDirectionStrategyService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('create rejette alignedVisionId hors client actif', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create('c1', {
        directionId: 'd1',
        alignedVisionId: 'foreign-v1',
        title: 'Titre',
        ambition: 'Ambition',
        context: 'Contexte',
        horizonLabel: '2028',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create mappe P2002 vers ConflictException', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce({
      id: 'v1',
      title: 'Vision',
      horizonLabel: '2028',
      isActive: true,
    });
    prisma.strategicDirectionStrategy.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create('c1', {
        directionId: 'd1',
        alignedVisionId: 'v1',
        title: 'Titre',
        ambition: 'Ambition',
        context: 'Contexte',
        horizonLabel: '2028',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('submit rejette alignedVisionId d’un autre client', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Titre',
      ambition: 'Ambition',
      context: 'Contexte',
      statement: 'Legacy',
      status: 'DRAFT',
    });
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.submit('c1', 's1', { alignedVisionId: 'foreign-v1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getLinks lève NotFound si stratégie absente', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce(null);
    await expect(service.getLinks('c1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaceStrategyAxes rejette si un axe nest pas sous la vision alignée', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      alignedVisionId: 'v1',
      status: 'DRAFT',
    });
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategyAxisLink: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        strategicAxis: {
          findMany: jest.fn().mockResolvedValue([{ id: 'ax1' }]),
        },
        strategicDirectionStrategyObjectiveLink: {
          deleteMany: jest.fn(),
        },
      }),
    );

    await expect(
      service.replaceStrategyAxes('c1', 's1', ['ax1', 'ax2']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaceStrategyObjectives rejette un objectif dont laxe nest pas parmi les axes liés', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      alignedVisionId: 'v1',
      status: 'DRAFT',
    });
    prisma.strategicDirectionStrategyAxisLink.findMany.mockResolvedValueOnce([
      { strategicAxisId: 'ax-good' },
    ]);
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategyObjectiveLink: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        strategicObjective: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                id: 'o1',
                axisId: 'ax-other',
                axis: { visionId: 'v1' },
              },
            ]),
        },
      }),
    );

    await expect(service.replaceStrategyObjectives('c1', 's1', ['o1'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('archive passe une stratégie APPROVED à ARCHIVED', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      status: 'APPROVED',
    });
    prisma.strategicDirectionStrategy.update.mockResolvedValueOnce({
      id: 's1',
      status: 'ARCHIVED',
      archivedAt: new Date('2026-01-01'),
      direction: { id: 'd1', code: 'DSI', name: 'DSI' },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
    });

    await service.archive('c1', 's1', { reason: 'Cycle clôturé' });
    expect(prisma.strategicDirectionStrategy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ARCHIVED',
        }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'strategic_direction_strategy.archived',
      }),
    );
  });

  it('archive rejette hors statut APPROVED', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      status: 'DRAFT',
    });
    await expect(service.archive('c1', 's1', { reason: 'N/A' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.strategicDirectionStrategy.update).not.toHaveBeenCalled();
  });

  it("update d'une stratégie APPROVED exige un motif d'adaptation", async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      status: 'APPROVED',
    });

    await expect(service.update('c1', 's1', { title: 'Nouveau titre' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("update d'une stratégie APPROVED archive un snapshot et repasse la stratégie en DRAFT", async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Titre actuel',
      ambition: 'Ambition',
      context: 'Contexte',
      statement: 'Statement',
      strategicPriorities: [],
      expectedOutcomes: [],
      kpis: [],
      majorInitiatives: [],
      risks: [],
      horizonLabel: '2028',
      ownerLabel: 'Owner',
      status: 'APPROVED',
      submittedAt: null,
      submittedByUserId: null,
      approvedAt: new Date('2026-01-01'),
      approvedByUserId: 'u1',
      rejectionReason: null,
    });
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategy: {
          create: jest.fn().mockResolvedValue({ id: 'snap-1' }),
          update: jest.fn().mockResolvedValue({
            id: 's1',
            title: 'Titre adapté',
            ambition: 'Ambition',
            context: 'Contexte',
            statement: 'Statement',
            horizonLabel: '2028',
            ownerLabel: 'Owner',
            status: 'DRAFT',
            direction: { id: 'd1', code: 'DIR', name: 'Direction' },
            alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
          }),
        },
        strategicDirectionStrategyAxisLink: {
          findMany: jest.fn().mockResolvedValue([{ strategicAxisId: 'ax1' }]),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        strategicDirectionStrategyObjectiveLink: {
          findMany: jest.fn().mockResolvedValue([{ strategicObjectiveId: 'obj1' }]),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    );

    const res = await service.update(
      'c1',
      's1',
      { title: 'Titre adapté', archiveReason: 'Contexte business changé' },
      { actorUserId: 'u2' },
    );

    expect(res.status).toBe('DRAFT');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
