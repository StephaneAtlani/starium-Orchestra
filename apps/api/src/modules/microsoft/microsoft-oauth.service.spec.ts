import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import {
  MemoryMicrosoftOAuthStateStore,
  MicrosoftOAuthStateStore,
} from './microsoft-oauth-state.store';
import { MicrosoftRefreshLockService } from './microsoft-refresh-lock.service';
import { MicrosoftIdTokenService } from './microsoft-id-token.service';
import { MicrosoftTokenHttpService } from './microsoft-token-http.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MicrosoftPlatformConfigService } from './microsoft-platform-config.service';

describe('MicrosoftOAuthService', () => {
  it('getAuthorizationUrl signs state and registers jti', async () => {
    const sign = jest.fn().mockReturnValue('signed-state-jwt');
    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'JWT_SECRET')
                return 'test-secret-min-32-chars-for-jwt-service!!';
              if (k === 'MICROSOFT_CLIENT_ID') return 'app-id';
              if (k === 'MICROSOFT_CLIENT_SECRET') return 'secret';
              if (k === 'MICROSOFT_REDIRECT_URI')
                return 'http://localhost:3001/cb';
              if (k === 'MICROSOFT_TENANT') return 'common';
              if (k === 'MICROSOFT_GRAPH_SCOPES')
                return 'offline_access User.Read';
              return undefined;
            },
          },
        },
        {
          provide: MicrosoftPlatformConfigService,
          useValue: {
            getResolved: jest.fn().mockResolvedValue({
              redirectUri: 'http://localhost:3001/cb',
              graphScopes: 'offline_access User.Read',
              oauthSuccessUrl: null,
              oauthErrorUrl: null,
              oauthStateTtlSeconds: 600,
              refreshLeewaySeconds: 300,
              tokenHttpTimeoutMs: 5000,
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            client: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'client-1',
                microsoftOAuthClientId: null,
                microsoftOAuthClientSecretEncrypted: null,
                microsoftOAuthAuthorityTenant: null,
              }),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign, verify: jest.fn() },
        },
        MicrosoftTokenCryptoService,
        MemoryMicrosoftOAuthStateStore,
        {
          provide: MicrosoftOAuthStateStore,
          useExisting: MemoryMicrosoftOAuthStateStore,
        },
        MicrosoftRefreshLockService,
        MicrosoftIdTokenService,
        MicrosoftTokenHttpService,
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    const oauth = moduleRef.get(MicrosoftOAuthService);
    const store = moduleRef.get(MemoryMicrosoftOAuthStateStore);

    const result = await oauth.getAuthorizationUrl('user-1', 'client-1');

    expect(result.authorizationUrl).toContain('login.microsoftonline.com');
    expect(result.authorizationUrl).toContain('signed-state-jwt');
    expect(sign).toHaveBeenCalled();
    const payload = sign.mock.calls[0][0] as {
      jti: string;
      cid: string;
      sub: string;
    };
    expect(payload.sub).toBe('user-1');
    expect(payload.cid).toBe('client-1');
    expect(payload.jti).toBeDefined();
    expect(store.consume(payload.jti)).toBe(true);
  });
});
