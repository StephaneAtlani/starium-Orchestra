import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  StrategicAxisStatus,
  StrategicLinkType,
  StrategicObjectiveHealthStatus,
  StrategicObjectiveLifecycleStatus,
  StrategicObjectiveStatus,
  StrategicVisionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StrategicVisionService } from './strategic-vision.service';
import { StrategicDirectionKpiRowDto } from './dto/strategic-vision-kpis-by-direction-response.dto';

type PrismaMock = {
  $transaction: jest.Mock;
  strategicVision: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
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
  strategicDirection: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  strategicDirectionStrategy: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  strategicLink: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findMany: jest.Mock;
  };
  project: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  clientUser: {
    findFirst: jest.Mock;
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
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
      strategicDirection: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      strategicDirectionStrategy: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      strategicLink: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      clientUser: {
        findFirst: jest.fn(),
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

  it('listVisions exclut ARCHIVED par défaut', async () => {
    prisma.strategicVision.findMany.mockResolvedValue([]);

    await service.listVisions('c1');

    expect(prisma.strategicVision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          status: { not: StrategicVisionStatus.ARCHIVED },
        }),
      }),
    );
  });

  it('listVisions applique status/search/includeArchived', async () => {
    prisma.strategicVision.findMany.mockResolvedValue([]);

    await service.listVisions('c1', {
      status: StrategicVisionStatus.ACTIVE,
      search: '2026',
      includeArchived: true,
    });

    expect(prisma.strategicVision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          status: StrategicVisionStatus.ACTIVE,
          OR: expect.arrayContaining([
            expect.objectContaining({
              title: expect.objectContaining({ contains: '2026', mode: 'insensitive' }),
            }),
          ]),
        }),
      }),
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
          status: { notIn: ['ARCHIVED', 'CANCELLED', 'COMPLETED'] },
        }),
      }),
    );
    expect(prisma.strategicObjective.count).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          OR: expect.arrayContaining([
            expect.objectContaining({
              targetDate: expect.objectContaining({}),
            }),
          ]),
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

  it('getAlerts retourne les alertes RFC-008 avec tri stable et IDs deterministes', async () => {
    prisma.strategicObjective.findMany
      .mockResolvedValueOnce([
        {
          id: 'o-overdue',
          title: 'Objectif Retard',
          targetDate: new Date('2026-02-02T00:00:00.000Z'),
          deadline: new Date('2026-02-01T00:00:00.000Z'),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-02-03T00:00:00.000Z'),
          directionId: null,
          direction: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'o-offtrack',
          title: 'Objectif Hors Trajectoire',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-02-05T00:00:00.000Z'),
          directionId: 'd1',
          direction: { name: 'DSI' },
        },
      ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p-uuid-1',
        code: 'PRJ-001',
        name: 'Projet Alignement',
        createdAt: new Date('2026-01-05T00:00:00.000Z'),
        updatedAt: new Date('2026-02-04T00:00:00.000Z'),
      },
      {
        id: 'p-uuid-2',
        code: 'PRJ-002',
        name: 'Projet DSI',
        createdAt: new Date('2026-01-06T00:00:00.000Z'),
        updatedAt: new Date('2026-02-06T00:00:00.000Z'),
      },
    ]);
    prisma.strategicLink.findMany.mockResolvedValue([{ targetId: 'p-uuid-1' }]);

    const out = await service.getAlerts('c1');

    expect(prisma.strategicObjective.findMany).toHaveBeenCalledTimes(2);
    expect(out.total).toBe(3);
    expect(out.items[0]).toEqual(
      expect.objectContaining({
        id: 'strategic-objective-off-track:o-offtrack',
        type: 'OBJECTIVE_OFF_TRACK',
        severity: 'CRITICAL',
        targetType: 'OBJECTIVE',
        directionId: 'd1',
        directionName: 'DSI',
        targetLabel: 'Objectif Hors Trajectoire',
        message: expect.stringContaining('Objectif hors trajectoire'),
      }),
    );
    expect(out.items[1]).toEqual(
      expect.objectContaining({
        id: 'strategic-objective-overdue:o-overdue',
        type: 'OBJECTIVE_OVERDUE',
        severity: 'HIGH',
        targetType: 'OBJECTIVE',
        directionId: null,
        directionName: 'Non affecté',
        targetLabel: 'Objectif Retard',
      }),
    );
    expect(out.items[2]).toEqual(
      expect.objectContaining({
        id: 'strategic-project-unaligned:p-uuid-2',
        type: 'PROJECT_UNALIGNED',
        severity: 'MEDIUM',
        targetType: 'PROJECT',
        targetLabel: 'PRJ-002 - Projet DSI',
      }),
    );
    expect(out.items.every((item) => new Date(item.createdAt).toISOString() === item.createdAt)).toBe(
      true,
    );
  });

  it('getAlerts retourne vide si aucun objectif ni projet non aligne', async () => {
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.project.findMany.mockResolvedValue([]);

    const out = await service.getAlerts('c1');

    expect(prisma.strategicLink.findMany).not.toHaveBeenCalled();
    expect(out).toEqual({ items: [], total: 0 });
  });

  it('getAlerts genere PROJECT_UNALIGNED pour projet actif sans lien PROJECT', async () => {
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p-uuid-3',
        code: 'PRJ-003',
        name: 'Projet Sans Lien',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-02-10T00:00:00.000Z'),
      },
    ]);
    prisma.strategicLink.findMany.mockResolvedValue([]);

    const out = await service.getAlerts('c1');
    expect(out.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'strategic-project-unaligned:p-uuid-3',
          type: 'PROJECT_UNALIGNED',
          severity: 'MEDIUM',
          targetLabel: 'PRJ-003 - Projet Sans Lien',
        }),
      ]),
    );
  });

  it('getAlerts ne genere pas PROJECT_UNALIGNED pour projet actif avec lien PROJECT', async () => {
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p-uuid-4',
        code: 'PRJ-004',
        name: 'Projet Aligne',
        createdAt: new Date('2026-01-11T00:00:00.000Z'),
        updatedAt: new Date('2026-02-11T00:00:00.000Z'),
      },
    ]);
    prisma.strategicLink.findMany.mockResolvedValue([{ targetId: 'p-uuid-4' }]);

    const out = await service.getAlerts('c1');
    expect(out.items.find((item) => item.type === 'PROJECT_UNALIGNED')).toBeUndefined();
  });

  it('createObjective rejette une direction hors client actif', async () => {
    prisma.strategicAxis.findFirst.mockResolvedValue({ id: 'a1' });
    prisma.strategicDirection.findFirst.mockResolvedValue(null);

    await expect(
      service.createObjective('c1', {
        axisId: 'a1',
        title: 'Objectif',
        directionId: 'd-foreign',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateObjective audite strategic_objective.direction_changed', async () => {
    prisma.strategicObjective.findFirst
      .mockResolvedValueOnce({
        id: 'o1',
        clientId: 'c1',
        title: 'Objectif',
        description: null,
        ownerLabel: null,
        status: 'ON_TRACK',
        deadline: null,
        directionId: 'd-old',
      })
      .mockResolvedValueOnce({
        id: 'o1',
        clientId: 'c1',
        title: 'Objectif',
        description: null,
        ownerLabel: null,
        status: 'ON_TRACK',
        deadline: null,
        directionId: 'd-new',
        direction: { id: 'd-new', code: 'DSI', name: 'DSI', isActive: true },
        links: [],
      });
    prisma.strategicDirection.findFirst.mockResolvedValue({ id: 'd-new', clientId: 'c1' });
    prisma.strategicObjective.update.mockResolvedValue({
      id: 'o1',
      clientId: 'c1',
      title: 'Objectif',
      description: null,
      ownerLabel: null,
      status: 'ON_TRACK',
      deadline: null,
      directionId: 'd-new',
    });

    await service.updateObjective('c1', 'o1', { directionId: 'd-new' }, { actorUserId: 'u1' });

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'strategic_objective.direction_changed' }),
    );
  });

  it('getKpisByDirection retourne actifs, inactifs référencés et Non affecté', async () => {
    prisma.project.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    prisma.strategicObjective.findMany
      .mockResolvedValueOnce([{ directionId: 'd1' }, { directionId: 'd2' }])
      .mockResolvedValueOnce([]);
    prisma.strategicDirection.findMany
      .mockResolvedValueOnce([{ id: 'd1', code: 'DSI', name: 'DSI', sortOrder: 1, isActive: true }])
      .mockResolvedValueOnce([{ id: 'd2', code: 'DAF', name: 'DAF', sortOrder: 2, isActive: false }]);
    prisma.strategicObjective.count.mockImplementation(async (args: { where: { directionId?: string | null; status?: { in?: string[]; notIn?: string[] } } }) => {
      const directionId = Object.prototype.hasOwnProperty.call(args.where, 'directionId')
        ? args.where.directionId
        : 'GLOBAL';
      if (args.where.status?.in?.includes('AT_RISK')) return directionId === 'd1' ? 1 : 0;
      if (args.where.status?.in?.includes('OFF_TRACK')) return directionId === 'd2' ? 1 : 0;
      if (args.where.status?.notIn) return directionId === null ? 2 : 0;
      return 0;
    });
    prisma.strategicLink.findMany.mockImplementation(async (args: { where: { objective?: { directionId?: string | null } } }) => {
      const directionId = args.where.objective?.directionId;
      if (directionId === 'd1') return [{ targetId: 'p1' }];
      if (directionId === 'd2') return [{ targetId: 'p2' }];
      if (directionId === null) return [{ targetId: 'p1' }];
      return [{ targetId: 'p1' }, { targetId: 'p2' }];
    });

    const out = await service.getKpisByDirection('c1');

    expect(out.rows.map((row: StrategicDirectionKpiRowDto) => row.directionCode)).toEqual([
      'DSI',
      'DAF',
      'UNASSIGNED',
    ]);
    expect(
      out.rows.find((row: StrategicDirectionKpiRowDto) => row.directionCode === 'UNASSIGNED')
        ?.directionId,
    ).toBeNull();
    expect(
      out.rows.find((row: StrategicDirectionKpiRowDto) => row.directionCode === 'DSI')
        ?.projectAlignmentRate,
    ).toBe(0.5);
    expect(out.global.projectAlignmentRate).toBe(1);
  });

  it('getAlerts applique le filtre unassigned=true', async () => {
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p-unassigned',
        code: 'PRJ-U',
        name: 'Projet Unassigned',
        createdAt: new Date('2026-01-12T00:00:00.000Z'),
        updatedAt: new Date('2026-02-12T00:00:00.000Z'),
      },
    ]);
    prisma.strategicLink.findMany.mockResolvedValue([]);

    const out = await service.getAlerts('c1', { unassigned: true });

    expect(prisma.strategicObjective.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          directionId: null,
        }),
      }),
    );
    expect(prisma.strategicLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          objective: { directionId: null },
        }),
      }),
    );
    expect(out.items.find((item) => item.type === 'PROJECT_UNALIGNED')).toBeDefined();
  });

  it('getAlerts applique le filtre directionId aux alertes projet', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValue({ id: 'd1', clientId: 'c1' });
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p-direction',
        code: 'PRJ-D',
        name: 'Projet Direction',
        createdAt: new Date('2026-01-13T00:00:00.000Z'),
        updatedAt: new Date('2026-02-13T00:00:00.000Z'),
      },
    ]);
    prisma.strategicLink.findMany.mockResolvedValue([]);

    await service.getAlerts('c1', { directionId: 'd1' });
    expect(prisma.strategicLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          objective: { directionId: 'd1' },
        }),
      }),
    );
  });

  it('activePortfolioProjectsWhere exclut ARCHIVED/CANCELLED/COMPLETED', async () => {
    prisma.strategicObjective.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prisma.project.findMany.mockResolvedValue([]);

    await service.getAlerts('c1');
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'c1',
          status: { notIn: ['ARCHIVED', 'CANCELLED', 'COMPLETED'] },
        }),
      }),
    );
  });

  it('getAlerts rejette directionId + unassigned', async () => {
    await expect(
      service.getAlerts('c1', { directionId: 'd1', unassigned: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteDirection supprime et audite quand aucune stratégie de direction', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValue({
      id: 'd1',
      clientId: 'c1',
      code: 'DSI',
      name: 'DSI',
      description: null,
      sortOrder: 1,
      isActive: true,
      _count: { strategies: 0 },
    });
    prisma.strategicDirection.delete.mockResolvedValue({ id: 'd1' });

    await service.deleteDirection('c1', 'd1', { actorUserId: 'u1' });

    expect(prisma.strategicDirection.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'strategic_direction.deleted' }),
    );
  });

  it('deleteDirection rejette si des stratégies de direction subsistent', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValue({
      id: 'd1',
      clientId: 'c1',
      code: 'DSI',
      name: 'DSI',
      description: null,
      sortOrder: 1,
      isActive: true,
      _count: { strategies: 2 },
    });

    await expect(service.deleteDirection('c1', 'd1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.strategicDirection.delete).not.toHaveBeenCalled();
  });

  it('deleteDirection renvoie NotFound si direction absente', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValue(null);

    await expect(service.deleteDirection('c1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  // ===================================================================
  // RFC-STRAT-007 — Vision V1
  // ===================================================================

  describe('RFC-STRAT-007 — archivage logique et règles V1', () => {
    it('archiveVision met status=ARCHIVED, isActive=false et audite strategic_vision.archived', async () => {
      prisma.strategicVision.findFirst
        .mockResolvedValueOnce({
          id: 'v1',
          clientId: 'c1',
          status: StrategicVisionStatus.ACTIVE,
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'v1',
          clientId: 'c1',
          status: StrategicVisionStatus.ARCHIVED,
          isActive: false,
          axes: [],
        });
      prisma.strategicVision.update.mockResolvedValue({ id: 'v1' });

      await service.archiveVision('c1', 'v1', { actorUserId: 'u1' });

      expect(prisma.strategicVision.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: { status: 'ARCHIVED', isActive: false },
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'strategic_vision.archived' }),
      );
    });

    it('updateVision rejette toute modif sur vision ARCHIVED', async () => {
      prisma.strategicVision.findFirst.mockResolvedValue({
        id: 'v1',
        clientId: 'c1',
        status: StrategicVisionStatus.ARCHIVED,
        isActive: false,
        title: 't',
        statement: 's',
        horizonLabel: 'h',
      });

      await expect(
        service.updateVision('c1', 'v1', { title: 'New' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updateVision partiel garde la cohérence isActive ↔ status', async () => {
      prisma.strategicVision.findFirst
        .mockResolvedValueOnce({
          id: 'v1',
          clientId: 'c1',
          status: StrategicVisionStatus.DRAFT,
          isActive: false,
          title: 't',
          statement: 's',
          horizonLabel: 'h',
        })
        .mockResolvedValueOnce({
          id: 'v1',
          clientId: 'c1',
          status: StrategicVisionStatus.ACTIVE,
          isActive: true,
          title: 't',
          statement: 's',
          horizonLabel: 'h',
          axes: [],
        });

      await service.updateVision('c1', 'v1', { isActive: true });

      expect(prisma.strategicVision.update).not.toHaveBeenCalled();
    });

    it('createAxis rejette si vision ARCHIVED', async () => {
      prisma.strategicVision.findFirst.mockResolvedValue({
        id: 'v1',
        status: StrategicVisionStatus.ARCHIVED,
      });

      await expect(
        service.createAxis('c1', { visionId: 'v1', name: 'Axe' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('archiveAxis met status=ARCHIVED et audite strategic_axis.archived', async () => {
      prisma.strategicAxis.findFirst.mockResolvedValue({
        id: 'a1',
        clientId: 'c1',
        visionId: 'v1',
        status: StrategicAxisStatus.ACTIVE,
      });
      prisma.strategicAxis.update.mockResolvedValue({
        id: 'a1',
        status: StrategicAxisStatus.ARCHIVED,
      });

      await service.archiveAxis('c1', 'v1', 'a1', { actorUserId: 'u1' });

      expect(prisma.strategicAxis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: { status: 'ARCHIVED' },
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'strategic_axis.archived' }),
      );
    });

    it('archiveObjective met lifecycleStatus=ARCHIVED, status=ARCHIVED, healthStatus=null', async () => {
      prisma.strategicObjective.findFirst
        .mockResolvedValueOnce({
          id: 'o1',
          clientId: 'c1',
          status: StrategicObjectiveStatus.ON_TRACK,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
          healthStatus: StrategicObjectiveHealthStatus.ON_TRACK,
        })
        .mockResolvedValueOnce({
          id: 'o1',
          clientId: 'c1',
          status: StrategicObjectiveStatus.ARCHIVED,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.ARCHIVED,
          healthStatus: null,
          links: [],
          direction: null,
        });
      prisma.strategicObjective.update.mockResolvedValue({ id: 'o1' });

      await service.archiveObjective('c1', 'o1', { actorUserId: 'u1' });

      expect(prisma.strategicObjective.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'ARCHIVED',
            lifecycleStatus: 'ARCHIVED',
            healthStatus: null,
          },
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'strategic_objective.archived' }),
      );
    });
  });

  describe('RFC-STRAT-007 — bornes et synchronisation statuts objectif', () => {
    it('createObjective rejette progressPercent=150', async () => {
      prisma.strategicAxis.findFirst.mockResolvedValue({
        id: 'a1',
        status: StrategicAxisStatus.ACTIVE,
        visionId: 'v1',
      });
      prisma.strategicVision.findFirst.mockResolvedValue({
        id: 'v1',
        status: StrategicVisionStatus.ACTIVE,
      });

      await expect(
        service.createObjective('c1', {
          axisId: 'a1',
          title: 'Objectif',
          progressPercent: 150,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updateObjective partiel garde la cohérence status ↔ lifecycleStatus ↔ healthStatus', async () => {
      prisma.strategicObjective.findFirst
        .mockResolvedValueOnce({
          id: 'o1',
          clientId: 'c1',
          title: 'Objectif',
          description: null,
          ownerLabel: null,
          ownerUserId: null,
          status: StrategicObjectiveStatus.ON_TRACK,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
          healthStatus: StrategicObjectiveHealthStatus.ON_TRACK,
          progressPercent: 0,
          deadline: null,
          targetDate: null,
          directionId: null,
        })
        .mockResolvedValueOnce({
          id: 'o1',
          clientId: 'c1',
          status: StrategicObjectiveStatus.AT_RISK,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
          healthStatus: StrategicObjectiveHealthStatus.AT_RISK,
          links: [],
          direction: null,
        });
      prisma.strategicObjective.update.mockResolvedValue({
        id: 'o1',
        clientId: 'c1',
        status: StrategicObjectiveStatus.AT_RISK,
        lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
        healthStatus: StrategicObjectiveHealthStatus.AT_RISK,
        directionId: null,
      });

      await service.updateObjective(
        'c1',
        'o1',
        { status: StrategicObjectiveStatus.AT_RISK },
      );

      expect(prisma.strategicObjective.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o1' },
          data: expect.objectContaining({
            status: 'AT_RISK',
            lifecycleStatus: 'ACTIVE',
            healthStatus: 'AT_RISK',
          }),
        }),
      );
    });

    it('updateObjective avec lifecycleStatus=COMPLETED force status=COMPLETED et healthStatus=null', async () => {
      prisma.strategicObjective.findFirst
        .mockResolvedValueOnce({
          id: 'o1',
          clientId: 'c1',
          status: StrategicObjectiveStatus.ON_TRACK,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.ACTIVE,
          healthStatus: StrategicObjectiveHealthStatus.ON_TRACK,
          progressPercent: 50,
          deadline: null,
          targetDate: null,
          directionId: null,
          title: 't',
          description: null,
          ownerLabel: null,
          ownerUserId: null,
        })
        .mockResolvedValueOnce({
          id: 'o1',
          clientId: 'c1',
          status: StrategicObjectiveStatus.COMPLETED,
          lifecycleStatus: StrategicObjectiveLifecycleStatus.COMPLETED,
          healthStatus: null,
          links: [],
          direction: null,
        });
      prisma.strategicObjective.update.mockResolvedValue({
        id: 'o1',
        clientId: 'c1',
        status: StrategicObjectiveStatus.COMPLETED,
        lifecycleStatus: StrategicObjectiveLifecycleStatus.COMPLETED,
        healthStatus: null,
        directionId: null,
      });

      await service.updateObjective('c1', 'o1', {
        lifecycleStatus: StrategicObjectiveLifecycleStatus.COMPLETED,
      });

      expect(prisma.strategicObjective.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            lifecycleStatus: 'COMPLETED',
            healthStatus: null,
          }),
        }),
      );
    });
  });

  describe('RFC-STRAT-007 — liens stratégiques V1', () => {
    it('addObjectiveLink rejette alignmentScore=200', async () => {
      prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });

      await expect(
        service.addObjectiveLink('c1', 'o1', {
          linkType: StrategicLinkType.PROJECT,
          targetId: 'p1',
          targetLabelSnapshot: 'Projet',
          alignmentScore: 200,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('addObjectiveLink avec MANUAL sans targetId génère manual:<uuid>', async () => {
      prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });
      prisma.strategicLink.create.mockImplementation(async (args: { data: { targetId: string } }) => ({
        id: 'l1',
        ...args.data,
      }));

      const created = await service.addObjectiveLink('c1', 'o1', {
        targetType: StrategicLinkType.MANUAL,
        targetLabelSnapshot: 'Initiative ad hoc',
      });

      expect(prisma.strategicLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            linkType: StrategicLinkType.MANUAL,
            targetId: expect.stringMatching(/^manual:/),
            targetLabelSnapshot: 'Initiative ad hoc',
          }),
        }),
      );
      expect((created as { targetId: string }).targetId).toMatch(/^manual:/);
    });

    it('addObjectiveLink avec MANUAL sans libellé métier est rejeté', async () => {
      prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });

      await expect(
        service.addObjectiveLink('c1', 'o1', {
          targetType: StrategicLinkType.MANUAL,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      StrategicLinkType.BUDGET,
      StrategicLinkType.BUDGET_LINE,
      StrategicLinkType.RISK,
      StrategicLinkType.GOVERNANCE_CYCLE,
    ])('addObjectiveLink avec targetType=%s est rejeté en write V1', async (type) => {
      prisma.strategicObjective.findFirst.mockResolvedValue({ id: 'o1' });

      await expect(
        service.addObjectiveLink('c1', 'o1', {
          targetType: type,
          targetId: 't1',
          targetLabelSnapshot: 'Cible',
        }),
      ).rejects.toThrow(/Target type not supported in MVP/);
    });

    it('updateObjectiveLink met à jour alignmentScore et comment', async () => {
      prisma.strategicLink.findFirst.mockResolvedValue({
        id: 'l1',
        clientId: 'c1',
        objectiveId: 'o1',
        targetLabelSnapshot: 'Projet A',
        alignmentScore: 50,
        comment: null,
      });
      prisma.strategicLink.update.mockResolvedValue({
        id: 'l1',
        clientId: 'c1',
        objectiveId: 'o1',
        targetLabelSnapshot: 'Projet A',
        alignmentScore: 80,
        comment: 'aligned',
      });

      const updated = await service.updateObjectiveLink('c1', 'o1', 'l1', {
        alignmentScore: 80,
        comment: 'aligned',
      });

      expect(prisma.strategicLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'l1' },
          data: expect.objectContaining({ alignmentScore: 80, comment: 'aligned' }),
        }),
      );
      expect((updated as { alignmentScore: number }).alignmentScore).toBe(80);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'strategic_link.updated' }),
      );
    });

    it('updateObjectiveLink rejette alignmentScore=200', async () => {
      prisma.strategicLink.findFirst.mockResolvedValue({
        id: 'l1',
        clientId: 'c1',
        objectiveId: 'o1',
      });

      await expect(
        service.updateObjectiveLink('c1', 'o1', 'l1', { alignmentScore: 200 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('removeObjectiveLink audite strategic_link.deleted', async () => {
      prisma.strategicLink.findFirst.mockResolvedValue({
        id: 'l1',
        clientId: 'c1',
        objectiveId: 'o1',
        linkType: StrategicLinkType.PROJECT,
        targetId: 'p1',
      });
      prisma.strategicLink.delete.mockResolvedValue({ id: 'l1' });

      await service.removeObjectiveLink('c1', 'o1', 'l1', { actorUserId: 'u1' });

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'strategic_link.deleted' }),
      );
    });
  });
});
