import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { TRUSTED_DEVICE_TTL_MS } from './trusted-device.constants';

function hashTrustedDeviceToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class TrustedDeviceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie le jeton pour cet utilisateur, met à jour lastUsedAt si valide.
   */
  async validateAndTouch(userId: string, token: string): Promise<boolean> {
    const tokenHash = hashTrustedDeviceToken(token);
    const row = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) {
      return false;
    }
    await this.prisma.trustedDevice.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  /** Crée un appareil de confiance ; retourne le jeton en clair (une seule fois). */
  async create(userId: string, meta: RequestMeta): Promise<{ token: string }> {
    await this.prisma.trustedDevice.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTrustedDeviceToken(token);
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_MS);
    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });
    return { token };
  }

  /** Révoque le jeton (ex. à la déconnexion). */
  async revokeByToken(userId: string, token: string): Promise<void> {
    const tokenHash = hashTrustedDeviceToken(token);
    await this.prisma.trustedDevice.deleteMany({
      where: { userId, tokenHash },
    });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.trustedDevice.deleteMany({ where: { userId } });
  }
}
