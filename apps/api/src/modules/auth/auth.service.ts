import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } from './auth.constants';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { SecurityLogsService } from '../security-logs/security-logs.service';

const INVALID_CREDENTIALS = 'Identifiants invalides';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Service d’authentification : login (bcrypt + JWT), refresh, logout.
 * Durées d’expiration injectées via JWT_ACCESS_EXPIRATION et JWT_REFRESH_EXPIRATION.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly securityLogs: SecurityLogsService,
    @Inject(JWT_ACCESS_EXPIRATION) private readonly accessExpiration: number,
    @Inject(JWT_REFRESH_EXPIRATION) private readonly refreshExpiration: number,
  ) {}

  /** Vérifie email/password (bcrypt), émet accessToken (JWT) + refreshToken (stocké hashé). */
  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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
    const valid = await bcrypt.compare(password, user.passwordHash);
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

    return tokens;
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
        await this.prisma.refreshToken.delete({ where: { id: record.id } });
      }
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
    await this.prisma.refreshToken.delete({ where: { id: record.id } });
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
