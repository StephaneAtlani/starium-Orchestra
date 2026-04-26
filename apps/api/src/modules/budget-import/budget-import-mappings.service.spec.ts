import { NotFoundException } from '@nestjs/common';
import { BudgetImportMappingsService } from './budget-import-mappings.service';

describe('BudgetImportMappingsService', () => {
  let service: BudgetImportMappingsService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';

  beforeEach(() => {
    prisma = {
      budgetImportMapping: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetImportMappingsService(prisma, auditLogs);
  });

  describe('list', () => {
    it('returns items and total', async () => {
      prisma.budgetImportMapping.findMany.mockResolvedValue([
        { id: 'm1', clientId, name: 'Map 1', sourceType: 'CSV', entityType: 'BUDGET_LINES', headerRowIndex: 1, mappingConfig: {}, optionsConfig: null, createdAt: new Date(), updatedAt: new Date(), description: null, sheetName: null, createdById: null },
      ]);
      prisma.budgetImportMapping.count.mockResolvedValue(1);
      const result = await service.list(clientId, { limit: 20, offset: 0 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('Map 1');
    });
  });

  describe('getById', () => {
    it('throws NotFound when mapping not found', async () => {
      prisma.budgetImportMapping.findFirst.mockResolvedValue(null);
      await expect(service.getById(clientId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates mapping and audits', async () => {
      const created = {
        id: 'new-id',
        clientId,
        name: 'New',
        description: null,
        sourceType: 'CSV',
        entityType: 'BUDGET_LINES',
        sheetName: null,
        headerRowIndex: 1,
        mappingConfig: { fields: {} },
        optionsConfig: null,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.budgetImportMapping.create.mockResolvedValue(created);
      const result = await service.create(
        clientId,
        {
          name: 'New',
          sourceType: 'CSV',
          mappingConfig: { fields: {} },
        },
        'user-1',
      );
      expect(result.id).toBe('new-id');
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'budget_import_mapping.created', resourceId: 'new-id' }),
      );
    });
  });
});
