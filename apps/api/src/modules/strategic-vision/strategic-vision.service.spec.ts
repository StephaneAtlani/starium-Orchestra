import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, StrategicLinkType } from '@prisma/client';
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
  };
  strategicLink: {
    findFirst: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  project: {
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
      },
      strategicLink: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new StrategicVisionService(prisma, auditLogs);
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
});
