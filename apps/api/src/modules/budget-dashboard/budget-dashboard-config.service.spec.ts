import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BudgetDashboardWidgetType } from '@prisma/client';
import { BudgetDashboardConfigService } from './budget-dashboard-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('BudgetDashboardConfigService', () => {
  let service: BudgetDashboardConfigService;
  let prisma: {
    budgetDashboardConfig: {
      count: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    budgetDashboardWidget: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    budgetExercise: { findFirst: jest.Mock };
    budget: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { create: jest.Mock };

  const clientId = 'c1';

  beforeEach(() => {
    audit = { create: jest.fn() };
    prisma = {
      budgetDashboardConfig: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      budgetDashboardWidget: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      budgetExercise: { findFirst: jest.fn() },
      budget: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: typeof prisma) => unknown) =>
        fn(prisma as unknown as Parameters<typeof prisma.$transaction>[0]),
      ),
    };
    service = new BudgetDashboardConfigService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditLogsService,
    );
  });

  describe('DELETE', () => {
    it('409 si isDefault', async () => {
      prisma.budgetDashboardConfig.findFirst.mockResolvedValue({
        id: 'x',
        isDefault: true,
          name: 'D',
      });
      await expect(service.deleteConfig(clientId, 'x')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('409 si unique config', async () => {
      prisma.budgetDashboardConfig.findFirst.mockResolvedValue({
        id: 'x',
        isDefault: false,
        name: 'S',
      });
      prisma.budgetDashboardConfig.count.mockResolvedValue(1);
      await expect(service.deleteConfig(clientId, 'x')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('204 si ≥2 configs et non-default', async () => {
      prisma.budgetDashboardConfig.findFirst.mockResolvedValue({
        id: 'x',
        isDefault: false,
        name: 'S',
      });
      prisma.budgetDashboardConfig.count.mockResolvedValue(2);
      prisma.budgetDashboardConfig.delete.mockResolvedValue({});
      await service.deleteConfig(clientId, 'x');
      expect(prisma.budgetDashboardConfig.delete).toHaveBeenCalled();
    expect(audit.create).toHaveBeenCalled();
    });
  });

  describe('validation CHART', () => {
    it('400 si CHART sans chartType', async () => {
      prisma.budgetDashboardConfig.findFirst.mockResolvedValue(null);
      prisma.budgetDashboardConfig.count.mockResolvedValue(0);
      prisma.budgetDashboardConfig.create.mockResolvedValue({
        id: 'cfg',
        clientId,
        name: 'n',
        isDefault: true,
      });
      prisma.budgetDashboardConfig.findUniqueOrThrow.mockResolvedValue({
        id: 'cfg',
        widgets: [],
      });
      prisma.budgetDashboardWidget.createMany.mockResolvedValue({ count: 1 });

      await expect(
        service.createConfig(clientId, {
          name: 'X',
          widgets: [
            {
              type: BudgetDashboardWidgetType.CHART,
              position: 0,
              title: 'x',
              size: 'full',
              isActive: true,
              settings: {},
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('POST sans widgets', () => {
    it('génère le jeu par défaut', async () => {
      prisma.budgetDashboardConfig.updateMany.mockResolvedValue({ count: 0 });
      prisma.budgetDashboardConfig.create.mockResolvedValue({
        id: 'cfg-new',
        clientId,
        name: 'Y',
        isDefault: false,
      });
      prisma.budgetDashboardWidget.createMany.mockResolvedValue({ count: 6 });
      prisma.budgetDashboardConfig.findUniqueOrThrow.mockResolvedValue({
        id: 'cfg-new',
        name: 'Y',
        widgets: [],
      });
      prisma.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) =>
        fn(prisma as unknown),
      );

      await service.createConfig(clientId, { name: 'Y' });

      expect(prisma.budgetDashboardWidget.createMany).toHaveBeenCalled();
      const call = prisma.budgetDashboardWidget.createMany.mock.calls[0][0];
      expect(call.data.length).toBeGreaterThan(0);
    });
  });

  describe('404', () => {
    it('config absente', async () => {
      prisma.budgetDashboardConfig.findFirst.mockResolvedValue(null);
      await expect(
        service.updateConfig(clientId, 'missing', { name: 'Z' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
