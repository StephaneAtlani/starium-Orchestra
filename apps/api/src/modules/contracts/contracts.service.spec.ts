import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  SupplierContractKind,
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
    kind: SupplierContractKind.SERVICES,
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
    service = new ContractsService(prisma, auditLogs);
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
          kind: SupplierContractKind.OTHER,
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
          kind: SupplierContractKind.OTHER,
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
        kind: SupplierContractKind.FRAMEWORK,
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
});
