import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ClientUserRole,
  CollaboratorSource,
  CollaboratorStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CollaboratorsService } from './collaborators.service';

describe('CollaboratorsService', () => {
  let service: CollaboratorsService;
  let prisma: PrismaService;

  const clientId = 'client-1';
  const syncedCollaborator = {
    id: 'col-sync-1',
    clientId,
    displayName: 'Sync User',
    source: CollaboratorSource.DIRECTORY_SYNC,
    status: CollaboratorStatus.ACTIVE,
  };
  const manualCollaborator = {
    id: 'col-manual-1',
    clientId,
    displayName: 'Manual User',
    source: CollaboratorSource.MANUAL,
    status: CollaboratorStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorsService,
        {
          provide: PrismaService,
          useValue: {
            collaborator: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            directoryConnection: {
              findFirst: jest.fn(),
            },
            clientUser: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CollaboratorsService);
    prisma = module.get(PrismaService);

    (prisma.directoryConnection.findFirst as jest.Mock).mockResolvedValue({
      isSyncEnabled: true,
      lockSyncedCollaborators: true,
    });
    (prisma.collaborator.update as jest.Mock).mockImplementation(
      ({ where, data }: any) => ({ id: where.id, ...data }),
    );
    (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue({
      role: ClientUserRole.CLIENT_USER,
    });
  });

  it('bloque un utilisateur standard sur champ synchronisé', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(
      syncedCollaborator,
    );

    await expect(
      service.update(
        clientId,
        syncedCollaborator.id,
        { displayName: 'Nouveau nom' },
        'user-standard',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise CLIENT_ADMIN sur champ synchronisé', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(
      syncedCollaborator,
    );
    (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue({
      role: ClientUserRole.CLIENT_ADMIN,
    });

    await service.update(
      clientId,
      syncedCollaborator.id,
      { displayName: 'Nouveau nom admin' },
      'user-admin',
    );

    expect(prisma.collaborator.update).toHaveBeenCalled();
  });

  it('n applique pas le verrouillage pour un collaborator manuel', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(
      manualCollaborator,
    );

    await service.update(
      clientId,
      manualCollaborator.id,
      { displayName: 'Nom manuel' },
      'user-standard',
    );

    expect(prisma.collaborator.update).toHaveBeenCalled();
  });

  it('autorise les champs locaux sur collaborator synchronisé', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(
      syncedCollaborator,
    );

    await service.update(
      clientId,
      syncedCollaborator.id,
      { internalNotes: 'Note locale', internalTags: { source: 'local' } },
      'user-standard',
    );

    expect(prisma.collaborator.update).toHaveBeenCalled();
  });
});
