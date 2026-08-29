import { NotFoundException } from '@nestjs/common';
import { BudgetLineStatus, BudgetSnapshotStatus } from '@prisma/client';
import { BudgetLandingForecastService } from './budget-landing-forecast.service';
import { PA_SNAPSHOT_OCCASION_CODES } from '../../budget-snapshots/budget-pa-snapshot.constants';

describe('BudgetLandingForecastService', () => {
  const clientId = 'client-1';
  const budgetId = 'budget-1';
  const arbId = 'snap-arb';

  let prisma: any;
  let auditLogs: any;
  let workflowSettings: any;
  let snapshots: any;
  let landingService: any;
  let service: BudgetLandingForecastService;

  const twelveMonths = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i + 1,
    amount: 1000,
  }));

  beforeEach(() => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetLine: { findMany: jest.fn(), update: jest.fn() },
      budgetSnapshot: { findMany: jest.fn(), findFirst: jest.fn() },
      budgetSnapshotOccasionType: { findFirst: jest.fn() },
      budgetLinePlanningMonth: { deleteMany: jest.fn(), createMany: jest.fn() },
      auditLog: { findMany: jest.fn() },
      $transaction: jest.fn((fn: (tx: any) => Promise<unknown>) => fn(prisma)),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    workflowSettings = {
      getResolvedForClient: jest.fn().mockResolvedValue({
        landingForecastEnabled: true,
      }),
    };
    snapshots = { create: jest.fn().mockResolvedValue({ id: 'snap-act' }) };
    landingService = { recalculateAndPersist: jest.fn().mockResolvedValue({}) };
    service = new BudgetLandingForecastService(
      prisma,
      auditLogs,
      workflowSettings,
      snapshots,
      landingService,
    );
  });

  it('GET 404 cross-client', async () => {
    prisma.budget.findFirst.mockResolvedValue(null);
    await expect(service.getState(clientId, budgetId)).rejects.toThrow(NotFoundException);
  });

  it('C3 — validate d’un vieux arbitrated → 409', async () => {
    prisma.budget.findFirst.mockResolvedValue({ id: budgetId });
    prisma.budgetSnapshot.findMany
      .mockResolvedValueOnce([
        {
          id: 'b1',
          name: 'Baseline',
          code: 'B',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          status: BudgetSnapshotStatus.ACTIVE,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'a-new',
          name: 'Arb new',
          code: 'A',
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          status: BudgetSnapshotStatus.ACTIVE,
        },
      ]);
    prisma.auditLog.findMany.mockResolvedValue([]);

    await expect(
      service.validate(clientId, budgetId, 'a-old', { actorUserId: 'u1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'pa_arbitrated_required' }),
    });
  });

  it('C4 — snapshot sans planningMonths → 409', async () => {
    prisma.budget.findFirst.mockResolvedValue({ id: budgetId });
    const arb = {
      id: arbId,
      name: 'Arb',
      code: 'A',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      status: BudgetSnapshotStatus.ACTIVE,
    };
    prisma.budgetSnapshot.findMany
      .mockResolvedValueOnce([
        {
          id: 'b1',
          name: 'B',
          code: 'B',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          status: BudgetSnapshotStatus.ACTIVE,
        },
      ])
      .mockResolvedValueOnce([arb]);
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
          newValue: { arbitratedSnapshotId: arbId },
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.budgetSnapshot.findFirst.mockResolvedValue({
      ...arb,
      clientId,
      budgetId,
      occasionType: { code: PA_SNAPSHOT_OCCASION_CODES.ARBITRATED },
      lines: [
        {
          budgetLineId: 'line-1',
          lineName: 'Licences',
          initialAmount: 12000,
          planningMonths: null,
          planningMode: null,
          planningTotalAmount: null,
        },
      ],
    });
    prisma.budgetLine.findMany.mockResolvedValue([
      {
        id: 'line-1',
        initialAmount: 12000,
        status: BudgetLineStatus.ACTIVE,
        budget: {
          exercise: {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
          },
        },
      },
    ]);

    await expect(
      service.apply(clientId, budgetId, arbId, { actorUserId: 'u1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'snapshot_missing_planning' }),
    });
    expect(snapshots.create).not.toHaveBeenCalled();
  });

  it('C4 — réalloc post-freeze (plafond divergé) → 409', async () => {
    prisma.budget.findFirst.mockResolvedValue({ id: budgetId });
    const arb = {
      id: arbId,
      name: 'Arb',
      code: 'A',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      status: BudgetSnapshotStatus.ACTIVE,
    };
    prisma.budgetSnapshot.findMany
      .mockResolvedValueOnce([
        {
          id: 'b1',
          name: 'B',
          code: 'B',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          status: BudgetSnapshotStatus.ACTIVE,
        },
      ])
      .mockResolvedValueOnce([arb]);
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
          newValue: { arbitratedSnapshotId: arbId },
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.budgetSnapshot.findFirst.mockResolvedValue({
      ...arb,
      clientId,
      budgetId,
      occasionType: { code: PA_SNAPSHOT_OCCASION_CODES.ARBITRATED },
      lines: [
        {
          budgetLineId: 'line-1',
          lineName: 'Licences',
          initialAmount: 12000,
          planningMonths: twelveMonths,
          planningMode: 'MANUAL',
          planningTotalAmount: 12000,
        },
      ],
    });
    prisma.budgetLine.findMany.mockResolvedValue([
      {
        id: 'line-1',
        initialAmount: 15000,
        status: BudgetLineStatus.ACTIVE,
        budget: {
          exercise: {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
          },
        },
      },
    ]);

    await expect(
      service.apply(clientId, budgetId, arbId, { actorUserId: 'u1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'live_ceiling_diverged' }),
    });
  });

  it('C4 — apply recopie le planning et active les PENDING, consommés inchangés', async () => {
    prisma.budget.findFirst.mockResolvedValue({ id: budgetId });
    const arb = {
      id: arbId,
      name: 'Arb',
      code: 'A',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      status: BudgetSnapshotStatus.ACTIVE,
    };
    prisma.budgetSnapshot.findMany
      .mockResolvedValueOnce([
        {
          id: 'b1',
          name: 'B',
          code: 'B',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          status: BudgetSnapshotStatus.ACTIVE,
        },
      ])
      .mockResolvedValueOnce([arb])
      .mockResolvedValue([]);
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
          newValue: { arbitratedSnapshotId: arbId },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValue([]);
    prisma.budgetSnapshot.findFirst.mockResolvedValue({
      ...arb,
      clientId,
      budgetId,
      occasionType: { code: PA_SNAPSHOT_OCCASION_CODES.ARBITRATED },
      lines: [
        {
          budgetLineId: 'line-1',
          lineName: 'Licences',
          initialAmount: 12000,
          planningMonths: twelveMonths,
          planningMode: 'MANUAL',
          planningTotalAmount: 12000,
        },
      ],
    });
    prisma.budgetLine.findMany.mockResolvedValue([
      {
        id: 'line-1',
        initialAmount: 12000,
        consumedAmount: 3000,
        committedAmount: 1000,
        status: BudgetLineStatus.PENDING_VALIDATION,
        budget: {
          exercise: {
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
          },
        },
      },
    ]);
    prisma.budgetSnapshotOccasionType.findFirst.mockResolvedValue({ id: 'occ-act' });

    await service.apply(clientId, budgetId, arbId, { actorUserId: 'u1' });

    expect(prisma.budgetLinePlanningMonth.createMany).toHaveBeenCalled();
    expect(prisma.budgetLine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'line-1' },
        data: expect.objectContaining({
          status: BudgetLineStatus.ACTIVE,
        }),
      }),
    );
    expect(landingService.recalculateAndPersist).toHaveBeenCalled();
    expect(snapshots.create).toHaveBeenCalledWith(
      clientId,
      expect.objectContaining({
        budgetId,
        occasionTypeId: 'occ-act',
      }),
      expect.any(Object),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'budget.landing_forecast.applied' }),
    );
  });

  it('apply 404 si snapshot d’un autre client', async () => {
    prisma.budget.findFirst.mockResolvedValue({ id: budgetId });
    const arb = {
      id: arbId,
      name: 'Arb',
      code: 'A',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      status: BudgetSnapshotStatus.ACTIVE,
    };
    prisma.budgetSnapshot.findMany
      .mockResolvedValueOnce([
        {
          id: 'b1',
          name: 'B',
          code: 'B',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          status: BudgetSnapshotStatus.ACTIVE,
        },
      ])
      .mockResolvedValueOnce([arb]);
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          createdAt: new Date('2026-04-02T00:00:00.000Z'),
          newValue: { arbitratedSnapshotId: arbId },
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.budgetSnapshot.findFirst.mockResolvedValue(null);

    await expect(service.apply(clientId, budgetId, arbId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
