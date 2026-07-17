import { ConflictException } from '@nestjs/common';
import { ProjectMicrosoftTeamsTemplateService } from './project-microsoft-teams-template.service';

describe('ProjectMicrosoftTeamsTemplateService', () => {
  let service: ProjectMicrosoftTeamsTemplateService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  const clientId = 'client-1';

  beforeEach(() => {
    prisma = {
      projectMicrosoftTeamsProvisioningSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectMicrosoftTeamsChannelTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (arg: any) => {
        if (typeof arg === 'function') {
          return arg(prisma);
        }
        return Promise.all(arg);
      }),
    };

    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

    service = new ProjectMicrosoftTeamsTemplateService(prisma, auditLogs as any);
  });

  it('retourne les settings par défaut si aucune ligne n’existe', async () => {
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue(null);

    await expect(service.getSettings(clientId)).resolves.toEqual(
      expect.objectContaining({
        clientId,
        isEnabled: false,
        offerOnProjectCreate: false,
        teamNameTemplate: '{{code}} - {{name}}',
      }),
    );
  });

  it('crée la ligne settings si absente avant création template', async () => {
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue(null);
    prisma.projectMicrosoftTeamsProvisioningSettings.create.mockResolvedValue({
      id: 'settings-1',
      clientId,
      isEnabled: false,
      offerOnProjectCreate: false,
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: null,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    });
    prisma.projectMicrosoftTeamsChannelTemplate.findFirst.mockResolvedValue(null);
    prisma.projectMicrosoftTeamsChannelTemplate.count.mockResolvedValue(0);
    prisma.projectMicrosoftTeamsChannelTemplate.create.mockResolvedValue({
      id: 'tpl-1',
      clientId,
      settingsId: 'settings-1',
      displayName: 'Pilotage',
      description: null,
      sortOrder: 0,
      isPrimary: true,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    });

    const result = await service.createChannelTemplate(
      clientId,
      { displayName: ' Pilotage ', description: '', isPrimary: true },
      { actorUserId: 'u1', meta: {} },
    );

    expect(prisma.projectMicrosoftTeamsProvisioningSettings.create).toHaveBeenCalled();
    expect(result.displayName).toBe('Pilotage');
    expect(result.isPrimary).toBe(true);
  });

  it('refuse un second canal principal pour le même client', async () => {
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue({
      id: 'settings-1',
    });
    prisma.projectMicrosoftTeamsChannelTemplate.findFirst.mockResolvedValue({ id: 'tpl-primary' });

    await expect(
      service.createChannelTemplate(
        clientId,
        { displayName: 'Pilotage', description: '', isPrimary: true },
        { actorUserId: 'u1', meta: {} },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('recalcule les sortOrder après suppression', async () => {
    const deleted = {
      id: 'tpl-2',
      clientId,
      settingsId: 'settings-1',
      displayName: 'Exécution',
      description: null,
      sortOrder: 1,
      isPrimary: false,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    };
    prisma.projectMicrosoftTeamsChannelTemplate.findFirst.mockResolvedValue(deleted);
    prisma.projectMicrosoftTeamsChannelTemplate.findMany.mockResolvedValue([
      {
        id: 'tpl-3',
        clientId,
        settingsId: 'settings-1',
        displayName: 'Documentation',
        description: null,
        sortOrder: 2,
        isPrimary: false,
        createdAt: new Date('2026-07-17T08:00:00.000Z'),
        updatedAt: new Date('2026-07-17T08:00:00.000Z'),
      },
    ]);
    prisma.projectMicrosoftTeamsChannelTemplate.update.mockResolvedValue(undefined);

    await service.deleteChannelTemplate(clientId, 'tpl-2', {
      actorUserId: 'u1',
      meta: {},
    });

    expect(prisma.projectMicrosoftTeamsChannelTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tpl-3' },
      data: { sortOrder: 0 },
    });
  });
});
