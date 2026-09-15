import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StrategicDirectionStrategyDocumentsService } from './strategic-direction-strategy-documents.service';

describe('StrategicDirectionStrategyDocumentsService', () => {
  const prisma = {
    strategicDirectionStrategy: {
      findFirst: jest.fn(),
    },
    strategicDirectionStrategyDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  const auditLogs = { create: jest.fn() };
  const storage = {
    putObject: jest.fn(),
    getObjectStream: jest.fn(),
  };

  const strategies = {
    assertActorCanWriteStrategy: jest.fn().mockResolvedValue(undefined),
  };

  const service = new StrategicDirectionStrategyDocumentsService(
    prisma as never,
    auditLogs as never,
    storage as never,
    strategies as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuse list sans userId', async () => {
    await expect(service.list('c1', 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse list si stratégie hors client', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValue(null);
    await expect(service.list('c1', 's1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('liste les documents du client/stratégie', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValue({ id: 's1', status: 'DRAFT' });
    prisma.strategicDirectionStrategyDocument.findMany.mockResolvedValue([
      { id: 'd1', name: 'Schéma' },
    ]);
    const rows = await service.list('c1', 's1', 'u1');
    expect(rows).toHaveLength(1);
    expect(prisma.strategicDirectionStrategyDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'c1', strategyId: 's1' }),
      }),
    );
  });

  it('upload refuse stratégie hors scope', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValue(null);
    await expect(
      service.upload(
        'c1',
        's1',
        {
          buffer: Buffer.from('x'),
          mimetype: 'image/png',
          originalname: 'a.png',
          size: 1,
        } as Express.Multer.File,
        { actorUserId: 'u1', meta: {} },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upload crée un document STARIUM', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValue({ id: 's1', status: 'DRAFT' });
    storage.putObject.mockResolvedValue({
      bucket: 'b',
      objectKey: 'k',
      checksumSha256: 'x',
    });
    prisma.strategicDirectionStrategyDocument.create.mockResolvedValue({
      id: 'd1',
      name: 'a',
      mimeType: 'image/png',
      status: 'ACTIVE',
    });
    const created = await service.upload(
      'c1',
      's1',
      {
        buffer: Buffer.from('png'),
        mimetype: 'image/png',
        originalname: 'a.png',
        size: 3,
      } as Express.Multer.File,
      { actorUserId: 'u1', meta: {} },
    );
    expect(created.id).toBe('d1');
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'strategie', clientId: 'c1' }),
    );
  });
});
