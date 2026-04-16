import { ProjectScenarioFinancialLinesController } from './project-scenario-financial-lines.controller';
import { ProjectScenarioFinancialLinesService } from './project-scenario-financial-lines.service';

describe('ProjectScenarioFinancialLinesController', () => {
  let controller: ProjectScenarioFinancialLinesController;
  let service: jest.Mocked<ProjectScenarioFinancialLinesService>;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getSummary: jest.fn(),
      buildBudgetSummary: jest.fn(),
    } as unknown as jest.Mocked<ProjectScenarioFinancialLinesService>;
    controller = new ProjectScenarioFinancialLinesController(service);
  });

  it('list utilise projects.read et renvoie le format {items,total,limit,offset}', async () => {
    service.list.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    const result = await controller.list('client-1', 'project-1', 'scenario-1', {
      limit: 20,
      offset: 0,
    });

    expect(service.list).toHaveBeenCalledWith('client-1', 'project-1', 'scenario-1', {
      limit: 20,
      offset: 0,
    });
    expect(result).toEqual({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it('create délègue avec contexte audit', async () => {
    service.create.mockResolvedValue({ id: 'line-1' } as any);

    await controller.create(
      'client-1',
      'project-1',
      'scenario-1',
      { label: 'Infra', amountPlanned: '100' },
      'user-1',
      { requestId: 'req-1' },
    );

    expect(service.create).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      { label: 'Infra', amountPlanned: '100' },
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });

  it('update délègue avec contexte audit', async () => {
    service.update.mockResolvedValue({ id: 'line-1' } as any);

    await controller.update(
      'client-1',
      'project-1',
      'scenario-1',
      'line-1',
      { label: 'Maj' },
      'user-1',
      { requestId: 'req-2' },
    );

    expect(service.update).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'line-1',
      { label: 'Maj' },
      { actorUserId: 'user-1', meta: { requestId: 'req-2' } },
    );
  });

  it('remove délègue avec contexte audit', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(
      'client-1',
      'project-1',
      'scenario-1',
      'line-1',
      'user-1',
      { requestId: 'req-3' },
    );

    expect(service.remove).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'line-1',
      { actorUserId: 'user-1', meta: { requestId: 'req-3' } },
    );
  });
});
