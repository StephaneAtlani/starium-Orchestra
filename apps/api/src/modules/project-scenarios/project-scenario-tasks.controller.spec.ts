import { ProjectScenarioTasksController } from './project-scenario-tasks.controller';
import { ProjectScenarioTasksService } from './project-scenario-tasks.service';

describe('ProjectScenarioTasksController', () => {
  let controller: ProjectScenarioTasksController;
  let service: jest.Mocked<ProjectScenarioTasksService>;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      bootstrapFromProjectPlan: jest.fn(),
      getTimelineSummary: jest.fn(),
      buildTimelineSummary: jest.fn(),
    } as unknown as jest.Mocked<ProjectScenarioTasksService>;
    controller = new ProjectScenarioTasksController(service);
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

  it('create délègue avec contexte audit', async () => {
    service.create.mockResolvedValue({ id: 'task-1' } as any);

    await controller.create(
      'client-1',
      'project-1',
      'scenario-1',
      { title: 'Task A' },
      'user-1',
      { requestId: 'req-1' },
    );

    expect(service.create).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      { title: 'Task A' },
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });

  it('update délègue avec contexte audit', async () => {
    service.update.mockResolvedValue({ id: 'task-1' } as any);

    await controller.update(
      'client-1',
      'project-1',
      'scenario-1',
      'task-1',
      { title: 'Task B' },
      'user-1',
      { requestId: 'req-2' },
    );

    expect(service.update).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'task-1',
      { title: 'Task B' },
      { actorUserId: 'user-1', meta: { requestId: 'req-2' } },
    );
  });

  it('remove délègue avec contexte audit', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(
      'client-1',
      'project-1',
      'scenario-1',
      'task-1',
      'user-1',
      { requestId: 'req-3' },
    );

    expect(service.remove).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      'task-1',
      { actorUserId: 'user-1', meta: { requestId: 'req-3' } },
    );
  });

  it('bootstrap délègue avec contexte audit', async () => {
    service.bootstrapFromProjectPlan.mockResolvedValue({
      scenarioId: 'scenario-1',
      createdCount: 1,
      skippedDependencyCount: 0,
    });

    await controller.bootstrapFromProjectPlan('client-1', 'project-1', 'scenario-1', 'user-1', {
      requestId: 'req-4',
    });

    expect(service.bootstrapFromProjectPlan).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      { actorUserId: 'user-1', meta: { requestId: 'req-4' } },
    );
  });

  it('timeline-summary délègue', async () => {
    service.getTimelineSummary.mockResolvedValue({
      plannedStartDate: null,
      plannedEndDate: null,
      criticalPathDuration: null,
      milestoneCount: 0,
    });

    const result = await controller.getTimelineSummary('client-1', 'project-1', 'scenario-1');
    expect(service.getTimelineSummary).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
    );
    expect(result).toEqual({
      plannedStartDate: null,
      plannedEndDate: null,
      criticalPathDuration: null,
      milestoneCount: 0,
    });
  });
});
