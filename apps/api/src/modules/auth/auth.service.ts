import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } from './auth.constants';

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
    @Inject(JWT_ACCESS_EXPIRATION) private readonly accessExpiration: number,
    @Inject(JWT_REFRESH_EXPIRATION) private readonly refreshExpiration: number,
  ) {}

  /** Vérifie email/password (bcrypt), émet accessToken (JWT) + refreshToken (stocké hashé). */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.issueTokenPair(user.id);
  }

  /** Valide le refresh token, le révoque et émet un nouveau couple de tokens. */
  async refresh(
    refreshToken: string,
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
    return this.issueTokenPair(record.userId);
  }

  /** Révoque le refresh token (suppression en base). */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
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
