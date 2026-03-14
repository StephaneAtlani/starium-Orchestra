import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { BudgetSnapshotsController } from './budget-snapshots.controller';
import { BudgetSnapshotsService } from './budget-snapshots.service';

const clientId = 'client-1';
const passGuard = { canActivate: () => true };

describe('BudgetSnapshotsController', () => {
  let controller: BudgetSnapshotsController;
  let service: BudgetSnapshotsService;

  const mockSummary = {
    id: 'snap-1',
    budgetId: 'budget-1',
    name: 'Snapshot Jan',
    code: 'SNAP-20260131-abc',
    snapshotDate: '2026-01-31T00:00:00.000Z',
    status: 'ACTIVE',
    budgetName: 'Budget 2026',
    totalRevisedAmount: 100000,
    totalForecastAmount: 98000,
    totalCommittedAmount: 60000,
    totalConsumedAmount: 22000,
    totalRemainingAmount: 23000,
    createdAt: '2026-03-14T12:00:00.000Z',
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      compare: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetSnapshotsController],
      providers: [
        { provide: BudgetSnapshotsService, useValue: mockService },
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

    controller = module.get<BudgetSnapshotsController>(BudgetSnapshotsController);
    service = module.get<BudgetSnapshotsService>(BudgetSnapshotsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /budget-snapshots', () => {
    it('appelle le service create et retourne le snapshot sans lignes', async () => {
      (service.create as jest.Mock).mockResolvedValue(mockSummary);

      const result = await controller.create(
        clientId,
        { budgetId: 'budget-1', name: 'Snapshot Jan' },
        'user-1',
        {},
      );

      expect(service.create).toHaveBeenCalledWith(
        clientId,
        { budgetId: 'budget-1', name: 'Snapshot Jan' },
        { actorUserId: 'user-1', meta: {} },
      );
      expect(result).toEqual(mockSummary);
    });
  });

  describe('GET /budget-snapshots', () => {
    it('appelle le service list avec query', async () => {
      const listResult = { items: [mockSummary], total: 1, limit: 20, offset: 0 };
      (service.list as jest.Mock).mockResolvedValue(listResult);

      const result = await controller.list(clientId, {
        budgetId: 'budget-1',
        limit: 20,
        offset: 0,
      });

      expect(service.list).toHaveBeenCalledWith(clientId, {
        budgetId: 'budget-1',
        limit: 20,
        offset: 0,
      });
      expect(result).toEqual(listResult);
    });
  });

  describe('GET /budget-snapshots/:id', () => {
    it('appelle le service getById et retourne le détail', async () => {
      const detail = { ...mockSummary, totals: {}, lines: [] };
      (service.getById as jest.Mock).mockResolvedValue(detail);

      const result = await controller.getById(clientId, 'snap-1');

      expect(service.getById).toHaveBeenCalledWith(clientId, 'snap-1');
      expect(result).toEqual(detail);
    });

    it('propage 404 du service', async () => {
      (service.getById as jest.Mock).mockRejectedValue(
        new NotFoundException('Budget snapshot not found'),
      );

      await expect(
        controller.getById(clientId, 'absent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /budget-snapshots/compare', () => {
    it('appelle le service compare avec leftSnapshotId et rightSnapshotId', async () => {
      const compareResult = {
        leftSnapshot: { id: 'left-1', name: 'L', snapshotDate: '' },
        rightSnapshot: { id: 'right-1', name: 'R', snapshotDate: '' },
        totalsDiff: {},
        lineDiffs: [],
      };
      (service.compare as jest.Mock).mockResolvedValue(compareResult);

      const result = await controller.compare(clientId, {
        leftSnapshotId: 'left-1',
        rightSnapshotId: 'right-1',
      });

      expect(service.compare).toHaveBeenCalledWith(
        clientId,
        'left-1',
        'right-1',
      );
      expect(result).toEqual(compareResult);
    });
  });
});
