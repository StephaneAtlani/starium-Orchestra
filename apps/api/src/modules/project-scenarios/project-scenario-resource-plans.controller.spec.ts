import { ProjectScenarioResourcePlansController } from './project-scenario-resource-plans.controller';
import { ProjectScenarioResourcePlansService } from './project-scenario-resource-plans.service';

describe('ProjectScenarioResourcePlansController', () => {
  let controller: ProjectScenarioResourcePlansController;
  let service: jest.Mocked<ProjectScenarioResourcePlansService>;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getSummary: jest.fn(),
      buildResourceSummary: jest.fn(),
    } as unknown as jest.Mocked<ProjectScenarioResourcePlansService>;
    controller = new ProjectScenarioResourcePlansController(service);
  });

  it('list renvoie bien le format paginé', async () => {
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
    service.create.mockResolvedValue({ id: 'plan-1' } as any);

    await controller.create(
      'client-1',
      'project-1',
      'scenario-1',
      { resourceId: 'resource-1', plannedDays: '5' },
      'user-1',
      { requestId: 'req-1' },
    );

    expect(service.create).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      { resourceId: 'resource-1', plannedDays: '5' },
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });

  it('update délègue avec contexte audit', async () => {
    service.update.mockResolvedValue({ id: 'plan-1' } as any);

    await controller.update(
      'client-1',
      'project-1',
      'scenario-1',
      'plan-1',
      { allocationPct: '50' },
      'user-1',
      { requestId: 'req-2' },
    );

    expect(service.update).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'plan-1',
      { allocationPct: '50' },
      { actorUserId: 'user-1', meta: { requestId: 'req-2' } },
    );
  });

  it('remove délègue avec contexte audit', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(
      'client-1',
      'project-1',
      'scenario-1',
      'plan-1',
      'user-1',
      { requestId: 'req-3' },
    );

    expect(service.remove).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'plan-1',
      { actorUserId: 'user-1', meta: { requestId: 'req-3' } },
    );
  });
});
