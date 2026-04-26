import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from '@/lib/bcrypt-compat';
import * as speakeasy from 'speakeasy';
import { MfaService } from './mfa.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { MfaCryptoService } from './mfa-crypto.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { MfaChallengeChannel, MfaChallengePurpose } from '@prisma/client';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

jest.mock('@/lib/bcrypt-compat', () => {
  const actual = jest.requireActual<typeof import('@/lib/bcrypt-compat')>('@/lib/bcrypt-compat');
  return {
    __esModule: true,
    default: { ...actual.default, compare: jest.fn() },
  };
});

jest.mock('speakeasy', () => ({
  __esModule: true,
  ...jest.requireActual('speakeasy'),
  totp: { verify: jest.fn() },
}));

const meta: RequestMeta = {
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
  requestId: 'req-1',
};

const userId = 'user-1';
const challengeId = 'ch-1';

function fakeChallenge(overrides: Record<string, unknown> = {}) {
  return {
    id: challengeId,
    userId,
    purpose: MfaChallengePurpose.LOGIN,
    channel: MfaChallengeChannel.TOTP,
    consumedAt: null,
    expiresAt: new Date(Date.now() + 600_000),
    attemptCount: 0,
    user: { id: userId, email: 'u@test.com' },
    ...overrides,
  };
}

describe('MfaService – verifyLoginTotp (P0)', () => {
  let service: MfaService;
  let prisma: PrismaService;
  let crypto: MfaCryptoService;
  let securityLogs: SecurityLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: {
            mfaChallenge: {
              findFirst: jest.fn(),
              update: jest.fn().mockResolvedValue({ attemptCount: 1 }),
              deleteMany: jest.fn(),
            },
            userMfa: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: MfaCryptoService,
          useValue: {
            encrypt: jest.fn(),
            decrypt: jest.fn(),
          },
        },
        {
          provide: SecurityLogsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MfaService);
    prisma = module.get(PrismaService);
    crypto = module.get(MfaCryptoService);
    securityLogs = module.get(SecurityLogsService);
  });

  afterEach(() => jest.restoreAllMocks());

  const mfaRow = (backupHashes: string[] | null = null) => ({
    userId,
    totpSecretEncrypted: 'enc-payload',
    totpEnabledAt: new Date(),
    totpPending: false,
    backupCodesHashes: backupHashes,
  });

  it('decrypt fail + recovery code valide → userId, challenge consommé, code supprimé', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(['$2b$10$hashA', '$2b$10$hashB']),
    );
    (crypto.decrypt as jest.Mock).mockImplementation(() => {
      throw new Error('bad key');
    });
    (bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await service.verifyLoginTotp(challengeId, 'MYRECOVERY', meta);

    expect(result).toEqual({ userId });
    expect(prisma.userMfa.update).toHaveBeenCalledWith({
      where: { userId },
      data: { backupCodesHashes: ['$2b$10$hashA'] },
    });
    expect(prisma.mfaChallenge.update).toHaveBeenCalledWith({
      where: { id: challengeId },
      data: { consumedAt: expect.any(Date) },
    });
    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.mfa.recovery_success',
        reason: 'recovery_decrypt_failed',
      }),
    );
  });

  it('decrypt fail + recovery code invalide → 401 + audit failure', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(['$2b$10$hashA']),
    );
    (crypto.decrypt as jest.Mock).mockImplementation(() => {
      throw new Error('bad key');
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.verifyLoginTotp(challengeId, 'WRONG', meta),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.mfa.failure',
        reason: 'decrypt_failed_and_invalid_code',
      }),
    );
  });

  it('decrypt OK + TOTP valide → comportement existant inchangé', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(mfaRow());
    (crypto.decrypt as jest.Mock).mockReturnValue('BASE32SECRET');
    (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

    const result = await service.verifyLoginTotp(challengeId, '123456', meta);

    expect(result).toEqual({ userId });
    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.mfa.success' }),
    );
  });

  it('decrypt OK + TOTP invalide + recovery valide → succès via recovery', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(['$2b$10$hashA']),
    );
    (crypto.decrypt as jest.Mock).mockReturnValue('BASE32SECRET');
    (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.verifyLoginTotp(challengeId, 'MYRECOVERY', meta);

    expect(result).toEqual({ userId });
    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.mfa.recovery_success',
        reason: 'recovery',
      }),
    );
  });
});

describe('MfaService – deliverEmailOtp (P1-A)', () => {
  let service: MfaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: {
            mfaChallenge: {
              findFirst: jest.fn(),
              update: jest.fn().mockResolvedValue({ attemptCount: 0 }),
              deleteMany: jest.fn(),
            },
            userMfa: { findUnique: jest.fn(), update: jest.fn() },
            user: { findUnique: jest.fn() },
          },
        },
        {
          provide: MfaCryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: SecurityLogsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MfaService);
  });

  it('throw 500 en production sans SMTP_HOST', async () => {
    const original = { ...process.env };
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;

    await expect(
      (service as any).deliverEmailOtp('test@test.com', '123456'),
    ).rejects.toThrow('SMTP_HOST non configuré');

    process.env = original;
  });
});

