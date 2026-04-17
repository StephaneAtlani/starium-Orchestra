import { ProjectScenarioCapacityController } from './project-scenario-capacity.controller';
import { ProjectScenarioCapacityService } from './project-scenario-capacity.service';

describe('ProjectScenarioCapacityController', () => {
  let controller: ProjectScenarioCapacityController;
  let service: jest.Mocked<ProjectScenarioCapacityService>;

  beforeEach(() => {
    service = {
      recompute: jest.fn(),
      list: jest.fn(),
      getSummary: jest.fn(),
      buildCapacitySummary: jest.fn(),
    } as unknown as jest.Mocked<ProjectScenarioCapacityService>;
    controller = new ProjectScenarioCapacityController(service);
  });

  it('recompute délègue avec contexte audit', async () => {
    service.recompute.mockResolvedValue({
      scenarioId: 'scenario-1',
      deletedCount: 2,
      createdCount: 3,
    });

    await controller.recompute('client-1', 'project-1', 'scenario-1', 'user-1', {
      requestId: 'req-1',
    });

    expect(service.recompute).toHaveBeenCalledWith('client-1', 'project-1', 'scenario-1', {
      actorUserId: 'user-1',
      meta: { requestId: 'req-1' },
    });
  });

  it('list délègue et retourne le format paginé', async () => {
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

  it('capacity-summary délègue', async () => {
    service.getSummary.mockResolvedValue({
      overCapacityCount: 0,
      underCapacityCount: 0,
      peakLoadPct: null,
      averageLoadPct: null,
    });

    const result = await controller.getSummary('client-1', 'project-1', 'scenario-1');
    expect(service.getSummary).toHaveBeenCalledWith('client-1', 'project-1', 'scenario-1');
    expect(result).toEqual({
      overCapacityCount: 0,
      underCapacityCount: 0,
      peakLoadPct: null,
      averageLoadPct: null,
    });
  });
});
