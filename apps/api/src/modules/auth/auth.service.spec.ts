import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } from './auth.constants';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';

jest.mock('bcrypt', () => {
  const actual = jest.requireActual('bcrypt');
  return {
    __esModule: true,
    ...actual,
    compare: jest.fn(),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let securityLogs: SecurityLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            refreshToken: {
              findFirst: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              create: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    securityLogs = module.get<SecurityLogsService>(SecurityLogsService);
  });

  const meta: RequestMeta = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    requestId: 'req-1',
  };

  describe('login', () => {
    it('should log auth.login.success on successful login', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as any);

      await service.login('test@example.com', 'password', meta);

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

    it('should log auth.login.failure when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.login('unknown@example.com', 'password', meta),
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
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
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
});

