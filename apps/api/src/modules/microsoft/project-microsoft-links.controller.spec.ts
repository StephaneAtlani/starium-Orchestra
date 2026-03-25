import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { MicrosoftIntegrationAccessGuard } from '../../common/guards/microsoft-integration-access.guard';
import { ProjectMicrosoftLinksController } from './project-microsoft-links.controller';
import { ProjectMicrosoftLinksService } from './project-microsoft-links.service';

describe('ProjectMicrosoftLinksController — RFC-PROJ-INT-007', () => {
  let controller: ProjectMicrosoftLinksController;
  let service: ProjectMicrosoftLinksService;

  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectMicrosoftLinksController],
      providers: [
        {
          provide: ProjectMicrosoftLinksService,
          useValue: {
            getConfig: jest.fn(),
            upsertConfig: jest.fn(),
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

    controller = module.get<ProjectMicrosoftLinksController>(
      ProjectMicrosoftLinksController,
    );
    service = module.get<ProjectMicrosoftLinksService>(
      ProjectMicrosoftLinksService,
    );
    jest.clearAllMocks();
  });

  it('getConfig : délègue au service', async () => {
    const expected = {
      isEnabled: false,
      teamId: 'team-1',
      teamName: null,
      channelId: 'ch-1',
      channelName: null,
      plannerPlanId: 'plan-1',
      plannerPlanTitle: null,
      syncTasksEnabled: true,
      syncDocumentsEnabled: true,
      filesDriveId: null,
      filesFolderId: null,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (service.getConfig as jest.Mock).mockResolvedValue(expected);

    const res = await controller.getConfig('client-1', 'project-1');

    expect(service.getConfig).toHaveBeenCalledWith('client-1', 'project-1');
    expect(res).toEqual(expected);
  });

  it('upsertConfig : délègue au service', async () => {
    const expected = {
      isEnabled: true,
      teamId: 'team-1',
      teamName: 'Team A',
      channelId: 'ch-1',
      channelName: 'General',
      plannerPlanId: 'plan-1',
      plannerPlanTitle: 'Plan',
      syncTasksEnabled: true,
      syncDocumentsEnabled: true,
      filesDriveId: null,
      filesFolderId: null,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (service.upsertConfig as jest.Mock).mockResolvedValue(expected);

    const dto = {
      isEnabled: true,
      teamId: 'team-1',
      channelId: 'ch-1',
      plannerPlanId: 'plan-1',
      syncTasksEnabled: true,
      syncDocumentsEnabled: true,
    };
    const meta = { requestId: 'req-1' };

    const res = await controller.upsertConfig(
      'client-1',
      'project-1',
      dto as any,
      'actor-1',
      meta,
    );

    expect(service.upsertConfig).toHaveBeenCalledWith(
      'client-1',
      'project-1',
      dto,
      { actorUserId: 'actor-1', meta },
    );
    expect(res).toEqual(expected);
  });
});

