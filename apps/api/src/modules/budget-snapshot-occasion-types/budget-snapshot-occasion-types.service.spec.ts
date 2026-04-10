import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BudgetSnapshotOccasionTypesService } from './budget-snapshot-occasion-types.service';

describe('BudgetSnapshotOccasionTypesService', () => {
  let service: BudgetSnapshotOccasionTypesService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      budgetSnapshotOccasionType: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetSnapshotOccasionTypesService(
      prisma,
      auditLogs as unknown as AuditLogsService,
    );
  });

  describe('listMergedForClient', () => {
    it('fusionne globaux et client, actifs uniquement', async () => {
      prisma.budgetSnapshotOccasionType.findMany
        .mockResolvedValueOnce([
          {
            id: 'g1',
            clientId: null,
            code: 'CODIR',
            label: 'CODIR',
            description: null,
            sortOrder: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'c1',
            clientId: 'cl-1',
            code: 'LOCAL',
            label: 'Local',
            description: null,
            sortOrder: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

      const items = await service.listMergedForClient('cl-1');

      expect(items).toHaveLength(2);
      expect(items[0].scope).toBe('global');
      expect(items[1].scope).toBe('client');
    });
  });

  describe('assertOccasionTypeAssignable', () => {
    it('accepte un type global actif', async () => {
      prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValue({
        id: 't1',
        clientId: null,
        isActive: true,
      });
      await expect(
        service.assertOccasionTypeAssignable('cl-1', 't1'),
      ).resolves.toBeUndefined();
    });

    it('refuse si type absent', async () => {
      prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValue(null);
      await expect(
        service.assertOccasionTypeAssignable('cl-1', 'bad'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createForClient', () => {
    it('refuse si code déjà pris en global actif', async () => {
      prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValueOnce({
        id: 'g',
        code: 'CODIR',
      });
      await expect(
        service.createForClient('cl-1', {
          code: 'CODIR',
          label: 'Doublon',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetSnapshotOccasionType.create).not.toHaveBeenCalled();
    });

    it('crée si pas de conflit global', async () => {
      prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValueOnce(null);
      const row = {
        id: 'new',
        clientId: 'cl-1',
        code: 'SPEC',
        label: 'Spécifique',
        description: null,
        sortOrder: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.budgetSnapshotOccasionType.create.mockResolvedValue(row);

      const out = await service.createForClient('cl-1', {
        code: 'SPEC',
        label: 'Spécifique',
        sortOrder: 5,
      });

      expect(out.code).toBe('SPEC');
      expect(out.scope).toBe('client');
      expect(auditLogs.create).toHaveBeenCalled();
    });
  });

  describe('createGlobal', () => {
    it('409 si code global existe', async () => {
      prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValue({ id: 'x' });
      await expect(
        service.createGlobal({ code: 'X', label: 'Y' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateForClient', () => {
    it('404 si type pas du client', async () => {
      prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValue(null);
      await expect(
        service.updateForClient('cl-1', 'id', { label: 'N' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
