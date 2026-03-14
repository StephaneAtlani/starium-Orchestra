import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { BudgetVersionSetsController } from '../budget-version-sets.controller';
import { BudgetVersioningService } from '../budget-versioning.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

describe('Budget versioning integration', () => {
  let controller: BudgetVersionSetsController;
  let prisma: { budgetVersionSet: { findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock } };

  const clientA = 'client-A';
  const clientB = 'client-B';
  const passGuard = { canActivate: () => true };

  beforeAll(async () => {
    prisma = {
      budgetVersionSet: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuditLogsModule],
      controllers: [BudgetVersionSetsController],
      providers: [
        BudgetVersioningService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ModuleAccessGuard)
      .useValue(passGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<BudgetVersionSetsController>(BudgetVersionSetsController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listVersionSets', () => {
    it('returns items and total for client', async () => {
      const sets = [
        {
          id: 'vs-1',
          clientId: clientA,
          exerciseId: 'ex-1',
          code: 'BUD-2026',
          name: 'Budget 2026',
          description: null,
          baselineBudgetId: 'b1',
          activeBudgetId: 'b1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.budgetVersionSet.findMany.mockResolvedValue(sets);
      prisma.budgetVersionSet.count.mockResolvedValue(1);

      const result = await controller.list(clientA, { limit: 20, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].code).toBe('BUD-2026');
      expect(prisma.budgetVersionSet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: clientA },
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('getVersionSetById', () => {
    it('returns 404 when set not found for client', async () => {
      prisma.budgetVersionSet.findFirst.mockResolvedValue(null);

      await expect(
        controller.getById(clientB, 'vs-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budgetVersionSet.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vs-1', clientId: clientB },
        }),
      );
    });
  });
});