describe('MfaService – verifyLoginRecovery (P1-B)', () => {
  let service: MfaService;
  let prisma: PrismaService;
  let securityLogs: SecurityLogsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: {
            mfaChallenge: {
              findFirst: jest.fn(),
              update: jest.fn().mockResolvedValue({ attemptCount: 1 }),
              deleteMany: jest.fn(),
            },
            userMfa: { findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: MfaCryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn(), getCurrentKeyVersion: jest.fn().mockReturnValue(1) },
        },
        {
          provide: SecurityLogsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MfaService);
    prisma = module.get(PrismaService);
    securityLogs = module.get(SecurityLogsService);
  });

  afterEach(() => jest.restoreAllMocks());

  const mfaRow = (backupHashes: string[] | null = null) => ({
    userId,
    totpSecretEncrypted: 'enc-payload',
    totpEnabledAt: new Date(),
    totpPending: false,
    backupCodesHashes: backupHashes,
  });

  it('code valide → succès + code consommé', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(['$2b$10$hashA']),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.verifyLoginRecovery(challengeId, 'ABCDEF1234', meta);
    expect(result).toEqual({ userId });
    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.mfa.recovery_success' }),
    );
  });

  it('code invalide → 401', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(['$2b$10$hashA']),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.verifyLoginRecovery(challengeId, 'WRONG', meta),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.mfa.recovery_failure' }),
    );
  });

  it('challenge expiré → 401', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(
      fakeChallenge({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      service.verifyLoginRecovery(challengeId, 'CODE', meta),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('trop de tentatives → 403', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(fakeChallenge());
    (prisma.mfaChallenge.update as jest.Mock).mockResolvedValue({ attemptCount: 6 });

    await expect(
      service.verifyLoginRecovery(challengeId, 'CODE', meta),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('recovery valide après sendLoginEmailOtp (channel ignoré)', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(
      fakeChallenge({ channel: 'EMAIL' }),
    );
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(['$2b$10$hashA']),
    );
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.verifyLoginRecovery(challengeId, 'ABC123', meta);
    expect(result).toEqual({ userId });
  });

  it('TOTP valide après sendLoginEmailOtp (channel ignoré, non-régression)', async () => {
    (prisma.mfaChallenge.findFirst as jest.Mock).mockResolvedValue(
      fakeChallenge({ channel: 'EMAIL' }),
    );
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(
      mfaRow(),
    );
    const crypto = (service as any).crypto as MfaCryptoService;
    (crypto.decrypt as jest.Mock).mockReturnValue('BASE32SECRET');
    (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

    const result = await service.verifyLoginTotp(challengeId, '123456', meta);
    expect(result).toEqual({ userId });
  });
});

describe('MfaService – adminResetMfa (P2)', () => {
  let service: MfaService;
  let prisma: PrismaService;
  let securityLogs: SecurityLogsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: {
            mfaChallenge: { findFirst: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
            userMfa: {
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: { findUnique: jest.fn() },
            trustedDevice: { deleteMany: jest.fn() },
            refreshToken: { deleteMany: jest.fn() },
          },
        },
        {
          provide: MfaCryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn(), getCurrentKeyVersion: jest.fn().mockReturnValue(1) },
        },
        {
          provide: SecurityLogsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MfaService);
    prisma = module.get(PrismaService);
    securityLogs = module.get(SecurityLogsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('MFA supprimée + sessions invalidées + audit log', async () => {
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue({
      userId: 'target-1',
      totpEnabledAt: new Date(),
      totpPending: false,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'target@test.com' });

    await service.adminResetMfa('target-1', 'admin-1', meta);

    expect(prisma.trustedDevice.deleteMany).toHaveBeenCalledWith({ where: { userId: 'target-1' } });
    expect(prisma.userMfa.delete).toHaveBeenCalledWith({ where: { userId: 'target-1' } });
    expect(prisma.mfaChallenge.deleteMany).toHaveBeenCalledWith({ where: { userId: 'target-1' } });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'target-1' } });
    expect(securityLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'admin.mfa.reset',
        userId: 'admin-1',
        reason: 'target:target-1',
      }),
    );
  });

  it('self-reset → 403', async () => {
    await expect(
      service.adminResetMfa('admin-1', 'admin-1', meta),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('user sans MFA → 400', async () => {
    (prisma.userMfa.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.adminResetMfa('target-1', 'admin-1', meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
