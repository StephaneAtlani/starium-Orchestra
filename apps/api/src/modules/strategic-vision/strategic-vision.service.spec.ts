import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, StrategicLinkType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StrategicVisionService } from './strategic-vision.service';

type PrismaMock = {
  $transaction: jest.Mock;
  strategicVision: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
  };
  strategicAxis: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  strategicObjective: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  strategicLink: {
    findFirst: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    findMany: jest.Mock;
  };
  project: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

describe('StrategicVisionService', () => {
  let service: StrategicVisionService;
  let prisma: PrismaMock;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((fn: (tx: { strategicVision: { updateMany: jest.Mock; create: jest.Mock; update: jest.Mock } }) => unknown) =>
        fn({
          strategicVision: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({
              id: 'v1',
              clientId: 'c1',
              title: 'Vision 2026',
              statement: 'Statement',
              horizonLabel: '2026-2028',
              isActive: true,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'v1',
              clientId: 'c1',
              title: 'Vision 2026',
              statement: 'Statement',
              horizonLabel: '2026-2028',
              isActive: true,
            }),
          },
        }),
      ),
      strategicVision: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      strategicAxis: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      strategicObjective: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      strategicLink: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new StrategicVisionService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('createVision active la vision créée et audite strategic_vision.created', async () => {
    prisma.strategicVision.findFirst.mockResolvedValue({
      id: 'v1',
      clientId: 'c1',
      title: 'Vision 2026',
      statement: 'Statement',
      horizonLabel: '2026-2028',
      isActive: true,
      axes: [],
    });
    const out = await service.createVision(
      'c1',
      { title: 'Vision 2026', statement: 'Statement', horizonLabel: '2026-2028' },
      { actorUserId: 'u1' },
    );
    expect(out.id).toBe('v1');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'strategic_vision.created' }),
    );
  });

  it('addObjectiveLink rejette BUDGET en MVP', async () => {
    prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });
    await expect(
      service.addObjectiveLink('c1', 'o1', {
        linkType: StrategicLinkType.BUDGET,
        targetId: 'b1',
        targetLabelSnapshot: 'Budget 1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('addObjectiveLink rejette projet hors client actif', async () => {
    prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });
    prisma.project.findFirst.mockResolvedValue(null);
    await expect(
      service.addObjectiveLink('c1', 'o1', {
        linkType: StrategicLinkType.PROJECT,
        targetId: 'p1',
        targetLabelSnapshot: 'Projet A',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('addObjectiveLink mappe P2002 vers ConflictException', async () => {
    prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });
    prisma.project.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.strategicLink.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.addObjectiveLink('c1', 'o1', {
        linkType: StrategicLinkType.PROJECT,
        targetId: 'p1',
        targetLabelSnapshot: 'Projet A',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removeObjectiveLink rejette si lien hors scope client/objective', async () => {
    prisma.strategicLink.findFirst.mockResolvedValue(null);
    await expect(service.removeObjectiveLink('c1', 'o1', 'l1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getKpis calcule ratios et compteurs selon règles RFC-STRAT-002', async () => {
    prisma.project.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
    prisma.strategicObjective.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4);
    prisma.strategicLink.findMany.mockResolvedValue([{ targetId: 'p1' }, { targetId: 'p2' }]);

    const out = await service.getKpis('c1');

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          status: { not: 'ARCHIVED' },
        }),
      }),
    );
    expect(prisma.strategicObjective.count).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          deadline: expect.objectContaining({ not: null }),
          status: { notIn: ['COMPLETED', 'ARCHIVED'] },
        }),
      }),
    );
    expect(prisma.strategicLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'c1',
          linkType: StrategicLinkType.PROJECT,
          targetId: { in: ['p1', 'p2', 'p3'] },
        },
      }),
    );
    expect(out.objectivesAtRiskCount).toBe(2);
    expect(out.objectivesOffTrackCount).toBe(1);
    expect(out.overdueObjectivesCount).toBe(4);
    expect(out.unalignedProjectsCount).toBe(1);
    expect(out.projectAlignmentRate).toBeCloseTo(2 / 3);
    expect(new Date(out.generatedAt).toISOString()).toBe(out.generatedAt);
  });

  it('getKpis retourne un ratio 0 quand aucun projet actif', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    prisma.strategicObjective.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.strategicLink.findMany.mockResolvedValue([]);

    const out = await service.getKpis('c1');

    expect(prisma.strategicLink.findMany).not.toHaveBeenCalled();
    expect(out.projectAlignmentRate).toBe(0);
    expect(out.unalignedProjectsCount).toBe(0);
  });

  it('getAlerts retourne les alertes MVP avec mapping complet', async () => {
    prisma.strategicObjective.findMany
      .mockResolvedValueOnce([
        {
          id: 'o-overdue',
          title: 'Objectif Retard',
          deadline: new Date('2026-02-01T00:00:00.000Z'),
          updatedAt: new Date('2026-02-03T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'o-offtrack',
          title: 'Objectif Hors Trajectoire',
          updatedAt: new Date('2026-02-05T00:00:00.000Z'),
        },
      ]);
    const out = await service.getAlerts('c1');

    expect(prisma.strategicObjective.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.strategicLink.findMany).not.toHaveBeenCalled();
    expect(out.total).toBe(2);
    expect(out.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'OBJECTIVE_OVERDUE',
          severity: 'HIGH',
          targetType: 'OBJECTIVE',
          targetLabel: 'Objectif Retard',
          message: expect.stringContaining('Objectif en retard'),
        }),
        expect.objectContaining({
          type: 'OBJECTIVE_OFF_TRACK',
          severity: 'CRITICAL',
          targetType: 'OBJECTIVE',
          targetLabel: 'Objectif Hors Trajectoire',
          message: expect.stringContaining('Objectif hors trajectoire'),
        }),
      ]),
    );
    expect(out.items.every((item) => new Date(item.createdAt).toISOString() === item.createdAt)).toBe(
      true,
    );
  });

  it('getAlerts retourne vide si aucun objectif en alerte', async () => {
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const out = await service.getAlerts('c1');

    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.strategicLink.findMany).not.toHaveBeenCalled();
    expect(out).toEqual({ items: [], total: 0 });
  });
});
