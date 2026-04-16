import { ProjectScenariosController } from './project-scenarios.controller';
import { ProjectScenariosService } from './project-scenarios.service';

describe('ProjectScenariosController', () => {
  let controller: ProjectScenariosController;
  let service: jest.Mocked<ProjectScenariosService>;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      getOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      duplicate: jest.fn(),
      select: jest.fn(),
      archive: jest.fn(),
    } as unknown as jest.Mocked<ProjectScenariosService>;
    controller = new ProjectScenariosController(service);
  });

  it('select délègue au service avec clientId et projectId', async () => {
    service.select.mockResolvedValue({ id: 'scenario-1' } as any);

    await controller.select(
      'client-1',
      'project-1',
      'scenario-1',
      {},
      'user-1',
      { requestId: 'req-1' },
    );

    expect(service.select).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });
});
