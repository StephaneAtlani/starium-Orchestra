import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(() => {
    prisma = {
      supplier: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new SuppliersService(prisma, auditLogs);
  });

  it('quickCreate crée supplier si absent', async () => {
    prisma.supplier.findFirst.mockResolvedValue(null);
    prisma.supplier.create.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Microsoft',
      normalizedName: 'microsoft',
      code: null,
      siret: null,
      externalId: null,
      email: null,
      phone: null,
      website: null,
      vatNumber: null,
      notes: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.quickCreate('c1', { name: ' Microsoft ' });

    expect(prisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ normalizedName: 'microsoft' }),
      }),
    );
    expect(result.name).toBe('Microsoft');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'supplier.created' }),
    );
  });

  it('quickCreate retourne existant si trouvé', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Microsoft',
      normalizedName: 'microsoft',
      code: null,
      siret: null,
      externalId: null,
      email: null,
      phone: null,
      website: null,
      vatNumber: null,
      notes: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.quickCreate('c1', { name: 'Microsoft' });
    expect(prisma.supplier.create).not.toHaveBeenCalled();
    expect(result.id).toBe('sup-1');
  });

  it('refuse patch supplier archive', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'X',
      normalizedName: 'x',
      code: null,
      siret: null,
      externalId: null,
      email: null,
      phone: null,
      website: null,
      vatNumber: null,
      notes: null,
      status: 'ARCHIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update('c1', 'sup-1', { name: 'Y' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('archive idempotent si deja ARCHIVED', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'X',
      normalizedName: 'x',
      code: null,
      siret: null,
      externalId: null,
      email: null,
      phone: null,
      website: null,
      vatNumber: null,
      notes: null,
      status: 'ARCHIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.archive('c1', 'sup-1');
    expect(result.status).toBe('ARCHIVED');
    expect(prisma.supplier.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('quickCreate refuse un match ARCHIVED', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-arch',
      clientId: 'c1',
      name: 'Old Supplier',
      normalizedName: 'old supplier',
      externalId: null,
      vatNumber: null,
      status: 'ARCHIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.quickCreate('c1', { name: 'old supplier' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('normalise vat/email/externalId avant create', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.supplier.create.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Acme',
      normalizedName: 'acme',
      code: null,
      siret: null,
      externalId: 'EXT-42',
      email: 'billing@acme.com',
      phone: null,
      website: null,
      vatNumber: 'FR123456789',
      notes: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('c1', {
      name: 'Acme',
      externalId: '  EXT-42 ',
      email: '  BILLING@ACME.COM ',
      vatNumber: ' fr 123 456 789 ',
    });

    expect(prisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalId: 'EXT-42',
          email: 'billing@acme.com',
          vatNumber: 'FR123456789',
          normalizedName: 'acme',
        }),
      }),
    );
  });

  it('refuse create si externalId deja pris', async () => {
    prisma.supplier.findFirst.mockResolvedValueOnce({
      id: 'sup-dup',
      clientId: 'c1',
      status: 'ACTIVE',
    });

    await expect(
      service.create('c1', { name: 'New', externalId: 'EXT-1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse create si vatNumber deja pris', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sup-dup', clientId: 'c1', status: 'ACTIVE' });

    await expect(
      service.create('c1', { name: 'New', vatNumber: 'FR111' }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse update si externalId deja pris', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce({
        id: 'sup-1',
        clientId: 'c1',
        name: 'Acme',
        normalizedName: 'acme',
        externalId: null,
        vatNumber: null,
        email: null,
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce({
        id: 'sup-2',
        clientId: 'c1',
        status: 'ACTIVE',
      });

    await expect(
      service.update('c1', 'sup-1', { externalId: 'EXT-9' }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse update si vatNumber deja pris', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce({
        id: 'sup-1',
        clientId: 'c1',
        name: 'Acme',
        normalizedName: 'acme',
        externalId: null,
        vatNumber: null,
        email: null,
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'sup-2',
        clientId: 'c1',
        status: 'ACTIVE',
      });

    await expect(
      service.update('c1', 'sup-1', { vatNumber: 'FR999' }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse conflit croise externalId/vatNumber en create', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce({ id: 'sup-A', clientId: 'c1', status: 'ACTIVE' })
      .mockResolvedValueOnce({ id: 'sup-B', clientId: 'c1', status: 'ACTIVE' });

    await expect(
      service.create('c1', {
        name: 'Acme',
        externalId: 'EXT-A',
        vatNumber: 'FR-B',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('refuse conflit croise externalId/vatNumber en update', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce({
        id: 'sup-1',
        clientId: 'c1',
        name: 'Acme',
        normalizedName: 'acme',
        externalId: null,
        vatNumber: null,
        email: null,
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce({ id: 'sup-A', clientId: 'c1', status: 'ACTIVE' })
      .mockResolvedValueOnce({ id: 'sup-B', clientId: 'c1', status: 'ACTIVE' });

    await expect(
      service.update('c1', 'sup-1', {
        externalId: 'EXT-A',
        vatNumber: 'FR-B',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('ne duplique pas sur variation casse/espaces', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Amazon Web Services',
      normalizedName: 'amazon web services',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.quickCreate('c1', {
      name: '  amazon   WEB services ',
    });
    expect(result.id).toBe('sup-1');
    expect(prisma.supplier.create).not.toHaveBeenCalled();
  });

  it('remonte une erreur exploitable si contrainte DB unique saute en concurrence', async () => {
    prisma.supplier.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    prisma.supplier.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create('c1', { name: 'Concurrent', externalId: 'EXT-CC' }),
    ).rejects.toThrow(ConflictException);
  });
});

