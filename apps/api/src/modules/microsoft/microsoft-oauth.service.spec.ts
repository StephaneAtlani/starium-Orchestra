import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ClientUserStatus,
  ClientUserRole,
  MicrosoftAuthMode,
  MicrosoftConnectionStatus,
} from '@prisma/client';
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
import { MICROSOFT_OAUTH_STATE_PURPOSE } from './microsoft.constants';

const JWT_SECRET = 'test-secret-min-32-chars-for-jwt-service!!';

function configServiceMock() {
  return {
    get: (k: string) => {
      if (k === 'JWT_SECRET') return JWT_SECRET;
      if (k === 'MICROSOFT_CLIENT_ID') return 'app-id';
      if (k === 'MICROSOFT_CLIENT_SECRET') return 'secret';
      if (k === 'MICROSOFT_REDIRECT_URI') return 'http://localhost:3001/cb';
      if (k === 'MICROSOFT_TENANT') return 'common';
      if (k === 'MICROSOFT_GRAPH_SCOPES') return 'offline_access User.Read';
      if (k === 'MICROSOFT_OAUTH_SUCCESS_URL') return '/ok';
      if (k === 'MICROSOFT_OAUTH_ERROR_URL') return '/err';
      return undefined;
    },
  };
}

const platformResolved = {
  redirectUri: 'http://localhost:3001/cb',
  graphScopes: 'offline_access User.Read',
  oauthSuccessUrl: null,
  oauthErrorUrl: null,
  oauthStateTtlSeconds: 600,
  refreshLeewaySeconds: 300,
  tokenHttpTimeoutMs: 5000,
};

