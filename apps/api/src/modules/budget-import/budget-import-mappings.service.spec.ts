import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetImportPurpose } from '@prisma/client';
import { BudgetImportMappingsService } from './budget-import-mappings.service';

describe('BudgetImportMappingsService', () => {
  let service: BudgetImportMappingsService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';

  const baseMapping = {
    id: 'm1',
    clientId,
    name: 'Map 1',
    description: null,
    sourceType: 'CSV' as const,
    entityType: 'BUDGET_LINES' as const,
    sheetName: null,
    headerRowIndex: 1,
    mappingConfig: { fields: {} },
    optionsConfig: null,
    importPurpose: BudgetImportPurpose.MIXED,
    defaultBudgetId: null,
    lastUsedAt: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    defaultBudget: null,
    _count: { jobs: 0 },
  };

  beforeEach(() => {
    prisma = {
      budget: {
        findFirst: jest.fn(),
      },
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
    it('returns items and total with enriched fields', async () => {
      prisma.budgetImportMapping.findMany.mockResolvedValue([baseMapping]);
      prisma.budgetImportMapping.count.mockResolvedValue(1);
      const result = await service.list(clientId, { limit: 20, offset: 0 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('Map 1');
      expect(result.items[0].importPurpose).toBe('MIXED');
      expect(result.items[0].jobCount).toBe(0);
    });

    it('filters by importPurpose and search', async () => {
      prisma.budgetImportMapping.findMany.mockResolvedValue([]);
      prisma.budgetImportMapping.count.mockResolvedValue(0);
      await service.list(clientId, {
        limit: 20,
        offset: 0,
        importPurpose: BudgetImportPurpose.REALITY,
        search: 'Sage',
      });
      expect(prisma.budgetImportMapping.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId,
            importPurpose: BudgetImportPurpose.REALITY,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('throws NotFound when mapping not found', async () => {
      prisma.budgetImportMapping.findFirst.mockResolvedValue(null);
      await expect(service.getById(clientId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates mapping and audits', async () => {
      const created = { ...baseMapping, id: 'new-id', name: 'New', createdById: 'user-1' };
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
        expect.objectContaining({
          action: 'budget_import_mapping.created',
          resourceId: 'new-id',
        }),
      );
    });

    it('rejects defaultBudgetId outside client scope', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          clientId,
          {
            name: 'New',
            sourceType: 'CSV',
            mappingConfig: { fields: {} },
            defaultBudgetId: 'foreign-budget',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('duplicate', () => {
    it('copies mapping with suffix and audits', async () => {
      prisma.budgetImportMapping.findFirst.mockResolvedValue({
        ...baseMapping,
        name: 'Compta',
        mappingConfig: { fields: { amount: 'Montant' } },
      });
      prisma.budgetImportMapping.create.mockResolvedValue({
        ...baseMapping,
        id: 'dup-id',
        name: 'Compta (copie)',
        mappingConfig: { fields: { amount: 'Montant' } },
      });
      const result = await service.duplicate(clientId, 'm1', 'user-1');
      expect(result.name).toBe('Compta (copie)');
      expect(prisma.budgetImportMapping.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Compta (copie)',
            mappingConfig: { fields: { amount: 'Montant' } },
          }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget_import_mapping.duplicated',
          resourceId: 'dup-id',
        }),
      );
    });
  });
});
