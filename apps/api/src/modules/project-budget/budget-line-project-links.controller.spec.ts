import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { BudgetLineProjectLinksController } from './budget-line-project-links.controller';
import { ProjectBudgetLinksService } from './project-budget-links.service';

const clientId = 'client-1';
const passGuard = { canActivate: () => true };

describe('BudgetLineProjectLinksController', () => {
  let controller: BudgetLineProjectLinksController;
  let service: { listByBudgetLine: jest.Mock };

  beforeEach(async () => {
    service = {
      listByBudgetLine: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetLineProjectLinksController],
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

    controller = module.get(BudgetLineProjectLinksController);
  });

  it('GET list → délègue au service', async () => {
    const payload = {
      imputationBasis: 'PROPORTIONAL_V1',
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    };
    service.listByBudgetLine.mockResolvedValue(payload);

    await expect(
      controller.list(clientId, 'line-1', { limit: 20, offset: 0 }),
    ).resolves.toEqual(payload);

    expect(service.listByBudgetLine).toHaveBeenCalledWith(clientId, 'line-1', {
      limit: 20,
      offset: 0,
    });
  });

  it('NotFound du service remonte', async () => {
    service.listByBudgetLine.mockRejectedValue(
      new NotFoundException('Ligne budgétaire introuvable'),
    );

    await expect(
      controller.list(clientId, 'missing', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
