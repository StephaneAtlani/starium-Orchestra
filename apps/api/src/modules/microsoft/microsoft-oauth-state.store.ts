import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Store one-shot des `jti` OAuth (anti-replay).
 * Implémentation mémoire — en multi-instance utiliser Redis (futur).
 */
export abstract class MicrosoftOAuthStateStore {
  abstract register(params: {
    stateToken: string;
    userId: string;
    clientId: string;
    redirectUri: string;
    ttlMs: number;
  }): Promise<void>;
  abstract consume(stateToken: string): Promise<boolean>;
}

@Injectable()
export class MemoryMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  private readonly entries = new Map<string, number>();

  override async register(params: {
    stateToken: string;
    userId: string;
    clientId: string;
    redirectUri: string;
    ttlMs: number;
  }): Promise<void> {
    const { stateToken, ttlMs } = params;
    const expiresAt = Date.now() + ttlMs;
    this.entries.set(hashStateToken(stateToken), expiresAt);
    this.pruneExpired();
  }

  override async consume(stateToken: string): Promise<boolean> {
    const key = hashStateToken(stateToken);
    const expiresAt = this.entries.get(key);
    if (expiresAt === undefined) {
      return false;
    }
    this.entries.delete(key);
    if (Date.now() > expiresAt) {
      return false;
    }
    return true;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [k, exp] of this.entries) {
      if (now > exp) {
        this.entries.delete(k);
      }
    }
  }
}

@Injectable()
export class PrismaMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async register(params: {
    stateToken: string;
    userId: string;
    clientId: string;
    redirectUri: string;
    ttlMs: number;
  }): Promise<void> {
    const { stateToken, userId, clientId, redirectUri, ttlMs } = params;
    const stateTokenHash = hashStateToken(stateToken);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.microsoftOAuthState.create({
      data: {
        stateTokenHash,
        userId,
        clientId,
        redirectUri,
        expiresAt,
      },
    });
  }

  override async consume(stateToken: string): Promise<boolean> {
    const stateTokenHash = hashStateToken(stateToken);
    const now = new Date();
    const result = await this.prisma.microsoftOAuthState.updateMany({
      where: {
        stateTokenHash,
        consumedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        consumedAt: now,
      },
    });

    return result.count > 0;
  }
}

function hashStateToken(stateToken: string): string {
  return createHash('sha256').update(stateToken).digest('hex');
}
