import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { MicrosoftSelectionController } from './microsoft-selection.controller';
import { MicrosoftSelectionService } from './microsoft-selection.service';

describe('MicrosoftSelectionController — RFC-PROJ-INT-006', () => {
  let controller: MicrosoftSelectionController;
  let service: MicrosoftSelectionService;
  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MicrosoftSelectionController],
      providers: [
        {
          provide: MicrosoftSelectionService,
          useValue: {
            listTeams: jest.fn(),
            listChannels: jest.fn(),
            listPlansForTeam: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(MicrosoftIntegrationAccessGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<MicrosoftSelectionController>(
      MicrosoftSelectionController,
    );
    service = module.get<MicrosoftSelectionService>(MicrosoftSelectionService);
    jest.clearAllMocks();
  });

  it('listTeams : délègue au service', async () => {
    (service.listTeams as jest.Mock).mockResolvedValue({ items: [] });

    const res = await controller.listTeams('client-1');

    expect(service.listTeams).toHaveBeenCalledWith('client-1');
    expect(res).toEqual({ items: [] });
  });

  it('listChannels : délègue au service', async () => {
    (service.listChannels as jest.Mock).mockResolvedValue({ items: [] });

    const res = await controller.listChannels('client-1', 'team-1');

    expect(service.listChannels).toHaveBeenCalledWith('client-1', 'team-1');
    expect(res).toEqual({ items: [] });
  });

  it('listPlansForTeam : délègue au service', async () => {
    (service.listPlansForTeam as jest.Mock).mockResolvedValue({ items: [] });

    const res = await controller.listPlansForTeam('client-1', 'team-1');

    expect(service.listPlansForTeam).toHaveBeenCalledWith('client-1', 'team-1');
    expect(res).toEqual({ items: [] });
  });
});

