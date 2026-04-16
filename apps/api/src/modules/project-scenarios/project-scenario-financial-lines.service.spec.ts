import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectBudgetAllocationType, ProjectScenarioStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';

describe('ProjectScenarioFinancialLinesService', () => {
  let service: ProjectScenarioFinancialLinesService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  const clientId = 'client-1';
  const projectId = 'project-1';
  const scenarioId = 'scenario-1';

  const scenario = {
    id: scenarioId,
    clientId,
    projectId,
    status: ProjectScenarioStatus.DRAFT,
  };

  beforeEach(() => {
    prisma = {
      projectScenario: {
        findFirst: jest.fn().mockResolvedValue(scenario),
      },
      projectScenarioFinancialLine: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectBudgetLink: {
        findFirst: jest.fn(),
      },
      budgetLine: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (input: unknown) => {
        if (Array.isArray(input)) return Promise.all(input);
        if (typeof input === 'function') return input(prisma);
        return input;
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectScenarioFinancialLinesService(
      prisma,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('refuse une BudgetLine d’un autre client', async () => {
    prisma.budgetLine.findFirst.mockResolvedValue(null);

    await expect(
      service.create(clientId, projectId, scenarioId, {
        label: 'Infra',
        amountPlanned: '1000',
        budgetLineId: 'foreign-line',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse un ProjectBudgetLink hors scope projet/client', async () => {
    prisma.projectBudgetLink.findFirst.mockResolvedValue(null);

    await expect(
      service.create(clientId, projectId, scenarioId, {
        label: 'Infra',
        amountPlanned: '1000',
        projectBudgetLinkId: 'foreign-link',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuse l’incohérence projectBudgetLinkId + budgetLineId', async () => {
    prisma.projectBudgetLink.findFirst.mockResolvedValue({
      id: 'link-1',
      allocationType: ProjectBudgetAllocationType.FULL,
      percentage: null,
      amount: null,
      budgetLine: {
        id: 'line-1',
        code: 'BL-001',
        name: 'Infrastructure',
        initialAmount: new Prisma.Decimal('1000'),
      },
    });
    prisma.budgetLine.findFirst.mockResolvedValue({
      id: 'line-2',
      code: 'BL-002',
      name: 'Cloud',
      initialAmount: new Prisma.Decimal('500'),
    });

    await expect(
      service.create(clientId, projectId, scenarioId, {
        label: 'Infra',
        amountPlanned: '1000',
        projectBudgetLinkId: 'link-1',
        budgetLineId: 'line-2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calcule plannedTotal / forecastTotal / actualTotal avec fallback forecast', async () => {
    prisma.projectScenarioFinancialLine.findMany.mockResolvedValue([
      {
        id: 'l1',
        clientId,
        scenarioId,
        projectBudgetLinkId: null,
        budgetLineId: null,
        label: 'A',
        costCategory: null,
        amountPlanned: new Prisma.Decimal('100'),
        amountForecast: null,
        amountActual: new Prisma.Decimal('50'),
        currencyCode: null,
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetLine: null,
        projectBudgetLink: null,
      },
      {
        id: 'l2',
        clientId,
        scenarioId,
        projectBudgetLinkId: null,
        budgetLineId: null,
        label: 'B',
        costCategory: null,
        amountPlanned: new Prisma.Decimal('30'),
        amountForecast: new Prisma.Decimal('40'),
        amountActual: null,
        currencyCode: null,
        startDate: null,
        endDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetLine: null,
        projectBudgetLink: null,
      },
    ]);

    const summary = await service.getSummary(clientId, projectId, scenarioId);

    expect(summary.plannedTotal).toBe('130');
    expect(summary.forecastTotal).toBe('140');
    expect(summary.actualTotal).toBe('50');
    expect(summary.varianceVsActual).toBe('80');
  });

  it('calcule budgetCoverageRate et null si baseline absente', async () => {
    prisma.projectScenarioFinancialLine.findMany
      .mockResolvedValueOnce([
        {
          id: 'l1',
          clientId,
          scenarioId,
          projectBudgetLinkId: null,
          budgetLineId: null,
          label: 'A',
          costCategory: null,
          amountPlanned: new Prisma.Decimal('200'),
          amountForecast: null,
          amountActual: null,
          currencyCode: null,
          startDate: null,
          endDate: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          budgetLine: null,
          projectBudgetLink: {
            id: 'pbl-1',
            allocationType: ProjectBudgetAllocationType.PERCENTAGE,
            percentage: new Prisma.Decimal('50'),
            amount: null,
            budgetLine: {
              id: 'bl-1',
              code: 'BL-1',
              name: 'Infra',
              initialAmount: new Prisma.Decimal('300'),
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'l2',
          clientId,
          scenarioId,
          projectBudgetLinkId: null,
          budgetLineId: null,
          label: 'B',
          costCategory: null,
          amountPlanned: new Prisma.Decimal('100'),
          amountForecast: null,
          amountActual: null,
          currencyCode: null,
          startDate: null,
          endDate: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          budgetLine: null,
          projectBudgetLink: null,
        },
      ]);

    const withBaseline = await service.getSummary(clientId, projectId, scenarioId);
    expect(withBaseline.budgetCoverageRate).toBeCloseTo(1.3333, 4);

    const withoutBaseline = await service.getSummary(clientId, projectId, scenarioId);
    expect(withoutBaseline.budgetCoverageRate).toBeNull();
    expect(withoutBaseline.varianceVsBaseline).toBeNull();
  });

  it('suppression ligne sans casser les agrégats', async () => {
    const line = {
      id: 'line-1',
      clientId,
      scenarioId,
      projectBudgetLinkId: null,
      budgetLineId: null,
      label: 'Infra',
      costCategory: null,
      amountPlanned: new Prisma.Decimal('100'),
      amountForecast: null,
      amountActual: null,
      currencyCode: null,
      startDate: null,
      endDate: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      budgetLine: null,
      projectBudgetLink: null,
    };
    prisma.projectScenarioFinancialLine.findFirst.mockResolvedValue(line);
    prisma.projectScenarioFinancialLine.delete.mockResolvedValue(line);
    prisma.projectScenarioFinancialLine.findMany.mockResolvedValue([]);

    await service.remove(clientId, projectId, scenarioId, line.id);
    const summary = await service.getSummary(clientId, projectId, scenarioId);

    expect(summary.plannedTotal).toBe('0');
    expect(summary.forecastTotal).toBe('0');
    expect(summary.actualTotal).toBe('0');
  });

  it('refuse les mutations si scénario ARCHIVED', async () => {
    prisma.projectScenario.findFirst.mockResolvedValueOnce({
      ...scenario,
      status: ProjectScenarioStatus.ARCHIVED,
    });

    await expect(
      service.create(clientId, projectId, scenarioId, {
        label: 'Infra',
        amountPlanned: '1000',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
