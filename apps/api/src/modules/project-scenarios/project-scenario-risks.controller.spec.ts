import { ProjectScenarioRisksController } from './project-scenario-risks.controller';
import { ProjectScenarioRisksService } from './project-scenario-risks.service';

describe('ProjectScenarioRisksController', () => {
  let controller: ProjectScenarioRisksController;
  let service: jest.Mocked<ProjectScenarioRisksService>;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getSummary: jest.fn(),
      buildRiskSummary: jest.fn(),
    } as unknown as jest.Mocked<ProjectScenarioRisksService>;
    controller = new ProjectScenarioRisksController(service);
  });

  it('list utilise projects.read et retourne le format paginé', async () => {
    service.list.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    const result = await controller.list('client-1', 'project-1', 'scenario-1', {
      limit: 20,
      offset: 0,
    });

    expect(service.list).toHaveBeenCalledWith('client-1', 'project-1', 'scenario-1', {
      limit: 20,
      offset: 0,
    });
    expect(result).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it('create utilise projects.update et propage le contexte audit', async () => {
    service.create.mockResolvedValue({ id: 'risk-1' } as any);

    await controller.create(
      'client-1',
      'project-1',
      'scenario-1',
      { title: 'Risque', probability: 3, impact: 4 },
      'user-1',
      { requestId: 'req-1' },
    );

    expect(service.create).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      { title: 'Risque', probability: 3, impact: 4 },
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });

  it('update utilise projects.update et propage le contexte audit', async () => {
    service.update.mockResolvedValue({ id: 'risk-1' } as any);

    await controller.update(
      'client-1',
      'project-1',
      'scenario-1',
      'risk-1',
      { impact: 5 },
      'user-1',
      { requestId: 'req-2' },
    );

    expect(service.update).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'risk-1',
      { impact: 5 },
      { actorUserId: 'user-1', meta: { requestId: 'req-2' } },
    );
  });

  it('remove délègue en 204 No Content avec contexte audit', async () => {
    service.remove.mockResolvedValue(undefined);

    const result = await controller.remove(
      'client-1',
      'project-1',
      'scenario-1',
      'risk-1',
      'user-1',
      { requestId: 'req-3' },
    );

    expect(service.remove).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'risk-1',
      { actorUserId: 'user-1', meta: { requestId: 'req-3' } },
    );
    expect(result).toBeUndefined();
  });

  it('risk-summary utilise projects.read', async () => {
    service.getSummary.mockResolvedValue({
      criticalRiskCount: 0,
      averageCriticality: null,
      maxCriticality: null,
    });

    const result = await controller.getSummary('client-1', 'project-1', 'scenario-1');

    expect(service.getSummary).toHaveBeenCalledWith('client-1', 'project-1', 'scenario-1');
    expect(result).toEqual({
      criticalRiskCount: 0,
      averageCriticality: null,
      maxCriticality: null,
    });
  });
});
