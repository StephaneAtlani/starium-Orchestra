import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { BudgetProjectBudgetKpisController } from './budget-project-budget-kpis.controller';
import { ProjectBudgetLinksService } from './project-budget-links.service';

const clientId = 'client-1';
const passGuard = { canActivate: () => true };

describe('BudgetProjectBudgetKpisController', () => {
  let controller: BudgetProjectBudgetKpisController;
  let service: { getProjectBudgetKpis: jest.Mock };

  beforeEach(async () => {
    service = {
      getProjectBudgetKpis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetProjectBudgetKpisController],
      providers: [{ provide: ProjectBudgetLinksService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ModuleAccessGuard)
      .useValue(passGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get(BudgetProjectBudgetKpisController);
  });

  it('GET kpis → délègue au service', async () => {
    const payload = {
      imputationBasis: 'PROPORTIONAL_V1',
      items: [],
      totals: {
        targetAmount: 0,
        committedAmount: 0,
        consumedAmount: 0,
        driftAmount: 0,
        projectCount: 0,
      },
    };
    service.getProjectBudgetKpis.mockResolvedValue(payload);

    await expect(controller.getKpis(clientId, 'budget-1')).resolves.toEqual(
      payload,
    );
    expect(service.getProjectBudgetKpis).toHaveBeenCalledWith(
      clientId,
      'budget-1',
    );
  });

  it('NotFound du service remonte', async () => {
    service.getProjectBudgetKpis.mockRejectedValue(
      new NotFoundException('Budget introuvable'),
    );
    await expect(
      controller.getKpis(clientId, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
