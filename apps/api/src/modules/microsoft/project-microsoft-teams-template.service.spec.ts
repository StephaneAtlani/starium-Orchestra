import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  it('met à jour les settings existants et audite', async () => {
    const existing = {
      id: 'settings-1',
      clientId,
      isEnabled: false,
      offerOnProjectCreate: false,
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: null,
      createdAt: new Date('2026-07-17T08:00:00.000Z'),
      updatedAt: new Date('2026-07-17T08:00:00.000Z'),
    };
    const updated = {
      ...existing,
      isEnabled: true,
      offerOnProjectCreate: true,
      updatedAt: new Date('2026-07-17T09:00:00.000Z'),
    };
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue(existing);
    prisma.projectMicrosoftTeamsProvisioningSettings.update.mockResolvedValue(updated);

    const result = await service.updateSettings(
      clientId,
      {
        isEnabled: true,
        offerOnProjectCreate: true,
        teamNameTemplate: ' {{code}} - {{name}} ',
      },
      { actorUserId: 'u1', meta: {} },
    );

    expect(prisma.projectMicrosoftTeamsProvisioningSettings.update).toHaveBeenCalledWith({
      where: { id: 'settings-1' },
      data: expect.objectContaining({
        isEnabled: true,
        offerOnProjectCreate: true,
        teamNameTemplate: '{{code}} - {{name}}',
      }),
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'project.microsoft_teams.settings.updated' }),
    );
    expect(result.isEnabled).toBe(true);
  });

  it('force offerOnProjectCreate à false quand isEnabled est false', async () => {
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

    await service.updateSettings(
      clientId,
      {
        isEnabled: false,
        offerOnProjectCreate: true,
        teamNameTemplate: '{{code}} - {{name}}',
      },
      { actorUserId: 'u1', meta: {} },
    );

    expect(prisma.projectMicrosoftTeamsProvisioningSettings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isEnabled: false,
        offerOnProjectCreate: false,
      }),
    });
  });

  it('liste les templates triés par sortOrder', async () => {
    prisma.projectMicrosoftTeamsChannelTemplate.findMany.mockResolvedValue([
      {
        id: 'tpl-1',
        clientId,
        settingsId: 'settings-1',
        displayName: 'Pilotage',
        description: null,
        sortOrder: 0,
        isPrimary: true,
        createdAt: new Date('2026-07-17T08:00:00.000Z'),
        updatedAt: new Date('2026-07-17T08:00:00.000Z'),
      },
    ]);

    const result = await service.listChannelTemplates(clientId);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].displayName).toBe('Pilotage');
  });

  it('refuse la mise à jour d’un template d’un autre client', async () => {
    prisma.projectMicrosoftTeamsChannelTemplate.findFirst.mockResolvedValue(null);

    await expect(
      service.updateChannelTemplate(clientId, 'tpl-other', { displayName: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse un réordonnancement incomplet', async () => {
    prisma.projectMicrosoftTeamsChannelTemplate.findMany.mockResolvedValue([
      { id: 'tpl-1', sortOrder: 0 },
      { id: 'tpl-2', sortOrder: 1 },
    ]);

    await expect(
      service.reorderChannelTemplates(clientId, {
        items: [{ id: 'tpl-1', sortOrder: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transforme une violation unique Prisma en ConflictException', async () => {
    prisma.projectMicrosoftTeamsProvisioningSettings.findUnique.mockResolvedValue({
      id: 'settings-1',
    });
    prisma.projectMicrosoftTeamsChannelTemplate.findFirst.mockResolvedValue(null);
    prisma.projectMicrosoftTeamsChannelTemplate.count.mockResolvedValue(0);
    prisma.projectMicrosoftTeamsChannelTemplate.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    );

    await expect(
      service.createChannelTemplate(
        clientId,
        { displayName: 'Pilotage', isPrimary: false },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