describe('MicrosoftOAuthService', () => {
  it('getAuthorizationUrl signs state and registers jti', async () => {
    const sign = jest.fn().mockReturnValue('signed-state-jwt');
    const moduleRef = await Test.createTestingModule({
      providers: [
        MicrosoftOAuthService,
        { provide: ConfigService, useValue: configServiceMock() },
        {
          provide: MicrosoftPlatformConfigService,
          useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
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
        { provide: JwtService, useValue: { sign, verify: jest.fn() } },
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
    await expect(store.consume('signed-state-jwt')).resolves.toBe(true);
  });

  describe('handleOAuthCallback', () => {
    const userId = 'user-1';
    const clientIdA = 'client-id-A';
    const tenantId = 'tenant-ms-1';
    const jti = 'jti-test-uuid';

    const statePayload = {
      sub: userId,
      cid: clientIdA,
      jti,
      purpose: MICROSOFT_OAUTH_STATE_PURPOSE,
    };

    async function buildServiceForCallback(mocks: {
      prisma: Record<string, unknown>;
      jwtVerify: jest.Mock;
      tokenHttpPost: jest.Mock;
      idTokenVerify: jest.Mock;
      auditCreate: jest.Mock;
    }) {
      const store = new MemoryMicrosoftOAuthStateStore();
      await store.register({
        stateToken: 'jwt-state',
        userId,
        clientId: clientIdA,
        redirectUri: platformResolved.redirectUri,
        ttlMs: 600_000,
      });

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: {
              getResolved: jest.fn().mockResolvedValue(platformResolved),
            },
          },
          { provide: PrismaService, useValue: mocks.prisma },
          {
            provide: JwtService,
            useValue: { sign: jest.fn(), verify: mocks.jwtVerify },
          },
          MicrosoftTokenCryptoService,
          { provide: MicrosoftOAuthStateStore, useValue: store },
          MicrosoftRefreshLockService,
          {
            provide: MicrosoftIdTokenService,
            useValue: { verifyIdToken: mocks.idTokenVerify },
          },
          { provide: MicrosoftTokenHttpService, useValue: { postTokenForm: mocks.tokenHttpPost } },
          { provide: AuditLogsService, useValue: { create: mocks.auditCreate } },
        ],
      }).compile();

      return {
        oauth: moduleRef.get(MicrosoftOAuthService),
        store,
      };
    }

    function basePrismaForHappyPath(options: {
      revokedCount: number;
      upsertImpl?: jest.Mock;
    }) {
      const clientFindUnique = jest.fn(({ where }: { where: { id: string } }) => {
        if (where.id !== clientIdA) {
          throw new Error(`cross-client leak: expected ${clientIdA}, got ${where.id}`);
        }
        return Promise.resolve({
          id: where.id,
          microsoftOAuthClientId: null,
          microsoftOAuthClientSecretEncrypted: null,
          microsoftOAuthAuthorityTenant: null,
        });
      });

      const clientUserFindFirst = jest.fn(
        ({
          where,
        }: {
          where: { userId: string; clientId: string; status: ClientUserStatus };
        }) => {
          if (where.clientId !== clientIdA) {
            throw new Error(`cross-client leak: clientUser clientId ${where.clientId}`);
          }
          return Promise.resolve({
            id: 'cu-1',
            userId,
            clientId: clientIdA,
            status: ClientUserStatus.ACTIVE,
            role: ClientUserRole.CLIENT_ADMIN,
          });
        },
      );

      const upsert =
        options.upsertImpl ??
        jest.fn(
          ({
            where,
            create,
            update,
          }: {
            where: { clientId_tenantId: { clientId: string; tenantId: string } };
            create: Record<string, unknown>;
            update: Record<string, unknown>;
          }) => {
            expect(where.clientId_tenantId.clientId).toBe(clientIdA);
            expect(where.clientId_tenantId.tenantId).toBe(tenantId);
            expect(create.status ?? update.status).toBe(MicrosoftConnectionStatus.ACTIVE);
            const encAccess = (create.accessTokenEncrypted ??
              update.accessTokenEncrypted) as string;
            const encRefresh = (create.refreshTokenEncrypted ??
              update.refreshTokenEncrypted) as string | null;
            expect(encAccess).toBeTruthy();
            expect(encAccess).not.toContain('plain-access');
            expect(encRefresh).toBeTruthy();
            return Promise.resolve({
              id: 'conn-upsert-1',
              clientId: clientIdA,
              tenantId,
              status: MicrosoftConnectionStatus.ACTIVE,
              accessTokenEncrypted: encAccess,
              refreshTokenEncrypted: encRefresh,
            });
          },
        );

      const tx = {
        microsoftConnection: {
          updateMany: jest.fn().mockResolvedValue({ count: options.revokedCount }),
          upsert,
        },
      };

      return {
        client: { findUnique: clientFindUnique },
        clientUser: { findFirst: clientUserFindFirst },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            email: 'user-1@contoso.com',
            emailIdentities: [],
          }),
        },
        $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
          fn(tx),
        ),
      };
    }

    it('happy path: crée MicrosoftConnection, ACTIVE, tokens chiffrés, audit connected', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        id_token: 'mock-id-token',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-1',
        preferredUsername: 'user-1@contoso.com',
        displayName: 'User One',
      });

      const prisma = basePrismaForHappyPath({ revokedCount: 0 });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });

      const { redirectUrl } = await oauth.handleOAuthCallback({
        code: 'auth-code',
        state: 'jwt-state',
      });

      expect(redirectUrl).toContain('microsoft=connected');
      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: clientIdA,
          userId,
          action: 'microsoft_connection.connected',
          resourceType: 'microsoft_connection',
          resourceId: 'conn-upsert-1',
          newValue: expect.objectContaining({ tenantId }),
        }),
      );
      expect(auditCreate.mock.calls.filter((c) => c[0].action === 'microsoft_connection.revoked')).toHaveLength(0);
    });

    it('happy path: reconnect — updateMany > 0 puis upsert update, audits connected + revoked bulk', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        id_token: 'mock-id-token',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-1',
        preferredUsername: 'user-1@contoso.com',
        displayName: 'User One',
      });

      const prisma = basePrismaForHappyPath({ revokedCount: 2 });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });

      await oauth.handleOAuthCallback({
        code: 'auth-code',
        state: 'jwt-state',
      });

      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'microsoft_connection.connected',
          clientId: clientIdA,
          resourceId: 'conn-upsert-1',
        }),
      );
      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'microsoft_connection.revoked',
          clientId: clientIdA,
          newValue: expect.objectContaining({
            bulk: true,
            count: 2,
            reason: 'replaced_by_new_connect',
          }),
        }),
      );
    });

    it('state JWT invalide → redirect invalid_state', async () => {
      const auditCreate = jest.fn();
      const jwtVerify = jest.fn().mockImplementation(() => {
        throw new Error('bad sig');
      });
      const prisma = {
        client: { findUnique: jest.fn() },
        clientUser: { findFirst: jest.fn() },
        $transaction: jest.fn(),
      };

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost: jest.fn(),
        idTokenVerify: jest.fn(),
        auditCreate,
      });

      const { redirectUrl } = await oauth.handleOAuthCallback({
        code: 'c',
        state: 'bad',
      });
      expect(redirectUrl).toContain('code=invalid_state');
      expect(prisma.client.findUnique).not.toHaveBeenCalled();
    });

    it('state replay (jti déjà consommé) → state_replay', async () => {
      const auditCreate = jest.fn();
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const store = new MemoryMicrosoftOAuthStateStore();
      await store.register({
        stateToken: 's',
        userId,
        clientId: clientIdA,
        redirectUri: platformResolved.redirectUri,
        ttlMs: 600_000,
      });
      await store.consume('s');

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
          },
          {
            provide: PrismaService,
            useValue: {
              client: { findUnique: jest.fn() },
              clientUser: { findFirst: jest.fn() },
              $transaction: jest.fn(),
            },
          },
          { provide: JwtService, useValue: { sign: jest.fn(), verify: jwtVerify } },
          MicrosoftTokenCryptoService,
          { provide: MicrosoftOAuthStateStore, useValue: store },
          MicrosoftRefreshLockService,
          { provide: MicrosoftIdTokenService, useValue: { verifyIdToken: jest.fn() } },
          { provide: MicrosoftTokenHttpService, useValue: { postTokenForm: jest.fn() } },
          { provide: AuditLogsService, useValue: { create: auditCreate } },
        ],
      }).compile();

      const oauth = moduleRef.get(MicrosoftOAuthService);
      const { redirectUrl } = await oauth.handleOAuthCallback({
        code: 'c',
        state: 's',
      });
      expect(redirectUrl).toContain('code=state_replay');
    });

    it('sans ClientUser ACTIVE → forbidden_client', async () => {
      const auditCreate = jest.fn();
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const store = new MemoryMicrosoftOAuthStateStore();
      await store.register({
        stateToken: 's',
        userId,
        clientId: clientIdA,
        redirectUri: platformResolved.redirectUri,
        ttlMs: 600_000,
      });

      const clientFindUnique = jest.fn().mockResolvedValue({
        id: clientIdA,
        microsoftOAuthClientId: null,
        microsoftOAuthClientSecretEncrypted: null,
        microsoftOAuthAuthorityTenant: null,
      });

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
          },
          {
            provide: PrismaService,
            useValue: {
              client: { findUnique: clientFindUnique },
              clientUser: { findFirst: jest.fn().mockResolvedValue(null) },
              user: { findUnique: jest.fn() },
              $transaction: jest.fn(),
            },
          },
          { provide: JwtService, useValue: { sign: jest.fn(), verify: jwtVerify } },
          MicrosoftTokenCryptoService,
          { provide: MicrosoftOAuthStateStore, useValue: store },
          MicrosoftRefreshLockService,
          { provide: MicrosoftIdTokenService, useValue: { verifyIdToken: jest.fn() } },
          { provide: MicrosoftTokenHttpService, useValue: { postTokenForm: jest.fn() } },
          { provide: AuditLogsService, useValue: { create: auditCreate } },
        ],
      }).compile();

      const oauth = moduleRef.get(MicrosoftOAuthService);
      const { redirectUrl } = await oauth.handleOAuthCallback({
        code: 'c',
        state: 's',
      });
      expect(redirectUrl).toContain('code=forbidden_client');
      expect(auditCreate).not.toHaveBeenCalled();
    });

    it('isolation: uniquement clientId du state pour Prisma (client A)', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'a',
        refresh_token: 'r',
        expires_in: 3600,
        id_token: 'idt',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-1',
        preferredUsername: 'user-1@contoso.com',
        displayName: 'User One',
      });

      const prisma = basePrismaForHappyPath({ revokedCount: 0 });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });

      await oauth.handleOAuthCallback({ code: 'c', state: 'jwt-state' });

      const findUnique = prisma.client.findUnique as jest.Mock;
      expect(findUnique.mock.calls.every((c) => c[0].where.id === clientIdA)).toBe(true);
      const cu = prisma.clientUser.findFirst as jest.Mock;
      expect(cu.mock.calls[0][0].where.clientId).toBe(clientIdA);
    });

    it('succès si email Microsoft = email secondaire validé du même utilisateur', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        id_token: 'mock-id-token',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-2',
        preferredUsername: 'secondary@contoso.com',
      });
      const prisma = basePrismaForHappyPath({ revokedCount: 0 }) as Record<
        string,
        unknown
      >;
      (prisma.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        email: 'primary@contoso.com',
        emailIdentities: [{ emailNormalized: 'secondary@contoso.com' }],
      });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });

      const result = await oauth.handleOAuthCallback({ code: 'c', state: 'jwt-state' });
      expect(result.redirectUrl).toContain('microsoft=connected');
    });

    it('refus si email Microsoft inconnu', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        id_token: 'mock-id-token',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-2',
        preferredUsername: 'unknown@contoso.com',
      });
      const prisma = basePrismaForHappyPath({ revokedCount: 0 }) as Record<
        string,
        unknown
      >;
      (prisma.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        email: 'primary@contoso.com',
        emailIdentities: [{ emailNormalized: 'secondary@contoso.com' }],
      });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });

      const result = await oauth.handleOAuthCallback({ code: 'c', state: 'jwt-state' });
      expect(result.redirectUrl).toContain('code=identity_email_mismatch');
      expect((prisma.$transaction as jest.Mock)).not.toHaveBeenCalled();
      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'microsoft_connection.connection_failed',
          newValue: expect.objectContaining({ code: 'identity_email_mismatch' }),
        }),
      );
    });

    it('refus si email Microsoft = secondaire non validé', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        id_token: 'mock-id-token',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-2',
        preferredUsername: 'secondary@contoso.com',
      });
      const prisma = basePrismaForHappyPath({ revokedCount: 0 }) as Record<
        string,
        unknown
      >;
      (prisma.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
        email: 'primary@contoso.com',
        emailIdentities: [],
      });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });
      const result = await oauth.handleOAuthCallback({ code: 'c', state: 'jwt-state' });
      expect(result.redirectUrl).toContain('code=identity_email_mismatch');
    });

    it('refus si Microsoft ne retourne pas d’email fiable', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const jwtVerify = jest.fn().mockReturnValue(statePayload);
      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        expires_in: 3600,
        id_token: 'mock-id-token',
      });
      const idTokenVerify = jest.fn().mockResolvedValue({
        tid: tenantId,
        subject: 'ms-user-2',
      });
      const prisma = basePrismaForHappyPath({ revokedCount: 0 });

      const { oauth } = await buildServiceForCallback({
        prisma,
        jwtVerify,
        tokenHttpPost,
        idTokenVerify,
        auditCreate,
      });
      const result = await oauth.handleOAuthCallback({ code: 'c', state: 'jwt-state' });
      expect(result.redirectUrl).toContain('code=missing_reliable_email');
    });
  });

  describe('ensureFreshAccessToken', () => {
    it('après refresh réussi → audit microsoft_connection.refreshed avec clientId et resourceId', async () => {
      const connectionId = 'conn-refresh-1';
      const clientId = 'client-z';
      const tenantId = 'tid-z';
      const auditCreate = jest.fn().mockResolvedValue(undefined);

      const expired = new Date(Date.now() - 60 * 60 * 1000);

      const connRow = {
        id: connectionId,
        clientId,
        tenantId,
        status: MicrosoftConnectionStatus.ACTIVE,
        authMode: MicrosoftAuthMode.DELEGATED,
        accessTokenEncrypted: '',
        refreshTokenEncrypted: '',
        tokenExpiresAt: expired,
        connectedByUserId: 'u-z',
      };

      const prisma = {
        client: {
          findUnique: jest.fn().mockResolvedValue({
            id: clientId,
            microsoftOAuthClientId: null,
            microsoftOAuthClientSecretEncrypted: null,
            microsoftOAuthAuthorityTenant: null,
          }),
        },
        microsoftConnection: {
          findFirst: jest.fn().mockResolvedValue(connRow),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const tokenHttpPost = jest.fn().mockResolvedValue({
        access_token: 'new-access',
        expires_in: 3600,
        refresh_token: 'new-refresh',
      });

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
          },
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
          MicrosoftTokenCryptoService,
          MemoryMicrosoftOAuthStateStore,
          {
            provide: MicrosoftOAuthStateStore,
            useExisting: MemoryMicrosoftOAuthStateStore,
          },
          MicrosoftRefreshLockService,
          MicrosoftIdTokenService,
          { provide: MicrosoftTokenHttpService, useValue: { postTokenForm: tokenHttpPost } },
          { provide: AuditLogsService, useValue: { create: auditCreate } },
        ],
      }).compile();

      const crypto = moduleRef.get(MicrosoftTokenCryptoService);
      connRow.accessTokenEncrypted = crypto.encrypt('old-access');
      connRow.refreshTokenEncrypted = crypto.encrypt('old-refresh');

      const oauth = moduleRef.get(MicrosoftOAuthService);
      await oauth.ensureFreshAccessToken(connectionId, clientId);

      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'microsoft_connection.refreshed',
          clientId,
          resourceId: connectionId,
          userId: 'u-z',
          newValue: { tenantId },
        }),
      );
      expect(tokenHttpPost).toHaveBeenCalled();
    });

    it('échec refresh invalid_grant → audit microsoft_connection.error', async () => {
      const connectionId = 'conn-err-1';
      const clientId = 'client-err';
      const auditCreate = jest.fn().mockResolvedValue(undefined);

      const expired = new Date(Date.now() - 60 * 60 * 1000);
      const crypto = await Test.createTestingModule({
        providers: [MicrosoftTokenCryptoService, { provide: ConfigService, useValue: configServiceMock() }],
      }).compile();
      const c = crypto.get(MicrosoftTokenCryptoService);

      const connRow = {
        id: connectionId,
        clientId,
        tenantId: 't1',
        status: MicrosoftConnectionStatus.ACTIVE,
        authMode: MicrosoftAuthMode.DELEGATED,
        accessTokenEncrypted: c.encrypt('a'),
        refreshTokenEncrypted: c.encrypt('r'),
        tokenExpiresAt: expired,
        connectedByUserId: 'u1',
      };

      const err = Object.assign(new Error('token'), { oauthError: 'invalid_grant' });

      const prisma = {
        client: {
          findUnique: jest.fn().mockResolvedValue({
            id: clientId,
            microsoftOAuthClientId: null,
            microsoftOAuthClientSecretEncrypted: null,
            microsoftOAuthAuthorityTenant: null,
          }),
        },
        microsoftConnection: {
          findFirst: jest.fn().mockResolvedValue(connRow),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
          },
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
          MicrosoftTokenCryptoService,
          MemoryMicrosoftOAuthStateStore,
          {
            provide: MicrosoftOAuthStateStore,
            useExisting: MemoryMicrosoftOAuthStateStore,
          },
          MicrosoftRefreshLockService,
          MicrosoftIdTokenService,
          { provide: MicrosoftTokenHttpService, useValue: { postTokenForm: jest.fn().mockRejectedValue(err) } },
          { provide: AuditLogsService, useValue: { create: auditCreate } },
        ],
      }).compile();

      const oauth = moduleRef.get(MicrosoftOAuthService);
      await expect(oauth.ensureFreshAccessToken(connectionId, clientId)).rejects.toThrow();

      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'microsoft_connection.error',
          clientId,
          newValue: expect.objectContaining({
            code: 'invalid_grant',
          }),
        }),
      );
    });
  });

  describe('revokeConnection', () => {
    it('idempotent: aucune connexion ACTIVE → pas d’audit, pas d’erreur', async () => {
      const auditCreate = jest.fn();
      const prisma = {
        microsoftConnection: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        $transaction: jest.fn(),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
          },
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
          MicrosoftTokenCryptoService,
          MemoryMicrosoftOAuthStateStore,
          {
            provide: MicrosoftOAuthStateStore,
            useExisting: MemoryMicrosoftOAuthStateStore,
          },
          MicrosoftRefreshLockService,
          MicrosoftIdTokenService,
          MicrosoftTokenHttpService,
          { provide: AuditLogsService, useValue: { create: auditCreate } },
        ],
      }).compile();

      const oauth = moduleRef.get(MicrosoftOAuthService);
      await expect(oauth.revokeConnection('client-x', 'user-x')).resolves.toBeUndefined();
      expect(auditCreate).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('révocation avec connexion ACTIVE → audit revoked avec resourceId', async () => {
      const auditCreate = jest.fn().mockResolvedValue(undefined);
      const connId = 'to-revoke-1';

      const prisma = {
        microsoftConnection: {
          findMany: jest.fn().mockResolvedValue([{ id: connId }]),
          update: jest.fn().mockResolvedValue({}),
        },
        $transaction: jest.fn().mockImplementation(async (ops: unknown[]) => {
          for (const op of ops as Array<Promise<unknown>>) {
            await op;
          }
        }),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          MicrosoftOAuthService,
          { provide: ConfigService, useValue: configServiceMock() },
          {
            provide: MicrosoftPlatformConfigService,
            useValue: { getResolved: jest.fn().mockResolvedValue(platformResolved) },
          },
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
          MicrosoftTokenCryptoService,
          MemoryMicrosoftOAuthStateStore,
          {
            provide: MicrosoftOAuthStateStore,
            useExisting: MemoryMicrosoftOAuthStateStore,
          },
          MicrosoftRefreshLockService,
          MicrosoftIdTokenService,
          MicrosoftTokenHttpService,
          { provide: AuditLogsService, useValue: { create: auditCreate } },
        ],
      }).compile();

      const oauth = moduleRef.get(MicrosoftOAuthService);
      await oauth.revokeConnection('client-r', 'user-r');

      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'microsoft_connection.revoked',
          clientId: 'client-r',
          userId: 'user-r',
          resourceId: connId,
          newValue: { reason: 'user_revoked' },
        }),
      );
    });
  });
});
