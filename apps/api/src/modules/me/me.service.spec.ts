import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { MeService } from './me.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MeService', () => {
  let service: MeService;
  let prisma: any;
  const securityLogs = { create: jest.fn() };
  const emailService = { queueEmail: jest.fn() };
  const mfa = {
    getTwoFactorStatus: jest.fn(),
    startTotpEnrollment: jest.fn(),
    verifyTotpEnrollment: jest.fn(),
    disableTotp: jest.fn(),
  };
  const avatarStorage = {
    exists: jest.fn().mockReturnValue(false),
    write: jest.fn(),
    remove: jest.fn(),
    createReadStream: jest.fn(),
    dir: '/tmp',
  };
  const timesheetMonths = {
    getHumanResourceIdForUser: jest.fn(),
  };
  const config = { get: jest.fn() };

  beforeEach(() => {
    securityLogs.create.mockReset();
    emailService.queueEmail.mockReset();
    config.get.mockReset();
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      userEmailIdentity: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
      },
      clientUser: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      clientModule: {
        findMany: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn((input: unknown) => {
        if (Array.isArray(input)) {
          return Promise.all(input as Promise<unknown>[]);
        }
        if (typeof input === 'function') {
          return (input as any)(prisma);
        }
        return Promise.resolve(undefined);
      }),
      emailIdentityVerificationToken: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    const moduleVisibility = {
      getVisibleModuleCodesForUser: jest.fn().mockResolvedValue([]),
    };
    service = new MeService(
      prisma,
      securityLogs as any,
      mfa as any,
      avatarStorage as any,
      timesheetMonths as any,
      emailService as any,
      config as any,
      moduleVisibility as any,
    );
  });

  describe('getProfile', () => {
    it('lève NotFoundException si user inexistant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('retourne le profil si user trouvé', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        jobTitle: null,
        company: null,
        office: null,
        avatarMimeType: null,
        platformRole: null,
        passwordLoginEnabled: true,
      } as any);

      const result = await service.getProfile('user-1');
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        jobTitle: null,
        company: null,
        office: null,
        hasAvatar: false,
        platformRole: null,
        passwordLoginEnabled: true,
      });
    });

    it('retourne platformRole PLATFORM_ADMIN si défini', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        department: null,
        jobTitle: null,
        company: null,
        office: null,
        avatarMimeType: null,
        platformRole: 'PLATFORM_ADMIN',
        passwordLoginEnabled: true,
      } as any);

      const result = await service.getProfile('admin-1');
      expect(result.platformRole).toBe('PLATFORM_ADMIN');
    });
  });

  describe('getClients', () => {
    it('mappe correctement les clients (id, name, slug, role, status, isDefault)', async () => {
      prisma.clientUser.findMany.mockResolvedValue([
        {
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          isDefault: true,
          defaultEmailIdentityId: 'eid-1',
          defaultEmailIdentity: {
            id: 'eid-1',
            email: 'a@example.com',
            displayName: 'Travail',
            isVerified: true,
            isActive: true,
          },
          client: {
            id: 'client-1',
            name: 'Client Démo',
            slug: 'client-demo',
            budgetAccountingEnabled: true,
          },
        },
        {
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.SUSPENDED,
          isDefault: false,
          defaultEmailIdentityId: null,
          defaultEmailIdentity: null,
          client: {
            id: 'client-2',
            name: 'Autre Client',
            slug: 'autre-client',
            budgetAccountingEnabled: false,
          },
        },
      ] as any);

      const result = await service.getClients('user-1');
      expect(result).toEqual([
        {
          id: 'client-1',
          name: 'Client Démo',
          slug: 'client-demo',
          budgetAccountingEnabled: true,
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          isDefault: true,
          defaultEmailIdentityId: 'eid-1',
          defaultEmailIdentity: {
            id: 'eid-1',
            email: 'a@example.com',
            displayName: 'Travail',
            isVerified: true,
            isActive: true,
          },
        },
        {
          id: 'client-2',
          name: 'Autre Client',
          slug: 'autre-client',
          budgetAccountingEnabled: false,
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.SUSPENDED,
          isDefault: false,
          defaultEmailIdentityId: null,
          defaultEmailIdentity: null,
        },
      ]);
    });

    it('ignore les ClientUser sans client associé', async () => {
      prisma.clientUser.findMany.mockResolvedValue([
        {
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          isDefault: false,
          defaultEmailIdentityId: null,
          defaultEmailIdentity: null,
          client: null,
        },
      ] as any);

      const result = await service.getClients('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('deleteEmailIdentity', () => {
    it('lève NotFoundException si identité absente', async () => {
      prisma.userEmailIdentity.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteEmailIdentity('user-1', 'eid-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève ForbiddenException si identité = e-mail de connexion (primaire)', async () => {
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        emailNormalized: 'user@example.com',
        directoryManaged: false,
      } as any);
      prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' } as any);
      await expect(
        service.deleteEmailIdentity('user-1', 'eid-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.userEmailIdentity.delete).not.toHaveBeenCalled();
    });

    it('lève ForbiddenException si identité gérée par annuaire (AD DS)', async () => {
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        emailNormalized: 'synced@example.com',
        directoryManaged: true,
      } as any);
      prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' } as any);
      await expect(
        service.deleteEmailIdentity('user-1', 'eid-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.userEmailIdentity.delete).not.toHaveBeenCalled();
    });

    it('lève ConflictException si identité utilisée comme défaut client', async () => {
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        emailNormalized: 'secondary@example.com',
        directoryManaged: false,
      } as any);
      prisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' } as any);
      prisma.clientUser.count.mockResolvedValue(1);
      await expect(
        service.deleteEmailIdentity('user-1', 'eid-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.userEmailIdentity.delete).not.toHaveBeenCalled();
    });
  });

  describe('createEmailIdentity', () => {
    it('crée l’identité et envoie un e-mail de vérification via la pile async', async () => {
      config.get.mockImplementation((key: string) => {
        switch (key) {
          case 'EMAIL_IDENTITY_VERIFY_TOKEN_TTL_HOURS':
            return '24';
          case 'EMAIL_IDENTITY_VERIFY_RESEND_COOLDOWN_MINUTES':
            return '15';
          case 'EMAIL_IDENTITY_VERIFY_SUCCESS_URL':
            return 'http://localhost/success';
          case 'EMAIL_IDENTITY_VERIFY_ERROR_URL':
            return 'http://localhost/error';
          default:
            return undefined;
        }
      });

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.userEmailIdentity.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ email: 'primary@example.com' } as any);

      const createdIdentity = {
        id: 'eid-2',
        userId: 'user-1',
        email: 'secondary@example.com',
        emailNormalized: 'secondary@example.com',
        displayName: null,
        replyToEmail: null,
        isVerified: false,
        isActive: true,
        directoryManaged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      prisma.userEmailIdentity.create.mockResolvedValue(createdIdentity);

      prisma.clientUser.findFirst.mockResolvedValue({ clientId: 'client-1' } as any);

      prisma.emailIdentityVerificationToken.create.mockResolvedValue({} as any);

      await service.createEmailIdentity('user-1', {
        email: 'secondary@example.com',
        displayName: null,
        replyToEmail: null,
      } as any);

      expect(prisma.emailIdentityVerificationToken.create).toHaveBeenCalledTimes(1);
      expect(emailService.queueEmail).toHaveBeenCalledTimes(1);
      expect(emailService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-1',
          recipient: 'secondary@example.com',
          templateKey: 'email_identity_verify',
          actionUrl: expect.stringContaining(
            'http://localhost/api/email-identities/verify?token=',
          ),
        }),
      );
      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'email.identity_verification.token_issued',
          userId: 'user-1',
          email: 'secondary@example.com',
          success: true,
        }),
      );
    });
  });

  describe('resendEmailIdentityVerification', () => {
    beforeEach(() => {
      delete process.env.STARIUM_SKIP_EMAIL_IDENTITY_RESEND_COOLDOWN;
    });

    it('renvoie un lien de vérification si l’identité est non vérifiée et hors cooldown', async () => {
      config.get.mockImplementation((key: string) => {
        switch (key) {
          case 'EMAIL_IDENTITY_VERIFY_TOKEN_TTL_HOURS':
            return '24';
          case 'EMAIL_IDENTITY_VERIFY_RESEND_COOLDOWN_MINUTES':
            return '15';
          case 'EMAIL_IDENTITY_VERIFY_SUCCESS_URL':
            return 'http://localhost/success';
          case 'EMAIL_IDENTITY_VERIFY_ERROR_URL':
            return 'http://localhost/error';
          default:
            return undefined;
        }
      });

      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        email: 'secondary@example.com',
        isVerified: false,
        isActive: true,
      } as any);

      prisma.emailIdentityVerificationToken.findFirst
        .mockResolvedValueOnce(null) // recentIdentityToken
        .mockResolvedValueOnce(null); // recentUserToken

      prisma.clientUser.findFirst.mockResolvedValue({ clientId: 'client-1' } as any);

      prisma.emailIdentityVerificationToken.updateMany.mockResolvedValue({} as any);
      prisma.emailIdentityVerificationToken.create.mockResolvedValue({} as any);

      await service.resendEmailIdentityVerification('user-1', 'eid-1');

      expect(prisma.emailIdentityVerificationToken.create).toHaveBeenCalledTimes(1);
      expect(emailService.queueEmail).toHaveBeenCalledTimes(1);
      expect(emailService.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'secondary@example.com',
          templateKey: 'email_identity_verify',
          actionUrl: expect.stringContaining(
            'http://localhost/api/email-identities/verify?token=',
          ),
        }),
      );
    });

    it('refuse si l’identité est déjà vérifiée', async () => {
      config.get.mockReturnValue('24');
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        email: 'secondary@example.com',
        isVerified: true,
        isActive: true,
      } as any);

      await expect(
        service.resendEmailIdentityVerification('user-1', 'eid-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse si cooldown non écoulé (anti-spam)', async () => {
      config.get.mockImplementation((key: string) => {
        switch (key) {
          case 'EMAIL_IDENTITY_VERIFY_TOKEN_TTL_HOURS':
            return '24';
          case 'EMAIL_IDENTITY_VERIFY_RESEND_COOLDOWN_MINUTES':
            return '60'; // grand cooldown
          case 'EMAIL_IDENTITY_VERIFY_SUCCESS_URL':
            return 'http://localhost/success';
          case 'EMAIL_IDENTITY_VERIFY_ERROR_URL':
            return 'http://localhost/error';
          default:
            return undefined;
        }
      });

      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        email: 'secondary@example.com',
        isVerified: false,
        isActive: true,
      } as any);

      const now = Date.now();
      prisma.emailIdentityVerificationToken.findFirst
        .mockResolvedValueOnce({
          createdAt: new Date(now - 5 * 60_000),
          consumedAt: null,
        }) // recentIdentityToken
        .mockResolvedValueOnce(null); // recentUserToken (non atteint dans ce test)

      try {
        await service.resendEmailIdentityVerification('user-1', 'eid-1');
        throw new Error('Expected resend to throw');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        const http = e as HttpException;
        expect(http.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const body = http.getResponse() as {
          message?: string;
          retryAfterSeconds?: number;
        };
        expect(body.message).toContain('Veuillez patienter avant de renvoyer le lien');
        expect(body.message).toMatch(/Temps restant\s*:/);
        expect(body.message).toContain('minute');
        expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(55 * 60 - 2);
        expect(body.retryAfterSeconds).toBeLessThanOrEqual(55 * 60 + 2);
      }
    });
  });

  describe('verifyEmailIdentityVerificationToken', () => {
    it('consomme le token et passe isVerified=true en transaction', async () => {
      config.get.mockImplementation((key: string) => {
        switch (key) {
          case 'EMAIL_IDENTITY_VERIFY_SUCCESS_URL':
            return 'http://localhost/success';
          case 'EMAIL_IDENTITY_VERIFY_ERROR_URL':
            return 'http://localhost/error';
          default:
            return undefined;
        }
      });

      const tokenPlain = 'token-123';
      const expectedTokenHash = createHash('sha256').update(tokenPlain).digest('hex');

      prisma.emailIdentityVerificationToken.findFirst.mockResolvedValue({
        emailIdentityId: 'eid-1',
      } as any);

      prisma.emailIdentityVerificationToken.updateMany.mockResolvedValue({
        count: 1,
      } as any);
      prisma.userEmailIdentity.updateMany.mockResolvedValue({
        count: 1,
      } as any);

      const redirect = await service.verifyEmailIdentityVerificationToken(tokenPlain);
      expect(redirect).toBe('http://localhost/success');

      expect(prisma.emailIdentityVerificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: expectedTokenHash, consumedAt: null },
        }) as any,
      );
      expect(prisma.userEmailIdentity.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'eid-1',
            isActive: true,
            isVerified: false,
          },
        }) as any,
      );
    });

    it('redirige vers l’URL erreur si token introuvable / expiré', async () => {
      config.get.mockImplementation((key: string) => {
        switch (key) {
          case 'EMAIL_IDENTITY_VERIFY_SUCCESS_URL':
            return 'http://localhost/success';
          case 'EMAIL_IDENTITY_VERIFY_ERROR_URL':
            return 'http://localhost/error';
          default:
            return undefined;
        }
      });

      prisma.emailIdentityVerificationToken.findFirst.mockResolvedValue(null);

      const redirect = await service.verifyEmailIdentityVerificationToken('bad-token');
      expect(redirect).toBe('http://localhost/error');
    });
  });

  describe('setDefaultEmailIdentityForClient', () => {
    it('lève ForbiddenException si le client n’est pas accessible', async () => {
      prisma.clientUser.findUnique.mockResolvedValue(null);
      await expect(
        service.setDefaultEmailIdentityForClient('user-1', 'c-1', {
          emailIdentityId: 'eid-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève BadRequestException si l’identité est inactive', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'c-1',
      } as any);
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        isActive: false,
      } as any);
      await expect(
        service.setDefaultEmailIdentityForClient('user-1', 'c-1', {
          emailIdentityId: 'eid-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('met à jour le ClientUser et retourne success', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'c-1',
      } as any);
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        isActive: true,
      } as any);
      prisma.clientUser.update.mockResolvedValue({} as any);

      const result = await service.setDefaultEmailIdentityForClient('user-1', 'c-1', {
        emailIdentityId: 'eid-1',
      });
      expect(result).toEqual({
        success: true,
        clientId: 'c-1',
        defaultEmailIdentityId: 'eid-1',
      });
      expect(prisma.clientUser.update).toHaveBeenCalledWith({
        where: { id: 'cu-1' },
        data: { defaultEmailIdentityId: 'eid-1' },
      });
    });
  });

  describe('setDefaultClient', () => {
    it('met à jour le client par défaut et retourne success', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'client-2',
        status: ClientUserStatus.ACTIVE,
      });
      prisma.clientUser.updateMany.mockResolvedValue({ count: 2 });
      prisma.clientUser.update.mockResolvedValue({});

      const result = await service.setDefaultClient('user-1', 'client-2');
      expect(result).toEqual({ success: true, defaultClientId: 'client-2' });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.clientUser.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefault: false },
      });
      expect(prisma.clientUser.update).toHaveBeenCalledWith({
        where: { id: 'cu-1' },
        data: { isDefault: true },
      });
    });

    it('lève ForbiddenException si le client n’appartient pas au user', async () => {
      prisma.clientUser.findUnique.mockResolvedValue(null);

      await expect(
        service.setDefaultClient('user-1', 'client-other'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si le rattachement n’est pas ACTIVE', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'client-2',
        status: ClientUserStatus.SUSPENDED,
      });

      await expect(
        service.setDefaultClient('user-1', 'client-2'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getPermissionCodes', () => {
    it('retourne les codes si module plateforme actif et ClientModule ENABLED', async () => {
      prisma.clientModule.findMany.mockResolvedValue([{ moduleId: 'm-budgets' }]);
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'budgets.read',
                  moduleId: 'm-budgets',
                  module: { isActive: true },
                },
              },
            ],
          },
        },
      ] as any);

      const codes = await service.getPermissionCodes('user-1', 'client-1');
      expect(codes).toEqual(['budgets.read']);
    });

    it('exclut si Module.isActive est false', async () => {
      prisma.clientModule.findMany.mockResolvedValue([{ moduleId: 'm-x' }]);
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'x.read',
                  moduleId: 'm-x',
                  module: { isActive: false },
                },
              },
            ],
          },
        },
      ] as any);

      const codes = await service.getPermissionCodes('user-1', 'client-1');
      expect(codes).toEqual([]);
    });

    it('exclut si aucun ClientModule ENABLED pour ce module', async () => {
      prisma.clientModule.findMany.mockResolvedValue([]);
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'budgets.read',
                  moduleId: 'm-budgets',
                  module: { isActive: true },
                },
              },
            ],
          },
        },
      ] as any);

      const codes = await service.getPermissionCodes('user-1', 'client-1');
      expect(codes).toEqual([]);
    });
  });
});

