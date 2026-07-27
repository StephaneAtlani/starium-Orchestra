import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  SupplierContractRenewalMode,
  SupplierContractStatus,
} from '@prisma/client';
import { ContractsService } from './contracts.service';

const supplierInclude = {
  id: 'sup-1',
  name: 'Acme',
  code: 'ACM',
  supplierCategory: null,
};

function baseContractRow(over?: Partial<Record<string, unknown>>) {
  return {
    id: 'ctr-1',
    clientId: 'c1',
    supplierId: 'sup-1',
    reference: 'REF-1',
    title: 'Contrat test',
    kind: 'SERVICES',
    status: SupplierContractStatus.DRAFT,
    signedAt: null,
    effectiveStart: new Date('2026-01-01'),
    effectiveEnd: null,
    terminatedAt: null,
    renewalMode: SupplierContractRenewalMode.NONE,
    noticePeriodDays: null,
    renewalTermMonths: null,
    currency: 'EUR',
    annualValue: null,
    totalCommittedValue: null,
    billingFrequency: null,
    description: null,
    internalNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: supplierInclude,
    ...over,
  };
}

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: any;
  let auditLogs: any;
  let suppliers: { list: jest.Mock; findById: jest.Mock };
  let contractKindTypes: {
    assertKindCodeAssignable: jest.Mock;
    resolveKindLabels: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      supplier: { findFirst: jest.fn() },
      supplierContract: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    suppliers = { list: jest.fn(), findById: jest.fn() };
    contractKindTypes = {
      assertKindCodeAssignable: jest.fn().mockResolvedValue(undefined),
      resolveKindLabels: jest.fn().mockImplementation((_clientId: string, codes: string[]) => {
        const m: Record<string, string> = {};
        for (const c of codes) {
          m[c] = c === 'SERVICES' ? 'Prestations / services' : c;
        }
        return Promise.resolve(m);
      }),
    };
    service = new ContractsService(
      prisma,
      auditLogs,
      suppliers as any,
      contractKindTypes as any,
    );
  });

  it('create rejette si fournisseur hors client', async () => {
    prisma.supplier.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        'c1',
        {
          supplierId: 'other-sup',
          reference: 'R1',
          title: 'T',
          kind: 'OTHER',
          effectiveStart: new Date(),
          currency: 'EUR',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.supplierContract.create).not.toHaveBeenCalled();
  });

  it('create propage ConflictException sur référence dupliquée (P2002)', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    const err = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.supplierContract.create.mockRejectedValue(err);
    await expect(
      service.create(
        'c1',
        {
          supplierId: 'sup-1',
          reference: 'R1',
          title: 'T',
          kind: 'OTHER',
          effectiveStart: new Date(),
          currency: 'EUR',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create écrit un audit contract.created', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    prisma.supplierContract.create.mockResolvedValue(baseContractRow());
    await service.create(
      'c1',
      {
        supplierId: 'sup-1',
        reference: 'R1',
        title: 'T',
        kind: 'FRAMEWORK',
        effectiveStart: new Date('2026-06-01'),
        currency: 'eur',
      },
      { actorUserId: 'u1' },
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'contract.created',
        resourceType: 'supplier_contract',
      }),
    );
  });

  it('terminate est idempotent si déjà TERMINATED', async () => {
    const row = baseContractRow({ status: SupplierContractStatus.TERMINATED });
    prisma.supplierContract.findFirst.mockImplementation((args: any) => {
      if (args?.include?.supplier) {
        return Promise.resolve(row);
      }
      return Promise.resolve(row);
    });
    const result = await service.terminate('c1', 'ctr-1');
    expect(result.status).toBe(SupplierContractStatus.TERMINATED);
    expect(prisma.supplierContract.update).not.toHaveBeenCalled();
  });

  describe('summary', () => {
    const NOW = new Date('2026-06-01T00:00:00.000Z');

    function summaryRow(over?: Partial<Record<string, unknown>>) {
      return {
        id: 'ctr-1',
        status: SupplierContractStatus.ACTIVE,
        supplierId: 'sup-1',
        effectiveEnd: null,
        currency: 'EUR',
        annualValue: null,
        totalCommittedValue: null,
        ...over,
      };
    }

    it('filtre sur le client demandé', async () => {
      prisma.supplierContract.findMany.mockResolvedValue([]);
      await service.summary('c1', undefined, undefined, NOW);
      expect(prisma.supplierContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'c1' } }),
      );
    });

    it('ne compte comme en vigueur que ACTIVE et NOTICE', async () => {
      prisma.supplierContract.findMany.mockResolvedValue([
        summaryRow({ id: 'a', status: SupplierContractStatus.ACTIVE }),
        summaryRow({ id: 'b', status: SupplierContractStatus.NOTICE }),
        summaryRow({ id: 'c', status: SupplierContractStatus.DRAFT }),
        summaryRow({ id: 'd', status: SupplierContractStatus.EXPIRED }),
        summaryRow({ id: 'e', status: SupplierContractStatus.TERMINATED }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.totalCount).toBe(5);
      expect(result.activeCount).toBe(2);
      expect(result.inRenewalCount).toBe(1);
    });

    it('somme les montants et compte les fournisseurs distincts en vigueur', async () => {
      prisma.supplierContract.findMany.mockResolvedValue([
        summaryRow({
          id: 'a',
          supplierId: 'sup-1',
          totalCommittedValue: new Prisma.Decimal(100_000),
          annualValue: new Prisma.Decimal(40_000),
        }),
        summaryRow({
          id: 'b',
          supplierId: 'sup-1',
          totalCommittedValue: new Prisma.Decimal(50_000),
          annualValue: new Prisma.Decimal(10_000),
        }),
        summaryRow({
          id: 'c',
          supplierId: 'sup-2',
          totalCommittedValue: new Prisma.Decimal(25_000),
          annualValue: null,
        }),
        // Hors vigueur : ne doit rien ajouter.
        summaryRow({
          id: 'd',
          supplierId: 'sup-9',
          status: SupplierContractStatus.TERMINATED,
          totalCommittedValue: new Prisma.Decimal(999_999),
        }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.committedValue).toBe(175_000);
      expect(result.annualValue).toBe(50_000);
      expect(result.activeSupplierCount).toBe(2);
      expect(result.currency).toBe('EUR');
      expect(result.currencyMixed).toBe(false);
    });

    it('masque les montants si le portefeuille est multi-devises', async () => {
      prisma.supplierContract.findMany.mockResolvedValue([
        summaryRow({ id: 'a', currency: 'EUR', totalCommittedValue: new Prisma.Decimal(1000) }),
        summaryRow({ id: 'b', currency: 'USD', totalCommittedValue: new Prisma.Decimal(2000) }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.currencyMixed).toBe(true);
      expect(result.committedValue).toBeNull();
      expect(result.annualValue).toBeNull();
      expect(result.currency).toBeNull();
    });

    it('ne retient dans la fenêtre 90 j que les échéances à venir', async () => {
      prisma.supplierContract.findMany.mockResolvedValue([
        // Dans la fenêtre.
        summaryRow({ id: 'a', effectiveEnd: new Date('2026-07-01T00:00:00.000Z') }),
        // Bord de fenêtre exact (J+90).
        summaryRow({ id: 'b', effectiveEnd: new Date('2026-08-30T00:00:00.000Z') }),
        // Au-delà de la fenêtre.
        summaryRow({ id: 'c', effectiveEnd: new Date('2026-10-01T00:00:00.000Z') }),
        // Déjà passée.
        summaryRow({ id: 'd', effectiveEnd: new Date('2026-05-01T00:00:00.000Z') }),
        // Sans échéance.
        summaryRow({ id: 'e', effectiveEnd: null }),
      ]);

      const result = await service.summary('c1', undefined, undefined, NOW);

      expect(result.expiringSoonHorizonDays).toBe(90);
      expect(result.expiringSoonCount).toBe(2);
    });

    it('exclut les contrats non lisibles par l’utilisateur (ACL)', async () => {
      const accessControl = {
        canReadResource: jest.fn(),
        canWriteResource: jest.fn(),
        canAdminResource: jest.fn(),
        filterReadableResourceIds: jest.fn().mockResolvedValue(['a']),
      };
      const scoped = new ContractsService(
        prisma,
        auditLogs,
        suppliers as any,
        contractKindTypes as any,
        accessControl as any,
      );

      prisma.supplierContract.findMany.mockResolvedValue([
        summaryRow({ id: 'a', supplierId: 'sup-1' }),
        summaryRow({ id: 'b', supplierId: 'sup-2' }),
      ]);

      const result = await scoped.summary('c1', 'u1', undefined, NOW);

      expect(accessControl.filterReadableResourceIds).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'c1', userId: 'u1', resourceIds: ['a', 'b'] }),
      );
      expect(result.totalCount).toBe(1);
      expect(result.activeCount).toBe(1);
      expect(result.activeSupplierCount).toBe(1);
    });
  });
});
