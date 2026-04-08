import { NotFoundException } from '@nestjs/common';
import { BudgetDecisionHistoryService } from '../budget-decision-history.service';
import { buildDecisionHistorySummary } from '../budget-decision-history-summary';

describe('BudgetDecisionHistoryService', () => {
  const clientId = 'c1';
  const budgetId = 'b1';

  const prismaMock = {
    budget: {
      findFirst: jest.fn(),
    },
    budgetEnvelope: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    budgetLine: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  let service: BudgetDecisionHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BudgetDecisionHistoryService(prismaMock as any);
  });

  it('404 si budget absent', async () => {
    prismaMock.budget.findFirst.mockResolvedValue(null);
    await expect(
      service.list(clientId, budgetId, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retourne items et total', async () => {
    prismaMock.budget.findFirst.mockResolvedValue({
      id: budgetId,
      name: 'Budget X',
      code: 'BX',
    });
    prismaMock.budgetEnvelope.findMany.mockResolvedValue([]);
    prismaMock.budgetLine.findMany.mockResolvedValue([]);
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 'log1',
        clientId,
        userId: null,
        action: 'budget.updated',
        resourceType: 'budget',
        resourceId: budgetId,
        oldValue: {},
        newValue: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await service.list(clientId, budgetId, { limit: 20, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].action).toBe('budget.updated');
    expect(result.items[0].summary).toContain('Budget X');
  });
});

describe('buildDecisionHistorySummary', () => {
  it('budget.status.changed utilise les libellés FR', () => {
    const s = buildDecisionHistorySummary(
      'budget.status.changed',
      { from: 'DRAFT' },
      { to: 'SUBMITTED' },
      { budgetName: 'B' },
    );
    expect(s).toContain('Brouillon');
    expect(s).toContain('Soumis');
  });

  it('budget_line.planning.updated', () => {
    const s = buildDecisionHistorySummary(
      'budget_line.planning.updated',
      {},
      {},
      { budgetName: 'B', lineName: 'L1' },
    );
    expect(s).toContain('L1');
    expect(s).toContain('prévisionnel');
  });
});
