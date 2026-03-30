import { BadRequestException } from '@nestjs/common';
import { BudgetComparisonService } from './budget-comparison.service';
import { BudgetComparisonMode } from './dto/compare-budget.query.dto';

function line(params: {
  id: string;
  code: string;
  name?: string;
  revised: number;
  forecast: number;
  consumed: number;
}) {
  return {
    id: params.id,
    code: params.code,
    name: params.name ?? params.code,
    revisedAmount: params.revised,
    forecastAmount: params.forecast,
    consumedAmount: params.consumed,
  };
}

describe('BudgetComparisonService', () => {
  const auditLogs = { create: jest.fn() };
  const snapshotsService = { compare: jest.fn() };
  const versioningService = { compareVersions: jest.fn() };
  const prisma = {
    budget: { findFirst: jest.fn() },
    budgetSnapshot: { findFirst: jest.fn() },
  };

  let service: BudgetComparisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BudgetComparisonService(
      prisma as any,
      auditLogs as any,
      snapshotsService as any,
      versioningService as any,
    );
  });

  it('returns diff = 0 when current budget is baseline', async () => {
    const sameBudget = {
      id: 'b1',
      clientId: 'c1',
      isVersioned: true,
      versionSetId: 'vs1',
      versionSet: { baselineBudgetId: 'b1' },
      currency: 'EUR',
      budgetLines: [line({ id: 'l1', code: 'A', revised: 100, forecast: 90, consumed: 20 })],
    };
    prisma.budget.findFirst
      .mockResolvedValueOnce(sameBudget)
      .mockResolvedValueOnce(sameBudget);

    const result = await service.compareBudget(
      'c1',
      'b1',
      BudgetComparisonMode.BASELINE,
      undefined,
      'u1',
    );

    expect(result.diff).toEqual({
      revisedAmount: 0,
      forecastAmount: 0,
      consumedAmount: 0,
    });
  });

  it('keeps missing lines from left and right in version-vs-version compare', async () => {
    versioningService.compareVersions.mockResolvedValue({});
    prisma.budget.findFirst
      .mockResolvedValueOnce({
        id: 'left',
        clientId: 'c1',
        currency: 'EUR',
        budgetLines: [line({ id: 'l1', code: 'A', revised: 100, forecast: 90, consumed: 40 })],
      })
      .mockResolvedValueOnce({
        id: 'right',
        clientId: 'c1',
        currency: 'EUR',
        budgetLines: [line({ id: 'l2', code: 'B', revised: 80, forecast: 70, consumed: 20 })],
      });

    const result = await service.compareVersions('c1', 'left', 'right', 'u1');
    const keys = result.lines.map((l) => l.lineKey).sort();
    expect(keys).toEqual(['A', 'B']);
  });

  it('uses RIGHT side for status in snapshot-vs-snapshot compare', async () => {
    snapshotsService.compare.mockResolvedValue({});
    prisma.budgetSnapshot.findFirst
      .mockResolvedValueOnce({
        id: 's-left',
        budgetId: 'b1',
        budgetCurrency: 'EUR',
        lines: [
          {
            budgetLineId: 'l1',
            lineCode: 'A',
            lineName: 'Line A',
            revisedAmount: 100,
            forecastAmount: 150,
            consumedAmount: 120,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 's-right',
        budgetId: 'b1',
        budgetCurrency: 'EUR',
        lines: [
          {
            budgetLineId: 'l1',
            lineCode: 'A',
            lineName: 'Line A',
            revisedAmount: 100,
            forecastAmount: 80,
            consumedAmount: 30,
          },
        ],
      });

    const result = await service.compareSnapshots('c1', 's-left', 's-right', 'u1');
    expect(result.lines[0]?.status).toBe('OK');
  });

  it('sets lineId to null when no live side', async () => {
    versioningService.compareVersions.mockResolvedValue({});
    prisma.budget.findFirst
      .mockResolvedValueOnce({
        id: 'left',
        clientId: 'c1',
        currency: 'EUR',
        budgetLines: [line({ id: 'l1', code: 'A', revised: 100, forecast: 90, consumed: 40 })],
      })
      .mockResolvedValueOnce({
        id: 'right',
        clientId: 'c1',
        currency: 'EUR',
        budgetLines: [line({ id: 'l2', code: 'A', revised: 80, forecast: 70, consumed: 20 })],
      });

    const result = await service.compareVersions('c1', 'left', 'right', 'u1');
    expect(result.lines[0]?.lineId).toBeNull();
  });

  it('throws BadRequestException on lineKey collision after normalization', async () => {
    versioningService.compareVersions.mockResolvedValue({});
    prisma.budget.findFirst
      .mockResolvedValueOnce({
        id: 'left',
        clientId: 'c1',
        currency: 'EUR',
        budgetLines: [line({ id: 'l1', code: 'A', revised: 100, forecast: 90, consumed: 40 })],
      })
      .mockResolvedValueOnce({
        id: 'right',
        clientId: 'c1',
        currency: 'EUR',
        budgetLines: [
          line({ id: 'l2', code: 'A', revised: 80, forecast: 70, consumed: 20 }),
          line({ id: 'l3', code: ' a ', revised: 30, forecast: 20, consumed: 5 }),
        ],
      });

    await expect(
      service.compareVersions('c1', 'left', 'right', 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
