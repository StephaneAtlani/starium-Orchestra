import { Test, TestingModule } from '@nestjs/testing';
import { DirectoryProviderType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CollaboratorsService } from '../collaborators/collaborators.service';
import { DirectoryConnectionsService } from './directory-connections.service';
import { MicrosoftGraphDirectoryProvider } from './providers/microsoft-graph-directory.provider';
import { EmailReservationService } from '../../common/auth/email-reservation.service';
import { TeamDirectoryService } from './team-directory.service';
import * as resolver from '../../common/auth/platform-user-email-resolver';

jest.mock('../../common/auth/platform-user-email-resolver', () => ({
  normalizeEmailCandidates: jest.fn((emails: string[]) => emails.filter(Boolean)),
  resolveUserIdsByEmails: jest.fn(),
  matchProvisioningFromResolution: jest.fn(),
}));

describe('TeamDirectoryService', () => {
  let service: TeamDirectoryService;
  let prisma: PrismaService;
  let graphProvider: MicrosoftGraphDirectoryProvider;

  const clientId = 'client-1';
  const connectionId = 'conn-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamDirectoryService,
        {
          provide: PrismaService,
          useValue: {
            directoryGroupScope: { findMany: jest.fn().mockResolvedValue([]) },
            collaborator: { findMany: jest.fn().mockResolvedValue([]) },
            $transaction: jest.fn(),
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
        {
          provide: CollaboratorsService,
          useValue: { upsertFromDirectory: jest.fn() },
        },
        {
          provide: DirectoryConnectionsService,
          useValue: {
            getConnectionOrThrow: jest.fn().mockResolvedValue({
              id: connectionId,
              clientId,
              providerType: DirectoryProviderType.MICROSOFT_GRAPH,
              metadata: {},
            }),
          },
        },
        {
          provide: MicrosoftGraphDirectoryProvider,
          useValue: {
            listUsers: jest.fn().mockResolvedValue([
              {
                externalDirectoryId: 'ext-1',
                email: 'pro@client.fr',
                username: 'pro@client.fr',
                displayName: 'Pro User',
                isActive: true,
              },
            ]),
          },
        },
        {
          provide: EmailReservationService,
          useValue: {
            reserveEmailsForUser: jest.fn(),
            reserveEmailsForNewUser: jest.fn(),
            registerPrimaryEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TeamDirectoryService);
    prisma = module.get(PrismaService);
    graphProvider = module.get(MicrosoftGraphDirectoryProvider);
    jest.clearAllMocks();
  });

  describe('previewSync (T44 / T23)', () => {
    it('annonce USER_LINK_REQUIRED quand not_found et autoProvisionUsers=false', async () => {
      (resolver.resolveUserIdsByEmails as jest.Mock).mockResolvedValue({
        primaryUserIds: [],
        verifiedIdentityUserIds: [],
        unverifiedIdentityUserIds: [],
      });
      (resolver.matchProvisioningFromResolution as jest.Mock).mockReturnValue({
        kind: 'not_found',
      });

      const result = await service.previewSync(clientId, { connectionId });

      expect(graphProvider.listUsers).toHaveBeenCalled();
      expect(result.userLinkRequiredCount).toBe(1);
      expect(result.entries).toEqual([
        { externalDirectoryId: 'ext-1', status: 'USER_LINK_REQUIRED' },
      ]);
    });

    it('annonce SKIPPED quand ambiguous (T5)', async () => {
      (graphProvider.listUsers as jest.Mock).mockResolvedValue([
        {
          externalDirectoryId: 'ext-2',
          email: 'dup@client.fr',
          username: null,
          displayName: 'Dup',
          isActive: true,
        },
      ]);
      (resolver.resolveUserIdsByEmails as jest.Mock).mockResolvedValue({
        primaryUserIds: ['u1', 'u2'],
        verifiedIdentityUserIds: [],
        unverifiedIdentityUserIds: [],
      });
      (resolver.matchProvisioningFromResolution as jest.Mock).mockReturnValue({
        kind: 'ambiguous',
        userIds: ['u1', 'u2'],
      });

      const result = await service.previewSync(clientId, { connectionId });

      expect(result.entries[0]).toEqual({
        externalDirectoryId: 'ext-2',
        status: 'SKIPPED',
        reasonCode: 'AMBIGUOUS',
      });
    });
  });
});
