import { BadRequestException } from '@nestjs/common';
import { ContractKindTypesService } from './contract-kind-types.service';

describe('ContractKindTypesService', () => {
  let service: ContractKindTypesService;
  let prisma: {
    supplierContractKindType: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      supplierContractKindType: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ContractKindTypesService(prisma as any, auditLogs as any);
  });

  it('resolveKindLabels préfère le libellé client actif', async () => {
    prisma.supplierContractKindType.findMany.mockResolvedValue([
      {
        id: 'g1',
        clientId: null,
        code: 'SERVICES',
        label: 'Plateforme',
        description: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'c1',
        clientId: 'cl-1',
        code: 'SERVICES',
        label: 'Client override',
        description: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const map = await service.resolveKindLabels('cl-1', ['SERVICES']);
    expect(map.SERVICES).toBe('Client override');
  });

  it('assertKindCodeAssignable lève si aucun type actif', async () => {
    prisma.supplierContractKindType.findFirst.mockResolvedValue(null);
    await expect(
      service.assertKindCodeAssignable('cl-1', 'UNKNOWN'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
