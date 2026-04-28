import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MicrosoftAuthMode,
  MicrosoftConnectionStatus,
  ClientUserStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MicrosoftTokenCryptoService } from './microsoft-token-crypto.service';
import { MicrosoftOAuthStateStore } from './microsoft-oauth-state.store';
import { MicrosoftRefreshLockService } from './microsoft-refresh-lock.service';
import { MicrosoftIdTokenService } from './microsoft-id-token.service';
import { MicrosoftTokenHttpService } from './microsoft-token-http.service';
import { MicrosoftPlatformConfigService } from './microsoft-platform-config.service';
import { MICROSOFT_OAUTH_STATE_PURPOSE } from './microsoft.constants';
import type { MicrosoftOAuthStatePayload } from './microsoft-oauth.types';
import type { ResolvedPlatformMicrosoftConfig } from './microsoft-platform-config.types';

export interface MicrosoftConnectionPublic {
  id: string;
  tenantId: string;
  tenantName: string | null;
  status: MicrosoftConnectionStatus;
  tokenExpiresAt: Date | null;
  connectedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MicrosoftOAuthService {
  private readonly logger = new Logger(MicrosoftOAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly crypto: MicrosoftTokenCryptoService,
    @Inject(MicrosoftOAuthStateStore)
    private readonly stateStore: MicrosoftOAuthStateStore,
    private readonly refreshLock: MicrosoftRefreshLockService,
    private readonly idToken: MicrosoftIdTokenService,
    private readonly tokenHttp: MicrosoftTokenHttpService,
    private readonly audit: AuditLogsService,
    private readonly platformConfig: MicrosoftPlatformConfigService,
  ) {}

  /**
   * Identifiants d’application Azure : priorité aux champs client (BYO),
   * repli sur MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET (env).
   */
  private async resolveAzureAppCredentials(stariumClientId: string): Promise<{
    azureClientId: string;
    azureClientSecret: string;
    authorityTenant: string;
    redirectUri: string;
  }> {
    const row = await this.prisma.client.findUnique({
      where: { id: stariumClientId },
      select: {
        microsoftOAuthClientId: true,
        microsoftOAuthClientSecretEncrypted: true,
        microsoftOAuthAuthorityTenant: true,
        microsoftOAuthRedirectUri: true,
      },
    });
    const envId = this.config.get<string>('MICROSOFT_CLIENT_ID')?.trim();
    const envSecret = this.config.get<string>('MICROSOFT_CLIENT_SECRET')?.trim();
    const envTenant =
      this.config.get<string>('MICROSOFT_TENANT')?.trim() ||
      this.config.get<string>('MICROSOFT_AUTHORITY_TENANT')?.trim() ||
      'common';

    const azureClientId = row?.microsoftOAuthClientId?.trim() || envId;
    let azureClientSecret: string | undefined;
    if (row?.microsoftOAuthClientSecretEncrypted) {
      try {
        azureClientSecret = this.crypto.decrypt(
          row.microsoftOAuthClientSecretEncrypted,
        );
      } catch {
        azureClientSecret = undefined;
      }
    }
    if (!azureClientSecret) {
      azureClientSecret = envSecret;
    }
    const authorityTenant =
      row?.microsoftOAuthAuthorityTenant?.trim() || envTenant;
    const redirectUri = row?.microsoftOAuthRedirectUri?.trim() || '';

    if (!azureClientId || !azureClientSecret || !redirectUri) {
      throw new BadRequestException(
        "Configuration Microsoft client incomplète : renseigner l'ID, le secret et l'URI de redirection OAuth dans l'administration client.",
      );
    }
    return { azureClientId, azureClientSecret, authorityTenant, redirectUri };
  }

  /**
   * GET auth/url — URL de consentement Microsoft + state JWT + jti en store.
   */
  async getAuthorizationUrl(
    userId: string,
    stariumClientId: string,
  ): Promise<{ authorizationUrl: string }> {
    const platform = await this.platformConfig.getResolved();
    const creds = await this.resolveAzureAppCredentials(stariumClientId);

    const jti = randomUUID();
    const ttlMs = platform.oauthStateTtlSeconds * 1000;
    const payload: MicrosoftOAuthStatePayload = {
      sub: userId,
      cid: stariumClientId,
      jti,
      purpose: MICROSOFT_OAUTH_STATE_PURPOSE,
    };
    const state = this.jwt.sign(payload, {
      expiresIn: Math.ceil(ttlMs / 1000),
    });
    this.stateStore.register(jti, ttlMs);

    const authority = `https://login.microsoftonline.com/${creds.authorityTenant}`;
    const params = new URLSearchParams({
      client_id: creds.azureClientId,
      response_type: 'code',
      redirect_uri: creds.redirectUri,
      response_mode: 'query',
      scope: platform.graphScopes,
      state,
    });
    const authorizationUrl = `${authority}/oauth2/v2.0/authorize?${params.toString()}`;
    return { authorizationUrl };
  }

  /**
   * Callback OAuth — redirect URL finale (succès ou erreur).
   */
  async handleOAuthCallback(query: Record<string, string | undefined>): Promise<{
    redirectUrl: string;
  }> {
    const err = query.error;
    const errDesc = query.error_description;
    if (err) {
      this.logger.warn(`OAuth callback erreur Microsoft: ${err}`);
      return {
        redirectUrl: await this.buildErrorRedirect('oauth_upstream', err, errDesc),
      };
    }

    const code = query.code;
    const state = query.state;
    if (!code || !state) {
      return {
        redirectUrl: await this.buildErrorRedirect('missing_code_or_state'),
      };
    }

    let payload: MicrosoftOAuthStatePayload;
    try {
      payload = this.jwt.verify(state) as MicrosoftOAuthStatePayload;
    } catch {
      return { redirectUrl: await this.buildErrorRedirect('invalid_state') };
    }

    if (
      payload.purpose !== MICROSOFT_OAUTH_STATE_PURPOSE ||
      !payload.sub ||
      !payload.cid ||
      !payload.jti
    ) {
      return { redirectUrl: await this.buildErrorRedirect('invalid_state_payload') };
    }

    if (!this.stateStore.consume(payload.jti)) {
      return { redirectUrl: await this.buildErrorRedirect('state_replay') };
    }

    const userId = payload.sub;
    const clientId = payload.cid;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      return { redirectUrl: await this.buildErrorRedirect('invalid_client') };
    }

    const membership = await this.prisma.clientUser.findFirst({
      where: {
        userId,
        clientId,
        status: ClientUserStatus.ACTIVE,
      },
    });
    if (!membership) {
      return { redirectUrl: await this.buildErrorRedirect('forbidden_client') };
    }

    let creds: {
      azureClientId: string;
      azureClientSecret: string;
      authorityTenant: string;
      redirectUri: string;
    };
    let platform: ResolvedPlatformMicrosoftConfig;
    try {
      creds = await this.resolveAzureAppCredentials(clientId);
      platform = await this.platformConfig.getResolved();
    } catch (e: unknown) {
      this.logger.warn(`Credentials Microsoft: ${(e as Error).message}`);
      return { redirectUrl: await this.buildErrorRedirect('missing_credentials') };
    }

    const body = new URLSearchParams({
      client_id: creds.azureClientId,
      client_secret: creds.azureClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: creds.redirectUri,
    });

    let tokens: Awaited<ReturnType<MicrosoftTokenHttpService['postTokenForm']>>;
    try {
      tokens = await this.tokenHttp.postTokenForm(body, {
        authorityTenant: creds.authorityTenant,
        timeoutMs: platform.tokenHttpTimeoutMs,
      });
    } catch (e: unknown) {
      await this.auditError(clientId, userId, undefined, e);
      return { redirectUrl: await this.buildErrorRedirect('token_exchange_failed') };
    }

    let tenantId: string;
    if (tokens.id_token) {
      try {
        const validated = await this.idToken.verifyIdToken(
          tokens.id_token,
          creds.azureClientId,
        );
        tenantId = validated.tid;
      } catch (err) {
        this.logger.warn(`id_token invalide: ${(err as Error).message}`);
        await this.auditError(clientId, userId, undefined, err);
        return { redirectUrl: await this.buildErrorRedirect('invalid_id_token') };
      }
    } else {
      this.logger.warn('Réponse token sans id_token');
      return { redirectUrl: await this.buildErrorRedirect('missing_id_token') };
    }

    const accessEnc = this.crypto.encrypt(tokens.access_token);
    const refreshEnc = tokens.refresh_token
      ? this.crypto.encrypt(tokens.refresh_token)
      : null;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    let revokedCount = 0;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const prev = await tx.microsoftConnection.updateMany({
          where: {
            clientId,
            status: MicrosoftConnectionStatus.ACTIVE,
          },
          data: {
            status: MicrosoftConnectionStatus.REVOKED,
            accessTokenEncrypted: null,
            refreshTokenEncrypted: null,
          },
        });
        revokedCount = prev.count;

        const row = await tx.microsoftConnection.upsert({
          where: {
            clientId_tenantId: { clientId, tenantId },
          },
          create: {
            clientId,
            tenantId,
            status: MicrosoftConnectionStatus.ACTIVE,
            authMode: MicrosoftAuthMode.DELEGATED,
            accessTokenEncrypted: accessEnc,
            refreshTokenEncrypted: refreshEnc,
            tokenExpiresAt: expiresAt,
            connectedByUserId: userId,
          },
          update: {
            status: MicrosoftConnectionStatus.ACTIVE,
            accessTokenEncrypted: accessEnc,
            refreshTokenEncrypted: refreshEnc,
            tokenExpiresAt: expiresAt,
            connectedByUserId: userId,
          },
        });
        return row;
      });
      await this.audit.create({
        clientId,
        userId,
        action: 'microsoft_connection.connected',
        resourceType: 'microsoft_connection',
        resourceId: result.id,
        newValue: {
          tenantId,
          revokedOtherCount: revokedCount,
        },
      });
      if (revokedCount > 0) {
        await this.audit.create({
          clientId,
          userId,
          action: 'microsoft_connection.revoked',
          resourceType: 'microsoft_connection',
          newValue: { bulk: true, count: revokedCount, reason: 'replaced_by_new_connect' },
        });
      }
    } catch (e: unknown) {
      this.logger.error(`Persistance connexion Microsoft: ${(e as Error).message}`);
      await this.auditError(clientId, userId, tenantId, e);
      return { redirectUrl: await this.buildErrorRedirect('persist_failed') };
    }

    return { redirectUrl: await this.buildSuccessRedirect() };
  }

  async getActiveConnection(
    clientId: string,
  ): Promise<MicrosoftConnectionPublic | null> {
    const row = await this.prisma.microsoftConnection.findFirst({
      where: {
        clientId,
        status: MicrosoftConnectionStatus.ACTIVE,
      },
      select: {
        id: true,
        tenantId: true,
        tenantName: true,
        status: true,
        tokenExpiresAt: true,
        connectedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return row;
  }

  async revokeConnection(clientId: string, userId: string): Promise<void> {
    const rows = await this.prisma.microsoftConnection.findMany({
      where: {
        clientId,
        status: MicrosoftConnectionStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (rows.length === 0) {
      return;
    }
    const randomPad = randomUUID() + randomUUID();
    for (const r of rows) {
      await this.prisma.$transaction([
        this.prisma.microsoftConnection.update({
          where: { id: r.id },
          data: {
            accessTokenEncrypted: this.crypto.encrypt(randomPad),
            refreshTokenEncrypted: this.crypto.encrypt(randomPad),
          },
        }),
        this.prisma.microsoftConnection.update({
          where: { id: r.id },
          data: {
            status: MicrosoftConnectionStatus.REVOKED,
            accessTokenEncrypted: null,
            refreshTokenEncrypted: null,
            tokenExpiresAt: null,
          },
        }),
      ]);
      await this.audit.create({
        clientId,
        userId,
        action: 'microsoft_connection.revoked',
        resourceType: 'microsoft_connection',
        resourceId: r.id,
        newValue: { reason: 'user_revoked' },
      });
    }
  }

  /**
   * Jeton d'accès valide pour Graph ; refresh mutex + seuil de leeway.
   */
  async ensureFreshAccessToken(
    connectionId: string,
    clientId: string,
  ): Promise<string> {
    const conn = await this.prisma.microsoftConnection.findFirst({
      where: { id: connectionId, clientId },
    });
    if (!conn) {
      throw new NotFoundException('Connexion Microsoft introuvable');
    }
    if (conn.status !== MicrosoftConnectionStatus.ACTIVE) {
      throw new ForbiddenException('Connexion Microsoft inactive');
    }
    if (!conn.accessTokenEncrypted || !conn.refreshTokenEncrypted) {
      throw new BadRequestException('Jetons manquants');
    }

    const platformCfg = await this.platformConfig.getResolved();
    const leewayMs = platformCfg.refreshLeewaySeconds * 1000;
    const expires = conn.tokenExpiresAt?.getTime() ?? 0;
    const mustRefresh = !conn.tokenExpiresAt || expires - Date.now() < leewayMs;

    if (!mustRefresh) {
      return this.crypto.decrypt(conn.accessTokenEncrypted);
    }

    return this.refreshLock.runExclusive(connectionId, async () => {
      const fresh = await this.prisma.microsoftConnection.findFirst({
        where: { id: connectionId, clientId },
      });
      if (!fresh?.accessTokenEncrypted || !fresh.refreshTokenEncrypted) {
        throw new BadRequestException('Jetons manquants');
      }
      const exp2 = fresh.tokenExpiresAt?.getTime() ?? 0;
      if (fresh.tokenExpiresAt && exp2 - Date.now() >= leewayMs) {
        return this.crypto.decrypt(fresh.accessTokenEncrypted);
      }

      const creds = await this.resolveAzureAppCredentials(clientId);

      const refreshPlain = this.crypto.decrypt(fresh.refreshTokenEncrypted);
      const body = new URLSearchParams({
        client_id: creds.azureClientId,
        client_secret: creds.azureClientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshPlain,
      });

      let tokens: Awaited<ReturnType<MicrosoftTokenHttpService['postTokenForm']>>;
      try {
        tokens = await this.tokenHttp.postTokenForm(body, {
          authorityTenant: creds.authorityTenant,
          timeoutMs: platformCfg.tokenHttpTimeoutMs,
        });
      } catch (e: unknown) {
        await this.handleRefreshFailure(
          fresh.id,
          clientId,
          fresh.connectedByUserId,
          e,
        );
        throw e;
      }

      const accessEnc = this.crypto.encrypt(tokens.access_token);
      const refreshEnc = tokens.refresh_token
        ? this.crypto.encrypt(tokens.refresh_token)
        : fresh.refreshTokenEncrypted;
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await this.prisma.microsoftConnection.update({
        where: { id: connectionId },
        data: {
          accessTokenEncrypted: accessEnc,
          refreshTokenEncrypted: refreshEnc,
          tokenExpiresAt: expiresAt,
        },
      });

      await this.audit.create({
        clientId,
        userId: fresh.connectedByUserId ?? undefined,
        action: 'microsoft_connection.refreshed',
        resourceType: 'microsoft_connection',
        resourceId: connectionId,
        newValue: { tenantId: fresh.tenantId },
      });

      return tokens.access_token;
    });
  }

  private async handleRefreshFailure(
    connectionId: string,
    clientId: string,
    userId: string | null,
    err: unknown,
  ): Promise<void> {
    const oauth = (err as { oauthError?: string }).oauthError;
    let status: MicrosoftConnectionStatus = MicrosoftConnectionStatus.ERROR;
    if (oauth === 'invalid_grant') {
      status = MicrosoftConnectionStatus.EXPIRED;
    }
    await this.prisma.microsoftConnection.update({
      where: { id: connectionId },
      data: { status },
    });
    await this.auditError(clientId, userId ?? undefined, undefined, err, oauth);
  }

  private async auditError(
    clientId: string,
    userId: string | undefined,
    tenantId: string | undefined,
    err: unknown,
    oauthCode?: string,
  ): Promise<void> {
    const code =
      oauthCode ??
      (err as { oauthError?: string }).oauthError ??
      (err as Error)?.message ??
      'unknown';
    await this.audit.create({
      clientId,
      userId,
      action: 'microsoft_connection.error',
      resourceType: 'microsoft_connection',
      newValue: {
        tenantId,
        code,
        interactionRequired: code === 'interaction_required',
      },
    });
  }

  /** Redirect utilisé quand le rate limit callback est déclenché (hors flux Microsoft). */
  async redirectUrlForRateLimit(): Promise<string> {
    return this.buildErrorRedirect('rate_limited');
  }

  private async buildSuccessRedirect(): Promise<string> {
    const p = await this.platformConfig.getResolved();
    const base =
      p.oauthSuccessUrl?.trim() ||
      this.config.get<string>('MICROSOFT_OAUTH_SUCCESS_URL')?.trim() ||
      '/';
    if (base.startsWith('http')) {
      const real = new URL(base);
      real.searchParams.set('microsoft', 'connected');
      return real.toString();
    }
    return `${base}${base.includes('?') ? '&' : '?'}microsoft=connected`;
  }

  private async buildErrorRedirect(
    code: string,
    microsoftError?: string,
    microsoftDesc?: string,
  ): Promise<string> {
    const p = await this.platformConfig.getResolved();
    const base =
      p.oauthErrorUrl?.trim() ||
      this.config.get<string>('MICROSOFT_OAUTH_ERROR_URL')?.trim() ||
      '/';
    let url: URL;
    if (base.startsWith('http')) {
      url = new URL(base);
    } else {
      url = new URL(base, 'http://localhost');
    }
    url.searchParams.set('microsoft', 'error');
    url.searchParams.set('code', code);
    if (microsoftError) {
      url.searchParams.set('microsoft_error', microsoftError);
    }
    if (microsoftDesc) {
      url.searchParams.set(
        'microsoft_error_description',
        microsoftDesc.slice(0, 200),
      );
    }
    if (base.startsWith('http')) {
      return url.toString();
    }
    return `${url.pathname}${url.search}`;
  }
}
