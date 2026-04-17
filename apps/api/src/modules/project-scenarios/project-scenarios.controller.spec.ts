import { ProjectScenariosController } from './project-scenarios.controller';
import { ProjectScenariosService } from './project-scenarios.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SelectProjectScenarioDto } from './dto/select-project-scenario.dto';

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
      selectAndTransition: jest.fn(),
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
      {},
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });

  it('getOne délègue et retourne un budgetSummary enrichi (pas ID seul)', async () => {
    service.getOne.mockResolvedValue({
      id: 'scenario-1',
      budgetSummary: {
        plannedTotal: '100.00',
        forecastTotal: '100.00',
        actualTotal: '50.00',
        varianceVsBaseline: null,
        varianceVsActual: '50.00',
        budgetCoverageRate: null,
      },
    } as any);

    const result = await controller.getOne('client-1', 'project-1', 'scenario-1');

    expect(service.getOne).toHaveBeenCalledWith('client-1', 'project-1', 'scenario-1');
    expect(result.budgetSummary).toEqual({
      plannedTotal: '100.00',
      forecastTotal: '100.00',
      actualTotal: '50.00',
      varianceVsBaseline: null,
      varianceVsActual: '50.00',
      budgetCoverageRate: null,
    });
  });

  it('selectAndTransition délègue au service avec DTO et contexte audit', async () => {
    service.selectAndTransition.mockResolvedValue({
      scenarioId: 'scenario-1',
      projectId: 'project-1',
      selectedStatus: 'SELECTED',
      projectStatus: 'PLANNED',
    } as any);

    await controller.selectAndTransition(
      'client-1',
      'project-1',
      'scenario-1',
      {
        targetProjectStatus: 'PLANNED',
        decisionNote: 'arbitrage',
        archiveOtherScenarios: false,
      },
      'user-1',
      { requestId: 'req-1' },
    );

    expect(service.selectAndTransition).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      'scenario-1',
      {
        targetProjectStatus: 'PLANNED',
        decisionNote: 'arbitrage',
        archiveOtherScenarios: false,
      },
      { actorUserId: 'user-1', meta: { requestId: 'req-1' } },
    );
  });

  it('SelectProjectScenarioDto : refuse targetProjectStatus invalide', async () => {
    const dto = plainToInstance(SelectProjectScenarioDto, {
      targetProjectStatus: 'DRAFT',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('SelectProjectScenarioDto : trim decisionNote et normalise vide vers null', async () => {
    const dto = plainToInstance(SelectProjectScenarioDto, {
      targetProjectStatus: 'PLANNED',
      decisionNote: '   ',
    });
    await validate(dto);
    expect(dto.decisionNote).toBeNull();
  });
});
