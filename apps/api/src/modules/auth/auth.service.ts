import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } from './auth.constants';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { MfaService } from '../mfa/mfa.service';
import { TrustedDeviceService } from './trusted-device.service';

const INVALID_CREDENTIALS = 'Identifiants invalides';
const PASSWORD_LOGIN_DISABLED =
  'Connexion par mot de passe désactivée pour ce compte. Utilisez « Continuer avec Microsoft ».';

export type LoginResponse =
  | {
      status: 'AUTHENTICATED';
      accessToken: string;
      refreshToken: string;
    }
  | {
      status: 'MFA_REQUIRED';
      challengeId: string;
      expiresAt: string;
    };

export type AuthTokensResponse = {
  status: 'AUTHENTICATED';
  accessToken: string;
  refreshToken: string;
  /** Présent si l’utilisateur a demandé à faire confiance à cet appareil (30 j). */
  trustedDeviceToken?: string;
};

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Service d’authentification : login (bcrypt + JWT), refresh, logout.
 * Durées d’expiration injectées via JWT_ACCESS_EXPIRATION et JWT_REFRESH_EXPIRATION.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly securityLogs: SecurityLogsService,
    private readonly mfa: MfaService,
    private readonly trustedDevice: TrustedDeviceService,
    @Inject(JWT_ACCESS_EXPIRATION) private readonly accessExpiration: number,
    @Inject(JWT_REFRESH_EXPIRATION) private readonly refreshExpiration: number,
  ) {}

  /** Vérifie email/password (bcrypt), émet accessToken (JWT) + refreshToken (stocké hashé). */
  async login(
    email: string,
    password: string,
    meta: RequestMeta,
    trustedDeviceToken?: string | null,
  ): Promise<LoginResponse> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        await this.securityLogs.create({
          event: 'auth.login.failure',
          email,
          success: false,
          reason: 'invalid_credentials',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        });
        throw new UnauthorizedException(INVALID_CREDENTIALS);
      }
      if (!user.passwordLoginEnabled) {
        await this.securityLogs.create({
          event: 'auth.login.failure',
          userId: user.id,
          email: user.email,
          success: false,
          reason: 'password_login_disabled',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        });
        throw new UnauthorizedException(PASSWORD_LOGIN_DISABLED);
      }
      let valid = false;
      try {
        valid = await bcrypt.compare(password, user.passwordHash);
      } catch (bcryptError) {
        this.logger.warn(
          `bcrypt.compare failed for user ${user.id}: ${(bcryptError as Error)?.message}`,
        );
        throw new UnauthorizedException(INVALID_CREDENTIALS);
      }
      if (!valid) {
        await this.securityLogs.create({
          event: 'auth.login.failure',
          userId: user.id,
          email: user.email,
          success: false,
          reason: 'invalid_credentials',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        });
        throw new UnauthorizedException(INVALID_CREDENTIALS);
      }

      const needsMfa = await this.mfa.isMfaTotpEnabled(user.id);
      if (needsMfa) {
        if (
          trustedDeviceToken &&
          (await this.trustedDevice.validateAndTouch(user.id, trustedDeviceToken))
        ) {
          const tokens = await this.issueTokenPair(user.id);
          await this.securityLogs.create({
            event: 'auth.login.trusted_device',
            userId: user.id,
            email: user.email,
            success: true,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            requestId: meta.requestId,
          });
          await this.securityLogs.create({
            event: 'auth.login.success',
            userId: user.id,
            email: user.email,
            success: true,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            requestId: meta.requestId,
          });
          return { status: 'AUTHENTICATED', ...tokens };
        }

        const { challengeId, expiresAt } =
          await this.mfa.createLoginChallenge(user.id);
        await this.securityLogs.create({
          event: 'auth.login.mfa_required',
          userId: user.id,
          email: user.email,
          success: true,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        });
        return {
          status: 'MFA_REQUIRED',
          challengeId,
          expiresAt: expiresAt.toISOString(),
        };
      }

      const tokens = await this.issueTokenPair(user.id);

      await this.securityLogs.create({
        event: 'auth.login.success',
        userId: user.id,
        email: user.email,
        success: true,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });

      return { status: 'AUTHENTICATED', ...tokens };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      const msg = (err as Error)?.message ?? String(err);
      this.logger.error(`Login failed for "${email}": ${msg}`, (err as Error)?.stack);
      const hint =
        msg.includes('does not exist') || msg.includes('Unknown argument') || msg.includes('P2021')
          ? 'Base de données non migrée. Exécutez: pnpm prisma migrate deploy (ou prisma migrate dev), puis pnpm prisma db seed.'
          : 'Erreur serveur lors de la connexion. Consultez les logs de l’API.';
      throw new InternalServerErrorException(hint);
    }
  }

  /** Valide le refresh token, le révoque et émet un nouveau couple de tokens. */
  async refresh(
    refreshToken: string,
    meta: RequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      if (record) {
        // idempotent: évite P2025 si le token a déjà été supprimé (refresh concurrent, retry, etc.)
        await this.prisma.refreshToken.deleteMany({ where: { id: record.id } });
      }
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
    // idempotent: évite P2025 si le token est supprimé entre findFirst et delete
    await this.prisma.refreshToken.deleteMany({ where: { id: record.id } });
    const tokens = await this.issueTokenPair(record.userId);

    await this.securityLogs.create({
      event: 'auth.refresh',
      userId: record.userId,
      email: record.user.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return tokens;
  }

  /** Après challenge TOTP (ou code de secours) sur flux login. */
  async verifyMfaTotpAfterLogin(
    challengeId: string,
    otp: string,
    meta: RequestMeta,
    trustDevice?: boolean,
  ): Promise<AuthTokensResponse> {
    const { userId } = await this.mfa.verifyLoginTotp(challengeId, otp, meta);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const tokens = await this.issueTokenPair(userId);
    let trustedDeviceToken: string | undefined;
    if (trustDevice) {
      const created = await this.trustedDevice.create(userId, meta);
      trustedDeviceToken = created.token;
      await this.securityLogs.create({
        event: 'auth.trusted_device.created',
        userId,
        email: user?.email,
        success: true,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
    await this.securityLogs.create({
      event: 'auth.login.success',
      userId,
      email: user?.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    return {
      status: 'AUTHENTICATED',
      ...tokens,
      ...(trustedDeviceToken ? { trustedDeviceToken } : {}),
    };
  }

  async sendMfaFallbackEmail(
    challengeId: string,
    meta: RequestMeta,
  ): Promise<void> {
    await this.mfa.sendLoginEmailOtp(challengeId, meta);
  }

  async verifyMfaEmailAfterLogin(
    challengeId: string,
    code: string,
    meta: RequestMeta,
    trustDevice?: boolean,
  ): Promise<AuthTokensResponse> {
    const { userId } = await this.mfa.verifyLoginEmailOtp(
      challengeId,
      code,
      meta,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const tokens = await this.issueTokenPair(userId);
    let trustedDeviceToken: string | undefined;
    if (trustDevice) {
      const created = await this.trustedDevice.create(userId, meta);
      trustedDeviceToken = created.token;
      await this.securityLogs.create({
        event: 'auth.trusted_device.created',
        userId,
        email: user?.email,
        success: true,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }
    await this.securityLogs.create({
      event: 'auth.login.success',
      userId,
      email: user?.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
    return {
      status: 'AUTHENTICATED',
      ...tokens,
      ...(trustedDeviceToken ? { trustedDeviceToken } : {}),
    };
  }

  /** Révoque le refresh token (suppression en base). */
  async logout(refreshToken: string, meta: RequestMeta): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);

    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });

    await this.securityLogs.create({
      event: 'auth.logout',
      userId: record?.userId,
      email: record?.user?.email,
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }

  /** Invalide toutes les sessions (refresh tokens) d’un utilisateur. */
  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private async issueTokenPair(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    });
    const platformRole: string | null = (user?.platformRole as string | null) ?? null;

    const accessToken = this.jwt.sign(
      { sub: userId, platformRole },
      { expiresIn: this.accessExpiration },
    );
    const refreshToken = randomBytes(64).toString('hex');
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshExpiration * 1000);
    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });
    return { accessToken, refreshToken };
  }
}
