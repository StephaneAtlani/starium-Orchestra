import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ClientUserRole,
  ClientUserStatus,
  CollaboratorSource,
  CollaboratorStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CollaboratorsService } from './collaborators.service';
import { EmailReservationService } from '../../common/auth/email-reservation.service';
import { SensitiveOperationPolicyService } from '../../common/auth/sensitive-operation-policy.service';
import * as resolver from '../../common/auth/platform-user-email-resolver';

jest.mock('../../common/auth/platform-user-email-resolver', () => ({
  normalizeEmailCandidates: jest.fn((emails: string[]) => emails.filter(Boolean)),
  resolveUserIdsByEmails: jest.fn(),
  matchProvisioningFromResolution: jest.fn(),
}));

describe('CollaboratorsService', () => {
  let service: CollaboratorsService;
  let prisma: any;
  let auditLogs: any;

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
            $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
            collaborator: {
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            directoryConnection: {
              findFirst: jest.fn(),
            },
            clientUser: {
              findUnique: jest.fn(),
              findFirst: jest.fn().mockResolvedValue(null),
            },
          },
        },
        {
          provide: AuditLogsService,
          useValue: { create: jest.fn() },
        },
        {
          provide: EmailReservationService,
          useValue: {
            reserveEmailsForUser: jest.fn(),
            registerIdentityEmail: jest.fn(),
          },
        },
        {
          provide: SensitiveOperationPolicyService,
          useValue: {
            assertSensitiveAdminOperation: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(CollaboratorsService);
    prisma = module.get(PrismaService);
    auditLogs = module.get(AuditLogsService);

    (prisma.directoryConnection.findFirst as jest.Mock).mockResolvedValue({
      isSyncEnabled: true,
      lockSyncedCollaborators: true,
    });
    (prisma.collaborator.update as jest.Mock).mockImplementation(
      ({ where, data }: any) => ({
        ...manualCollaborator,
        ...data,
        id: where.id,
        manager: null,
      }),
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

  it('normalise email trim+lowercase et enforce unicité par client', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
      id: 'col-existing',
      clientId,
      source: CollaboratorSource.MANUAL,
    });
    await expect(
      service.create(
        clientId,
        {
          displayName: 'Nadia',
          source: CollaboratorSource.MANUAL,
          email: '  NADIA@EXAMPLE.COM ',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.collaborator.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId,
          email: { equals: 'nadia@example.com', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('refuse création manuelle si duplicate sur collaborateur synchronisé', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
      id: 'col-sync',
      clientId,
      source: CollaboratorSource.DIRECTORY_SYNC,
    });
    await expect(
      service.create(
        clientId,
        {
          displayName: 'Nadia',
          source: CollaboratorSource.MANUAL,
          email: 'nadia@example.com',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft delete applique INACTIVE pour manuel', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(manualCollaborator);
    const out = await service.softDelete(clientId, manualCollaborator.id, 'user-1');
    expect(prisma.collaborator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: CollaboratorStatus.INACTIVE },
      }),
    );
    expect(out.status).toBe(CollaboratorStatus.INACTIVE);
  });

  it('soft delete applique DISABLED_SYNC pour synchronisé', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(syncedCollaborator);
    const out = await service.softDelete(clientId, syncedCollaborator.id, 'user-1');
    expect(prisma.collaborator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: CollaboratorStatus.DISABLED_SYNC },
      }),
    );
    expect(out.status).toBe(CollaboratorStatus.DISABLED_SYNC);
  });

  it('autorise réactivation INACTIVE -> ACTIVE', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
      ...manualCollaborator,
      status: CollaboratorStatus.INACTIVE,
    });
    const out = await service.updateStatus(
      clientId,
      manualCollaborator.id,
      { status: CollaboratorStatus.ACTIVE },
      'user-1',
    );
    expect(out.status).toBe(CollaboratorStatus.ACTIVE);
  });

  it('autorise réactivation DISABLED_SYNC -> ACTIVE', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
      ...syncedCollaborator,
      status: CollaboratorStatus.DISABLED_SYNC,
    });
    const out = await service.updateStatus(
      clientId,
      syncedCollaborator.id,
      { status: CollaboratorStatus.ACTIVE },
      'user-1',
    );
    expect(out.status).toBe(CollaboratorStatus.ACTIVE);
  });

  it('refuse transition de statut non autorisée', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
      ...manualCollaborator,
      status: CollaboratorStatus.INACTIVE,
    });
    await expect(
      service.updateStatus(clientId, manualCollaborator.id, {
        status: CollaboratorStatus.DISABLED_SYNC,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('liste exclut inactifs par défaut (status absent)', async () => {
    await service.list(clientId, { limit: 20, offset: 0 });
    expect(prisma.collaborator.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId,
          status: CollaboratorStatus.ACTIVE,
        }),
      }),
    );
  });

  it('liste applique scope client explicite', async () => {
    await service.list('client-A', { limit: 20, offset: 0, search: 'nadia' });
    expect(prisma.collaborator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-A',
        }),
      }),
    );
  });

  it('update() ne modifie pas le statut même si le payload contenait status', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(manualCollaborator);
    await service.update(clientId, manualCollaborator.id, { internalNotes: 'test' } as any, 'user-1');
    const updateCall = (prisma.collaborator.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('status');
  });

  it('refuse création manuelle avec statut DISABLED_SYNC', async () => {
    await expect(
      service.create(
        clientId,
        {
          displayName: 'Bad Status',
          source: CollaboratorSource.MANUAL,
          status: CollaboratorStatus.DISABLED_SYNC,
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('autorise création manuelle avec statut INACTIVE', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.collaborator.create as jest.Mock).mockResolvedValue({
      ...manualCollaborator,
      status: CollaboratorStatus.INACTIVE,
      manager: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await service.create(
      clientId,
      {
        displayName: 'Inactive Manual',
        source: CollaboratorSource.MANUAL,
        status: CollaboratorStatus.INACTIVE,
      },
      'user-1',
    );
    expect(out.status).toBe(CollaboratorStatus.INACTIVE);
  });

  it('options tags retourne limit=50 par défaut', async () => {
    (prisma.collaborator.findMany as jest.Mock).mockResolvedValue([
      { internalTags: ['alpha', 'beta'] },
    ]);
    const out = await service.listTagsOptions(clientId, {});
    expect(out.limit).toBe(50);
  });

  it('émet un audit status_updated sur updateStatus', async () => {
    (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
      ...manualCollaborator,
      status: CollaboratorStatus.INACTIVE,
    });
    await service.updateStatus(
      clientId,
      manualCollaborator.id,
      { status: CollaboratorStatus.ACTIVE },
      'user-1',
      { requestId: 'req-1' },
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'collaborator.status_updated',
        requestId: 'req-1',
      }),
    );
  });

  describe('linkDirectoryCollaboratorToPlatformUser', () => {
    const directoryCollaborator = {
      ...syncedCollaborator,
      userId: null,
      email: 'pro@client.fr',
      username: 'pro@client.fr',
      externalDirectoryId: 'ext-1',
      lastSyncedAt: new Date(),
    };

    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({
          ...prisma,
          userEmailIdentity: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'identity-1',
              emailNormalized: 'pro@client.fr',
            }),
            update: jest.fn(),
            findFirst: jest.fn().mockResolvedValue({ id: 'identity-1' }),
          },
          directoryEmailIdentityLink: { upsert: jest.fn().mockResolvedValue({}) },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              firstName: null,
              lastName: null,
              department: null,
              jobTitle: null,
            }),
            update: jest.fn(),
          },
          collaborator: {
            ...prisma.collaborator,
            count: jest.fn().mockResolvedValue(1),
            update: jest.fn().mockResolvedValue({}),
          },
          clientUser: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cu-1',
              status: ClientUserStatus.ACTIVE,
              defaultEmailIdentityId: null,
            }),
            create: jest.fn(),
            update: jest.fn(),
          },
        }),
      );
      (resolver.resolveUserIdsByEmails as jest.Mock).mockResolvedValue({
        primaryUserIds: [],
        verifiedIdentityUserIds: [],
        unverifiedIdentityUserIds: [],
      });
      (resolver.matchProvisioningFromResolution as jest.Mock).mockReturnValue({
        kind: 'not_found',
      });
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue({
        status: ClientUserStatus.ACTIVE,
      });
      (prisma.collaborator.findFirst as jest.Mock).mockImplementation(
        ({ where }: { where: { userId?: string; id?: { not: string } } }) => {
          if (where.userId) return Promise.resolve(null);
          return Promise.resolve(directoryCollaborator);
        },
      );
      (prisma.directoryConnection.findFirst as jest.Mock).mockResolvedValue({
        id: 'conn-1',
        providerType: 'MICROSOFT_GRAPH',
      });
    });

    it('exige MFA + réauth via SensitiveOperationPolicy', async () => {
      const policy = (service as any).sensitiveOperationPolicy as {
        assertSensitiveAdminOperation: jest.Mock;
      };
      await service.linkDirectoryCollaboratorToPlatformUser(
        clientId,
        directoryCollaborator.id,
        { userId: 'user-target' },
        'admin-1',
      );
      expect(policy.assertSensitiveAdminOperation).toHaveBeenCalledWith('admin-1');
    });

    it('refuse si collaborateur déjà rattaché', async () => {
      (prisma.collaborator.findFirst as jest.Mock).mockResolvedValue({
        ...directoryCollaborator,
        userId: 'already-linked',
      });
      await expect(
        service.linkDirectoryCollaboratorToPlatformUser(
          clientId,
          directoryCollaborator.id,
          { userId: 'user-target' },
          'admin-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
