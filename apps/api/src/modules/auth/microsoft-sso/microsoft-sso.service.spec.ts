import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MicrosoftSsoService } from './microsoft-sso.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftIdTokenService } from '../../microsoft/microsoft-id-token.service';
import { MicrosoftTokenHttpService } from '../../microsoft/microsoft-token-http.service';
import { SecurityLogsService } from '../../security-logs/security-logs.service';
import { MicrosoftPlatformConfigService } from '../../microsoft/microsoft-platform-config.service';

describe('MicrosoftSsoService', () => {
  let service: MicrosoftSsoService;
  let prisma: any;
  let tokenHttp: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftSsoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const vars: Record<string, string> = {
                MICROSOFT_CLIENT_ID: 'client-id',
                MICROSOFT_CLIENT_SECRET: 'client-secret',
                MICROSOFT_SSO_REDIRECT_URI:
                  'http://localhost:3001/api/auth/microsoft/callback',
                MICROSOFT_SSO_SUCCESS_URL: 'http://localhost:3000/login?status=success',
                MICROSOFT_SSO_ERROR_URL: 'http://localhost:3000/login?status=error',
                JWT_ACCESS_EXPIRATION: '900',
                JWT_REFRESH_EXPIRATION: '604800',
              };
              return vars[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            microsoftOAuthState: {
              create: jest.fn(),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn().mockResolvedValue({ platformRole: null }),
            },
            userEmailIdentity: {
              findMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
            },
            refreshToken: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('jwt') },
        },
        {
          provide: MicrosoftIdTokenService,
          useValue: { verifyIdToken: jest.fn().mockResolvedValue({ tid: 't' }) },
        },
        {
          provide: MicrosoftTokenHttpService,
          useValue: { postTokenForm: jest.fn() },
        },
        {
          provide: SecurityLogsService,
          useValue: { create: jest.fn() },
        },
        {
          provide: MicrosoftPlatformConfigService,
          useValue: {
            getResolved: jest.fn().mockResolvedValue({
              redirectUri: 'http://localhost:3001/api/auth/microsoft/callback',
              graphScopes: 'openid profile email User.Read',
              oauthSuccessUrl: null,
              oauthErrorUrl: null,
              oauthStateTtlSeconds: 600,
              refreshLeewaySeconds: 300,
              tokenHttpTimeoutMs: 5000,
            }),
            getSsoCredentialsFromPlatformDb: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get(MicrosoftSsoService);
    prisma = module.get(PrismaService);
    tokenHttp = module.get(MicrosoftTokenHttpService);
  });

  it('retourne une URL d authorization et persiste un state', async () => {
    const result = await service.getAuthorizationUrl();
    expect(result.authorizationUrl).toContain('login.microsoftonline.com');
    const auth = new URL(result.authorizationUrl);
    expect(auth.searchParams.get('scope')).toBe('openid profile email');
    expect(auth.searchParams.get('prompt')).toBe('select_account');
    expect(prisma.microsoftOAuthState.create).toHaveBeenCalledTimes(1);
    expect(prisma.microsoftOAuthState.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          redirectUri:
            'http://localhost:3001/api/auth/microsoft/callback',
          stateTokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('refuse si email secondaire non verifiee', async () => {
    (tokenHttp.postTokenForm as jest.Mock).mockResolvedValue({
      access_token: 'access-token',
      id_token:
        'eyJhbGciOiJub25lIn0.eyJlbWFpbCI6InNzb0BleGFtcGxlLmNvbSJ9.',
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userEmailIdentity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userEmailIdentity.count as jest.Mock).mockResolvedValue(1);

    const result = await service.handleCallback(
      { code: 'c', state: 's' },
      { ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'r1' },
    );
    expect(result.redirectUrl).toContain('reason=email_not_verified');
  });

  it('accepte si email Microsoft = email principal avec acces actif', async () => {
    (tokenHttp.postTokenForm as jest.Mock).mockResolvedValue({
      access_token: 'access-token',
      id_token:
        'eyJhbGciOiJub25lIn0.eyJlbWFpbCI6InByaW1hcnlAZXhhbXBsZS5jb20ifQ.',
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', platformRole: null, clientUsers: [{ id: 'cu1' }] },
    ]);
    (prisma.userEmailIdentity.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.handleCallback(
      { code: 'c', state: 's' },
      { ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'r-success-1' },
    );
    expect(result.redirectUrl).toContain('status=success');
    expect(result.redirectUrl).toContain('#accessToken=');
  });

  it('accepte si email Microsoft = email secondaire verifiee', async () => {
    (tokenHttp.postTokenForm as jest.Mock).mockResolvedValue({
      access_token: 'access-token',
      id_token:
        'eyJhbGciOiJub25lIn0.eyJlbWFpbCI6InNlY29uZGFyeUBleGFtcGxlLmNvbSJ9.',
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userEmailIdentity.findMany as jest.Mock).mockResolvedValue([
      {
        user: { id: 'u2', platformRole: null, clientUsers: [{ id: 'cu2' }] },
      },
    ]);

    const result = await service.handleCallback(
      { code: 'c', state: 's' },
      { ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'r-success-2' },
    );
    expect(result.redirectUrl).toContain('status=success');
  });

  it('refuse si correspondance ambigue sur plusieurs users', async () => {
    (tokenHttp.postTokenForm as jest.Mock).mockResolvedValue({
      access_token: 'access-token',
      id_token:
        'eyJhbGciOiJub25lIn0.eyJlbWFpbCI6ImR1cGxpY2F0ZUBleGFtcGxlLmNvbSJ9.',
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', platformRole: null, clientUsers: [{ id: 'cu1' }] },
      { id: 'u2', platformRole: null, clientUsers: [{ id: 'cu2' }] },
    ]);
    (prisma.userEmailIdentity.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.handleCallback(
      { code: 'c', state: 's' },
      { ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'r2' },
    );
    expect(result.redirectUrl).toContain('reason=email_ambiguous');
  });

  it('refuse si aucun email verifie ne correspond', async () => {
    (tokenHttp.postTokenForm as jest.Mock).mockResolvedValue({
      access_token: 'access-token',
      id_token:
        'eyJhbGciOiJub25lIn0.eyJlbWFpbCI6InVua25vd25AZXhhbXBsZS5jb20ifQ.',
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userEmailIdentity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userEmailIdentity.count as jest.Mock).mockResolvedValue(0);

    const result = await service.handleCallback(
      { code: 'c', state: 's' },
      { ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'r3' },
    );
    expect(result.redirectUrl).toContain('reason=email_unknown');
  });

  it('refuse state deja consomme ou expire', async () => {
    (prisma.microsoftOAuthState.updateMany as jest.Mock).mockResolvedValueOnce({
      count: 0,
    });
    const result = await service.handleCallback(
      { code: 'c', state: 'expired' },
      { ipAddress: '127.0.0.1', userAgent: 'jest', requestId: 'r4' },
    );
    expect(result.redirectUrl).toContain('reason=invalid_or_expired_state');
  });
});
