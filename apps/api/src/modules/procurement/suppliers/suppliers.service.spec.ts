import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: any;
  let auditLogs: any;
  let logoStorage: any;

  beforeEach(() => {
    prisma = {
      supplier: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      supplierCategory: {
        findFirst: jest.fn(),
      },
      purchaseOrder: { count: jest.fn() },
      invoice: { count: jest.fn() },
      supplierContact: { count: jest.fn() },
      supplierContract: { findMany: jest.fn().mockResolvedValue([]) },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    logoStorage = {
      write: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockReturnValue(true),
      createReadStream: jest.fn(),
    };
    service = new SuppliersService(prisma, auditLogs, logoStorage);
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

  it('assigne une catégorie active du même client', async () => {
    prisma.supplier.findFirst.mockResolvedValueOnce({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Acme',
      normalizedName: 'acme',
      status: 'ACTIVE',
      supplierCategoryId: null,
      externalId: null,
      vatNumber: null,
      email: null,
    });
    prisma.supplier.findFirst.mockResolvedValueOnce(null);
    prisma.supplierCategory.findFirst.mockResolvedValueOnce({
      id: 'cat-1',
      isActive: true,
    });
    prisma.supplier.update.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Acme',
      normalizedName: 'acme',
      status: 'ACTIVE',
      supplierCategoryId: 'cat-1',
      supplierCategory: {
        id: 'cat-1',
        name: 'Cloud',
        code: null,
        color: null,
        icon: null,
        isActive: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update('c1', 'sup-1', { supplierCategoryId: 'cat-1' });
    expect(result.supplierCategoryId).toBe('cat-1');
    expect(prisma.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supplierCategoryId: 'cat-1' }),
      }),
    );
  });

  it('retire la catégorie si supplierCategoryId null', async () => {
    prisma.supplier.findFirst.mockResolvedValueOnce({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Acme',
      normalizedName: 'acme',
      status: 'ACTIVE',
      supplierCategoryId: 'cat-1',
      externalId: null,
      vatNumber: null,
      email: null,
    });
    prisma.supplier.findFirst.mockResolvedValueOnce(null);
    prisma.supplier.update.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Acme',
      normalizedName: 'acme',
      status: 'ACTIVE',
      supplierCategoryId: null,
      supplierCategory: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update('c1', 'sup-1', { supplierCategoryId: null });
    expect(result.supplierCategoryId).toBeNull();
  });

  it('filtre la liste par supplierCategoryId', async () => {
    prisma.supplier.findMany.mockResolvedValue([]);
    prisma.supplier.count.mockResolvedValue(0);

    await service.list('c1', { supplierCategoryId: 'cat-1' });

    expect(prisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ supplierCategoryId: 'cat-1' }),
      }),
    );
  });

  it('getDashboardStats agrège les compteurs par client', async () => {
    prisma.supplier.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(1);
    prisma.purchaseOrder.count.mockResolvedValue(12);
    prisma.invoice.count.mockResolvedValue(5);
    prisma.supplierContact.count.mockResolvedValue(20);

    const result = await service.getDashboardStats('c1');

    expect(result).toEqual({
      suppliersListed: 8,
      suppliersArchived: 1,
      purchaseOrdersCount: 12,
      invoicesCount: 5,
      contactsActiveCount: 20,
    });
  });

  describe('summary', () => {
    const NOW = new Date('2026-06-01T00:00:00.000Z');

    function supplierRow(over?: Partial<Record<string, unknown>>) {
      return {
        id: 'sup-1',
        status: 'ACTIVE',
        performanceRating: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        ...over,
      };
    }

    it('sépare actifs et archivés, et compte les créations de l’année', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        supplierRow({ id: 'a', createdAt: new Date('2026-02-01T00:00:00.000Z') }),
        supplierRow({ id: 'b', createdAt: new Date('2025-11-01T00:00:00.000Z') }),
        supplierRow({ id: 'c', status: 'ARCHIVED' }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.activeCount).toBe(2);
      expect(result.archivedCount).toBe(1);
      expect(result.addedThisYear).toBe(1);
    });

    it('moyenne les évaluations renseignées au dixième et ignore les non évalués', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        supplierRow({ id: 'a', performanceRating: new Prisma.Decimal('4.6') }),
        supplierRow({ id: 'b', performanceRating: new Prisma.Decimal('4.1') }),
        supplierRow({ id: 'c', performanceRating: new Prisma.Decimal('3.4') }),
        supplierRow({ id: 'd', performanceRating: null }),
        // Archivé : exclu de la moyenne.
        supplierRow({ id: 'e', status: 'ARCHIVED', performanceRating: new Prisma.Decimal('1.0') }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.ratedCount).toBe(3);
      expect(result.averageRating).toBe(4);
    });

    it('renvoie une moyenne nulle si aucun fournisseur n’est évalué', async () => {
      prisma.supplier.findMany.mockResolvedValue([supplierRow({ id: 'a' })]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.averageRating).toBeNull();
      expect(result.ratedCount).toBe(0);
    });

    it('agrège la dépense annuelle des contrats en vigueur des fournisseurs actifs', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        supplierRow({ id: 'a' }),
        supplierRow({ id: 'b' }),
        supplierRow({ id: 'archived', status: 'ARCHIVED' }),
      ]);
      prisma.supplierContract.findMany.mockResolvedValue([
        { status: 'ACTIVE', currency: 'EUR', annualValue: new Prisma.Decimal(98_000) },
        { status: 'ACTIVE', currency: 'EUR', annualValue: new Prisma.Decimal(42_000) },
        { status: 'NOTICE', currency: 'EUR', annualValue: new Prisma.Decimal(10_000) },
        { status: 'ACTIVE', currency: 'EUR', annualValue: null },
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      // Seuls les fournisseurs actifs alimentent la requête contrats.
      expect(prisma.supplierContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            supplierId: { in: ['a', 'b'] },
            status: { in: ['ACTIVE', 'NOTICE'] },
          }),
        }),
      );
      expect(result.annualSpend).toBe(150_000);
      expect(result.activeContractCount).toBe(4);
      expect(result.inRenewalCount).toBe(1);
      expect(result.currency).toBe('EUR');
      expect(result.currencyMixed).toBe(false);
    });

    it('masque la dépense si les contrats mêlent plusieurs devises', async () => {
      prisma.supplier.findMany.mockResolvedValue([supplierRow({ id: 'a' })]);
      prisma.supplierContract.findMany.mockResolvedValue([
        { status: 'ACTIVE', currency: 'EUR', annualValue: new Prisma.Decimal(1000) },
        { status: 'ACTIVE', currency: 'CHF', annualValue: new Prisma.Decimal(2000) },
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.currencyMixed).toBe(true);
      expect(result.annualSpend).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('n’interroge pas les contrats si aucun fournisseur actif n’est visible', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        supplierRow({ id: 'a', status: 'ARCHIVED' }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(prisma.supplierContract.findMany).not.toHaveBeenCalled();
      expect(result.activeContractCount).toBe(0);
      expect(result.annualSpend).toBe(0);
    });

    it('exclut les fournisseurs non lisibles par l’utilisateur (ACL)', async () => {
      const accessControl = {
        canReadResource: jest.fn(),
        canWriteResource: jest.fn(),
        canAdminResource: jest.fn(),
        filterReadableResourceIds: jest.fn().mockResolvedValue(['a']),
      };
      const scoped = new SuppliersService(
        prisma,
        auditLogs,
        logoStorage,
        accessControl as any,
      );

      prisma.supplier.findMany.mockResolvedValue([
        supplierRow({ id: 'a', performanceRating: new Prisma.Decimal('5.0') }),
        supplierRow({ id: 'b', performanceRating: new Prisma.Decimal('1.0') }),
      ]);

      const result = await scoped.summary('c1', 'u1', undefined, NOW);

      expect(accessControl.filterReadableResourceIds).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'c1', userId: 'u1', resourceIds: ['a', 'b'] }),
      );
      expect(result.activeCount).toBe(1);
      expect(result.averageRating).toBe(5);
    });
  });
});

