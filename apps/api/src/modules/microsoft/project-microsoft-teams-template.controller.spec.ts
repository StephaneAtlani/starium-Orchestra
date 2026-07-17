import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ProjectMicrosoftTeamsTemplateController } from './project-microsoft-teams-template.controller';
import { ProjectMicrosoftTeamsTemplateService } from './project-microsoft-teams-template.service';

describe('ProjectMicrosoftTeamsTemplateController — RFC-PROJ-INT-010 Lot 1', () => {
  let controller: ProjectMicrosoftTeamsTemplateController;
  let service: ProjectMicrosoftTeamsTemplateService;

  const passGuard = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectMicrosoftTeamsTemplateController],
      providers: [
        {
          provide: ProjectMicrosoftTeamsTemplateService,
          useValue: {
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            listChannelTemplates: jest.fn(),
            createChannelTemplate: jest.fn(),
            updateChannelTemplate: jest.fn(),
            deleteChannelTemplate: jest.fn(),
            reorderChannelTemplates: jest.fn(),
          },
        },
      ],
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

    controller = module.get<ProjectMicrosoftTeamsTemplateController>(
      ProjectMicrosoftTeamsTemplateController,
    );
    service = module.get<ProjectMicrosoftTeamsTemplateService>(
      ProjectMicrosoftTeamsTemplateService,
    );
    jest.clearAllMocks();
  });

  it('getSettings : délègue au service avec clientId actif', async () => {
    const expected = {
      id: 'settings-1',
      clientId: 'client-1',
      isEnabled: true,
      offerOnProjectCreate: true,
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: null,
      createdAt: '2026-07-17T08:00:00.000Z',
      updatedAt: '2026-07-17T08:00:00.000Z',
    };
    (service.getSettings as jest.Mock).mockResolvedValue(expected);

    const res = await controller.getSettings('client-1');

    expect(service.getSettings).toHaveBeenCalledWith('client-1');
    expect(res).toEqual(expected);
  });

  it('updateSettings : délègue au service avec contexte audit', async () => {
    const dto = {
      isEnabled: true,
      offerOnProjectCreate: true,
      teamNameTemplate: '{{code}} - {{name}}',
    };
    const meta = { requestId: 'req-1' };
    const expected = { id: 'settings-1', clientId: 'client-1', ...dto };
    (service.updateSettings as jest.Mock).mockResolvedValue(expected);

    const res = await controller.updateSettings('client-1', dto as any, 'actor-1', meta);

    expect(service.updateSettings).toHaveBeenCalledWith('client-1', dto, {
      actorUserId: 'actor-1',
      meta,
    });
    expect(res).toEqual(expected);
  });

  it('listChannelTemplates : délègue au service', async () => {
    const expected = { items: [{ id: 'tpl-1', displayName: 'Pilotage' }] };
    (service.listChannelTemplates as jest.Mock).mockResolvedValue(expected);

    const res = await controller.listChannelTemplates('client-1');

    expect(service.listChannelTemplates).toHaveBeenCalledWith('client-1');
    expect(res).toEqual(expected);
  });

  it('createChannelTemplate : délègue au service', async () => {
    const dto = { displayName: 'Pilotage', isPrimary: true };
    const meta = { requestId: 'req-1' };
    const expected = { id: 'tpl-1', clientId: 'client-1', ...dto };
    (service.createChannelTemplate as jest.Mock).mockResolvedValue(expected);

    const res = await controller.createChannelTemplate('client-1', dto as any, 'actor-1', meta);

    expect(service.createChannelTemplate).toHaveBeenCalledWith('client-1', dto, {
      actorUserId: 'actor-1',
      meta,
    });
    expect(res).toEqual(expected);
  });

  it('reorderChannelTemplates : délègue au service', async () => {
    const dto = { items: [{ id: 'tpl-1', sortOrder: 0 }] };
    const meta = { requestId: 'req-1' };
    const expected = { items: [{ id: 'tpl-1', sortOrder: 0 }] };
    (service.reorderChannelTemplates as jest.Mock).mockResolvedValue(expected);

    const res = await controller.reorderChannelTemplates('client-1', dto as any, 'actor-1', meta);

    expect(service.reorderChannelTemplates).toHaveBeenCalledWith('client-1', dto, {
      actorUserId: 'actor-1',
      meta,
    });
    expect(res).toEqual(expected);
  });

  it('updateChannelTemplate : délègue au service', async () => {
    const dto = { displayName: 'Pilotage v2' };
    const meta = { requestId: 'req-1' };
    const expected = { id: 'tpl-1', displayName: 'Pilotage v2' };
    (service.updateChannelTemplate as jest.Mock).mockResolvedValue(expected);

    const res = await controller.updateChannelTemplate(
      'client-1',
      'tpl-1',
      dto as any,
      'actor-1',
      meta,
    );

    expect(service.updateChannelTemplate).toHaveBeenCalledWith('client-1', 'tpl-1', dto, {
      actorUserId: 'actor-1',
      meta,
    });
    expect(res).toEqual(expected);
  });

  it('removeChannelTemplate : délègue au service', async () => {
    const meta = { requestId: 'req-1' };
    (service.deleteChannelTemplate as jest.Mock).mockResolvedValue(undefined);

    await controller.removeChannelTemplate('client-1', 'tpl-1', 'actor-1', meta);

    expect(service.deleteChannelTemplate).toHaveBeenCalledWith('client-1', 'tpl-1', {
      actorUserId: 'actor-1',
      meta,
    });
  });
});
