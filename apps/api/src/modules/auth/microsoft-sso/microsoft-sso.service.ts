import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as jose from 'jose';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftIdTokenService } from '../../microsoft/microsoft-id-token.service';
import { MicrosoftTokenHttpService } from '../../microsoft/microsoft-token-http.service';
import { MicrosoftPlatformConfigService } from '../../microsoft/microsoft-platform-config.service';
import { SecurityLogsService } from '../../security-logs/security-logs.service';
import { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { MicrosoftCallbackQueryDto } from './dto/microsoft-callback-query.dto';

/** OIDC uniquement — pas les scopes Graph plateforme (connexion M365 déléguée). User.Read seulement si tu ajoutes MICROSOFT_SSO_SCOPES (fallback Graph /me). */
const DEFAULT_SSO_SCOPES = 'openid profile email';
const DEFAULT_STATE_TTL_SECONDS = 600;
const DEFAULT_OAUTH_TENANT = 'common';

interface ResolvedSsoCredentials {
  clientId: string;
  clientSecret: string;
  authorityTenant: string;
}

@Injectable()
export class MicrosoftSsoService {
  private readonly logger = new Logger(MicrosoftSsoService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly microsoftIdToken: MicrosoftIdTokenService,
    private readonly tokenHttp: MicrosoftTokenHttpService,
    private readonly platformConfig: MicrosoftPlatformConfigService,
    private readonly securityLogs: SecurityLogsService,
  ) {}

  async getAuthorizationUrl(): Promise<{ authorizationUrl: string }> {
    const credentials = await this.resolveSsoCredentials();
    const resolvedPlatformConfig = await this.platformConfig.getResolved();
    const redirectUri = this.resolveRedirectUri(resolvedPlatformConfig.redirectUri);
    const state = randomBytes(32).toString('hex');
    const stateHash = this.hashToken(state);
    const ttl = Number(
      resolvedPlatformConfig.oauthStateTtlSeconds ||
        this.config.get<string>('MICROSOFT_OAUTH_STATE_TTL_SECONDS') ||
        DEFAULT_STATE_TTL_SECONDS,
    );
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await this.prisma.microsoftOAuthState.create({
      data: {
        stateTokenHash: stateHash,
        redirectUri,
        expiresAt,
      },
    });

    const scopes =
      this.config.get<string>('MICROSOFT_SSO_SCOPES')?.trim() ||
      DEFAULT_SSO_SCOPES;

    const authUrl = new URL(
      `https://login.microsoftonline.com/${credentials.authorityTenant}/oauth2/v2.0/authorize`,
    );
    authUrl.searchParams.set('client_id', credentials.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    // Sans `prompt`, Entra réutilise la session navigateur → pas d’écran compte / mot de passe.
    // select_account = choix de compte ; login = saisie identifiants à chaque fois ; none = SSO silencieux (échec si pas de session).
    const prompt =
      this.config.get<string>('MICROSOFT_SSO_PROMPT')?.trim() ?? 'select_account';
    authUrl.searchParams.set('prompt', prompt);

    return { authorizationUrl: authUrl.toString() };
  }

  async handleCallback(
    query: MicrosoftCallbackQueryDto,
    meta: RequestMeta,
  ): Promise<{ redirectUrl: string }> {
    if (query.error) {
      await this.securityLogs.create({
        event: 'auth.microsoft_sso.failure',
        success: false,
        reason: query.error,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      return { redirectUrl: this.errorRedirectUrl('microsoft_oauth_error') };
    }
    if (!query.code || !query.state) {
      return { redirectUrl: this.errorRedirectUrl('missing_code_or_state') };
    }

    const stateValid = await this.consumeState(query.state);
    if (!stateValid) {
      await this.securityLogs.create({
        event: 'auth.microsoft_sso.failure',
        success: false,
        reason: 'invalid_or_expired_state',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      return { redirectUrl: this.errorRedirectUrl('invalid_or_expired_state') };
    }

    try {
      const tokenData = await this.exchangeCode(query.code);
      const reliableEmail = await this.resolveReliableMicrosoftEmail(tokenData);
      if (!reliableEmail) {
        await this.securityLogs.create({
          event: 'auth.microsoft_sso.failure',
          success: false,
          reason: 'missing_or_unreliable_email',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        });
        return { redirectUrl: this.errorRedirectUrl('missing_or_unreliable_email') };
      }

      const match = await this.findSingleEligibleUserByEmail(reliableEmail);
      if (!match.ok) {
        await this.securityLogs.create({
          event: 'auth.microsoft_sso.failure',
          success: false,
          email: reliableEmail,
          reason: match.reason,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        });
        return { redirectUrl: this.errorRedirectUrl(match.reason) };
      }

      await this.prisma.user.update({
        where: { id: match.userId },
        data: { passwordLoginEnabled: false },
      });

      const tokens = await this.issueTokenPair(match.userId);
      await this.securityLogs.create({
        event: 'auth.microsoft_sso.success',
        userId: match.userId,
        email: reliableEmail,
        success: true,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      return { redirectUrl: this.successRedirectUrl(tokens) };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Microsoft SSO callback failed: ${err?.message ?? String(error)}`,
        err?.stack,
      );
      await this.securityLogs.create({
        event: 'auth.microsoft_sso.failure',
        success: false,
        reason: 'callback_processing_error',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
      return { redirectUrl: this.errorRedirectUrl('callback_processing_error') };
    }
  }

  private async exchangeCode(code: string): Promise<{
    idToken?: string;
    accessToken: string;
  }> {
    const credentials = await this.resolveSsoCredentials();
    const resolvedPlatformConfig = await this.platformConfig.getResolved();
    const redirectUri = this.resolveRedirectUri(resolvedPlatformConfig.redirectUri);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      redirect_uri: redirectUri,
    });
    const tokenData = await this.tokenHttp.postTokenForm(body, {
      authorityTenant: credentials.authorityTenant,
      timeoutMs: resolvedPlatformConfig.tokenHttpTimeoutMs,
    });
    return {
      idToken: tokenData.id_token,
      accessToken: tokenData.access_token,
    };
  }

  // Ordre strict imposé: id_token d'abord, fallback backend contrôlé ensuite.
  private async resolveReliableMicrosoftEmail(tokenData: {
    idToken?: string;
    accessToken: string;
  }): Promise<string | null> {
    const credentials = await this.resolveSsoCredentials();
    if (tokenData.idToken) {
      await this.microsoftIdToken.verifyIdToken(
        tokenData.idToken,
        credentials.clientId,
      );
      const decoded = jose.decodeJwt(tokenData.idToken) as Record<string, unknown>;
      const fromIdToken = this.extractEmailFromClaims(decoded);
      if (fromIdToken) {
        return fromIdToken;
      }
    }

    const fromBackend = await this.fetchMicrosoftEmailFallback(tokenData.accessToken);
    return fromBackend;
  }

  private async fetchMicrosoftEmailFallback(
    accessToken: string,
  ): Promise<string | null> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const email = this.extractEmailFromClaims(data);
    return email;
  }

  private extractEmailFromClaims(claims: Record<string, unknown>): string | null {
    const candidates = [
      claims.email,
      claims.preferred_username,
      claims.upn,
      claims.mail,
      claims.userPrincipalName,
    ];
    for (const value of candidates) {
      if (typeof value !== 'string') continue;
      const normalized = value.trim().toLowerCase();
      if (this.looksLikeEmail(normalized)) {
        return normalized;
      }
    }
    return null;
  }

  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private async findSingleEligibleUserByEmail(
    normalizedEmail: string,
  ): Promise<
    | { ok: true; userId: string }
    | {
        ok: false;
        reason:
          | 'email_unknown'
          | 'email_ambiguous'
          | 'email_not_verified'
          | 'user_without_valid_access';
      }
  > {
    const primaryUsers = await this.prisma.user.findMany({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        platformRole: true,
        clientUsers: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    });

    const verifiedIdentities = await (this.prisma as any).userEmailIdentity.findMany({
      where: {
        emailNormalized: normalizedEmail,
        isVerified: true,
        isActive: true,
      },
      select: {
        user: {
          select: {
            id: true,
            platformRole: true,
            clientUsers: {
              where: { status: 'ACTIVE' },
              select: { id: true },
            },
          },
        },
      },
    });

    const userMap = new Map<
      string,
      { id: string; platformRole: 'PLATFORM_ADMIN' | null; activeAccessCount: number }
    >();
    for (const user of primaryUsers) {
      userMap.set(user.id, {
        id: user.id,
        platformRole: user.platformRole as 'PLATFORM_ADMIN' | null,
        activeAccessCount: user.clientUsers.length,
      });
    }
    for (const identity of verifiedIdentities) {
      const user = identity.user;
      userMap.set(user.id, {
        id: user.id,
        platformRole: user.platformRole as 'PLATFORM_ADMIN' | null,
        activeAccessCount: user.clientUsers.length,
      });
    }

    if (userMap.size === 0) {
      const hasUnverified = await (this.prisma as any).userEmailIdentity.count({
        where: { emailNormalized: normalizedEmail, isVerified: false },
      });
      if (hasUnverified > 0) {
        return { ok: false, reason: 'email_not_verified' };
      }
      return { ok: false, reason: 'email_unknown' };
    }
    if (userMap.size > 1) {
      return { ok: false, reason: 'email_ambiguous' };
    }
    const user = [...userMap.values()][0];
    const hasValidAccess =
      user.platformRole === 'PLATFORM_ADMIN' || user.activeAccessCount > 0;
    if (!hasValidAccess) {
      return { ok: false, reason: 'user_without_valid_access' };
    }
    return { ok: true, userId: user.id };
  }

  private async consumeState(stateToken: string): Promise<boolean> {
    const stateHash = this.hashToken(stateToken);
    const now = new Date();
    const updated = await this.prisma.microsoftOAuthState.updateMany({
      where: {
        stateTokenHash: stateHash,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        consumedAt: now,
      },
    });
    return updated.count === 1;
  }

  private hashToken(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private resolveRedirectUri(platformRedirectUri?: string | null): string {
    const explicit = this.config.get<string>('MICROSOFT_SSO_REDIRECT_URI')?.trim();
    if (explicit) return explicit;
    if (platformRedirectUri?.trim()) {
      return platformRedirectUri
        .trim()
        .replace('/api/microsoft/auth/callback', '/api/auth/microsoft/callback');
    }
    const legacy = this.config.get<string>('MICROSOFT_REDIRECT_URI')?.trim();
    if (!legacy) {
      throw new ServiceUnavailableException(
        'Microsoft SSO non configuré: redirect URI manquant.',
      );
    }
    return legacy.replace('/api/microsoft/auth/callback', '/api/auth/microsoft/callback');
  }

  private successRedirectUrl(tokens: { accessToken: string; refreshToken: string }): string {
    const base =
      this.config.get<string>('MICROSOFT_SSO_SUCCESS_URL')?.trim() ||
      this.config.get<string>('MICROSOFT_OAUTH_SUCCESS_URL')?.trim() ||
      'http://localhost:3000/login?status=success';
    const fragment = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return `${base}#${fragment.toString()}`;
  }

  private errorRedirectUrl(reason: string): string {
    const base =
      this.config.get<string>('MICROSOFT_SSO_ERROR_URL')?.trim() ||
      this.config.get<string>('MICROSOFT_OAUTH_ERROR_URL')?.trim() ||
      'http://localhost:3000/login?status=error';
    const url = new URL(base);
    url.searchParams.set('status', 'error');
    url.searchParams.set('reason', reason);
    return url.toString();
  }

  private getRequired(key: string): string {
    const value = this.config.get<string>(key)?.trim();
    if (!value) {
      throw new ServiceUnavailableException(
        `Microsoft SSO non configuré: variable ${key} manquante.`,
      );
    }
    return value;
  }

  private async resolveSsoCredentials(): Promise<ResolvedSsoCredentials> {
    const envClientId = this.config.get<string>('MICROSOFT_CLIENT_ID')?.trim();
    const envClientSecret = this.config
      .get<string>('MICROSOFT_CLIENT_SECRET')
      ?.trim();
    const envTenant =
      this.config.get<string>('MICROSOFT_TENANT')?.trim() || DEFAULT_OAUTH_TENANT;

    if (envClientId && envClientSecret) {
      return {
        clientId: envClientId,
        clientSecret: envClientSecret,
        authorityTenant: envTenant,
      };
    }

    const fromPlatform = await this.platformConfig.getSsoCredentialsFromPlatformDb();
    if (fromPlatform) {
      return fromPlatform;
    }

    throw new ServiceUnavailableException(
      'Microsoft SSO non configuré: définissez MICROSOFT_CLIENT_ID et MICROSOFT_CLIENT_SECRET (environnement API), ou enregistrez l’application Entra dédiée au SSO dans Administration plateforme → Microsoft 365 — plateforme (ID + secret + tenant).',
    );
  }

  private async issueTokenPair(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    const accessExpiration = Number(
      this.config.get<string>('JWT_ACCESS_EXPIRATION') || 900,
    );
    const refreshExpiration = Number(
      this.config.get<string>('JWT_REFRESH_EXPIRATION') || 604800,
    );
    const accessToken = this.jwt.sign(
      { sub: userId, platformRole: user.platformRole ?? null },
      { expiresIn: accessExpiration },
    );
    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + refreshExpiration * 1000);
    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });
    return { accessToken, refreshToken };
  }
}
