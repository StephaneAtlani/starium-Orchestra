import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from '@/lib/bcrypt-compat';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } from './auth.constants';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { MfaService } from '../mfa/mfa.service';
import { TrustedDeviceService } from './trusted-device.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';

jest.mock('@/lib/bcrypt-compat', () => {
  const actual = jest.requireActual<typeof import('@/lib/bcrypt-compat')>('@/lib/bcrypt-compat');
  return {
    __esModule: true,
    default: {
      ...actual.default,
      compare: jest.fn(),
    },
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let securityLogs: SecurityLogsService;
  let mfa: MfaService;
  let trustedDevice: TrustedDeviceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            refreshToken: {
              findFirst: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              create: jest.fn(),
            },
            trustedDevice: {
              findFirst: jest.fn(),
              create: jest.fn(),
              deleteMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
          },
        },
        {
          provide: JWT_ACCESS_EXPIRATION,
          useValue: 900,
        },
        {
          provide: JWT_REFRESH_EXPIRATION,
          useValue: 604800,
        },
        {
          provide: SecurityLogsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: {
            isMfaTotpEnabled: jest.fn().mockResolvedValue(false),
            verifyLoginTotp: jest.fn(),
            verifyLoginRecovery: jest.fn(),
            sendLoginEmailOtp: jest.fn(),
            verifyLoginEmailOtp: jest.fn(),
            createLoginChallenge: jest.fn(),
          },
        },
        {
          provide: TrustedDeviceService,
          useValue: {
            validateAndTouch: jest.fn().mockResolvedValue(false),
            create: jest.fn(),
            revokeByToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    securityLogs = module.get<SecurityLogsService>(SecurityLogsService);
    mfa = module.get<MfaService>(MfaService);
    trustedDevice = module.get<TrustedDeviceService>(TrustedDeviceService);
  });

  const meta: RequestMeta = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    requestId: 'req-1',
  };

  describe('login', () => {
    it('should log auth.login.success on successful login', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hash',
          passwordLoginEnabled: true,
        },
      ] as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      await service.login('test@example.com', 'password', meta, undefined);

      expect((securityLogs.create as jest.Mock).mock.calls).toEqual(
        expect.arrayContaining([
          [
            expect.objectContaining({
              event: 'auth.login.success',
              userId: 'user-1',
              email: 'test@example.com',
              success: true,
              ipAddress: meta.ipAddress,
              userAgent: meta.userAgent,
              requestId: meta.requestId,
            }),
          ],
        ]),
      );
    });

    it('should return MFA_REQUIRED when TOTP 2FA is enabled', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hash',
          passwordLoginEnabled: true,
        },
      ] as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      (mfa.isMfaTotpEnabled as jest.Mock).mockResolvedValue(true);
      (mfa.createLoginChallenge as jest.Mock).mockResolvedValue({
        challengeId: 'challenge-1',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });

      const result = await service.login('test@example.com', 'password', meta, undefined);

      expect(result).toEqual({
        status: 'MFA_REQUIRED',
        challengeId: 'challenge-1',
        expiresAt: '2030-01-01T00:00:00.000Z',
      });
      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.login.mfa_required',
          userId: 'user-1',
        }),
      );
    });

    it('should skip MFA when trusted device token is valid', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hash',
          passwordLoginEnabled: true,
        },
      ] as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      (mfa.isMfaTotpEnabled as jest.Mock).mockResolvedValue(true);
      (trustedDevice.validateAndTouch as jest.Mock).mockResolvedValue(true);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      const hex64 = 'a'.repeat(64);
      const result = await service.login(
        'test@example.com',
        'password',
        meta,
        hex64,
      );

      expect(result).toMatchObject({
        status: 'AUTHENTICATED',
        accessToken: 'jwt-token',
      });
      expect(mfa.createLoginChallenge).not.toHaveBeenCalled();
      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.login.trusted_device',
          userId: 'user-1',
        }),
      );
    });

    it('should log auth.login.failure when user not found', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);

      await expect(
        service.login('unknown@example.com', 'password', meta, undefined),
      ).rejects.toBeInstanceOf(Error);

      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.login.failure',
          email: 'unknown@example.com',
          success: false,
          reason: 'invalid_credentials',
        }),
      );
    });

    it('refuse login si passwordLoginEnabled false (Microsoft SSO)', async () => {
      (bcrypt.compare as jest.Mock).mockClear();
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hash',
          passwordLoginEnabled: false,
        },
      ] as any);

      await expect(
        service.login('test@example.com', 'password', meta, undefined),
      ).rejects.toBeInstanceOf(Error);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.login.failure',
          userId: 'user-1',
          reason: 'password_login_disabled',
        }),
      );
    });

    it('résout l’utilisateur sans tenir compte de la casse (aligné SSO)', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          email: 'Test@Example.com',
          passwordHash: 'hash',
          passwordLoginEnabled: true,
        },
      ] as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      await service.login('test@example.com', 'password', meta, undefined);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { equals: 'test@example.com', mode: 'insensitive' } },
            {
              emailIdentities: {
                some: {
                  emailNormalized: 'test@example.com',
                  isVerified: true,
                  isActive: true,
                },
              },
            },
          ],
        },
      });
    });

    it('refuse le mot de passe si seule identité vérifiée correspond (aligné SSO Microsoft)', async () => {
      (bcrypt.compare as jest.Mock).mockClear();
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'user-1',
          email: 'work@company.com',
          passwordHash: 'hash',
          passwordLoginEnabled: false,
        },
      ] as any);

      await expect(
        service.login('satlani@outlook.com', 'password', meta, undefined),
      ).rejects.toBeInstanceOf(Error);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'password_login_disabled',
          userId: 'user-1',
        }),
      );
    });
  });

  describe('getPasswordLoginEligibility', () => {
    it('retourne true si email inconnu', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([]);
      await expect(
        service.getPasswordLoginEligibility('unknown@example.com'),
      ).resolves.toEqual({ passwordLoginAllowed: true });
    });

    it('retourne false si passwordLoginEnabled false', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'u1',
          email: 'a@b.com',
          passwordLoginEnabled: false,
        },
      ] as any);
      await expect(
        service.getPasswordLoginEligibility('a@b.com'),
      ).resolves.toEqual({ passwordLoginAllowed: false });
    });

    it('retourne true si compte avec mot de passe autorisé (casse variable)', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'u1',
          email: 'a@b.com',
          passwordLoginEnabled: true,
        },
      ] as any);
      await expect(
        service.getPasswordLoginEligibility('A@B.COM'),
      ).resolves.toEqual({ passwordLoginAllowed: true });
    });
  });

  describe('refresh', () => {
    it('should log auth.refresh on valid refresh', async () => {
      const now = Date.now();
      const future = new Date(now + 1000);
      jest.spyOn(global.Date, 'now').mockReturnValue(now);

      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: future,
        user: { email: 'test@example.com' },
      });
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({
        platformRole: null,
      });

      await service.refresh('refresh-token', meta);

      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.refresh',
          userId: 'user-1',
          email: 'test@example.com',
          success: true,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should log auth.logout with user when refresh token record exists', async () => {
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        user: { email: 'test@example.com' },
      });

      await service.logout('refresh-token', meta);

      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.logout',
          userId: 'user-1',
          email: 'test@example.com',
          success: true,
        }),
      );
    });

    it('should log auth.logout with null user when no record', async () => {
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await service.logout('refresh-token', meta);

      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.logout',
          userId: undefined,
          email: undefined,
          success: true,
        }),
      );
    });
  });

  describe('verifyMfaRecoveryAfterLogin', () => {
    it('émet tokens + trusted device après recovery code valide', async () => {
      (mfa.verifyLoginRecovery as jest.Mock).mockResolvedValue({ userId: 'user-1' });
      jest.spyOn(prisma.user, 'findUnique' as any).mockResolvedValue({
        email: 'test@example.com',
        platformRole: null,
      });
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);
      (trustedDevice.create as jest.Mock).mockResolvedValue({
        token: 'td-token-abc',
      });

      const result = await service.verifyMfaRecoveryAfterLogin(
        'ch-1',
        'RECOVERYCODE',
        meta,
        true,
      );

      expect(result.status).toBe('AUTHENTICATED');
      expect(result.accessToken).toBe('jwt-token');
      expect(result.trustedDeviceToken).toBe('td-token-abc');
      expect(securityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'auth.login.success' }),
      );
    });
  });
});

