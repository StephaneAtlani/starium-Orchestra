import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type IORedis from 'ioredis';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Store one-shot des `jti` OAuth M365 (anti-replay).
 * `db` (défaut) : table `MicrosoftOAuthState` partagée par toutes les instances API ;
 * `redis` : alternative low-latency (BullMQ existant) ;
 * `memory` : tests / process unique.
 */
export abstract class MicrosoftOAuthStateStore {
  abstract register(jti: string, ttlMs: number): Promise<void>;
  abstract consume(jti: string): Promise<boolean>;
}

@Injectable()
export class MemoryMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  private readonly entries = new Map<string, number>();

  override async register(jti: string, ttlMs: number): Promise<void> {
    const expiresAt = Date.now() + ttlMs;
    this.entries.set(jti, expiresAt);
    this.pruneExpired();
  }

  override async consume(jti: string): Promise<boolean> {
    const expiresAt = this.entries.get(jti);
    if (expiresAt === undefined) {
      return false;
    }
    this.entries.delete(jti);
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

/** Préfixe isolé ; TTL = PX sur la clé (pas besoin d’expiry séparé au consume). */
const REDIS_JTI_PREFIX = 'starium:m365-oauth:jti:';

const REDIS_CONSUME_LUA = `
local v = redis.call('GET', KEYS[1])
if not v then return 0 end
redis.call('DEL', KEYS[1])
return 1
`;

/**
 * Préfixe sur le `stateTokenHash` partagé avec le SSO pour éviter toute collision théorique
 * entre un `jti` M365 et un state aléatoire du SSO.
 */
const DB_HASH_PREFIX = 'm365sync:';

function dbHash(jti: string): string {
  return DB_HASH_PREFIX + createHash('sha256').update(jti).digest('hex');
}

@Injectable()
export class DbMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  private readonly logger = new Logger(DbMicrosoftOAuthStateStore.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async register(jti: string, ttlMs: number): Promise<void> {
    try {
      await this.prisma.microsoftOAuthState.create({
        data: {
          stateTokenHash: dbHash(jti),
          expiresAt: new Date(Date.now() + ttlMs),
        },
      });
    } catch (e) {
      this.logger.error(
        `register jti DB: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }
  }

  override async consume(jti: string): Promise<boolean> {
    const now = new Date();
    try {
      const r = await this.prisma.microsoftOAuthState.updateMany({
        where: {
          stateTokenHash: dbHash(jti),
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      return r.count === 1;
    } catch (e) {
      this.logger.warn(
        `consume jti DB: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }
}

@Injectable()
export class RedisMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  private readonly logger = new Logger(RedisMicrosoftOAuthStateStore.name);

  constructor(private readonly redis: IORedis) {
    super();
  }

  override async register(jti: string, ttlMs: number): Promise<void> {
    const key = `${REDIS_JTI_PREFIX}${jti}`;
    try {
      await this.redis.set(key, '1', 'PX', ttlMs);
    } catch (e) {
      this.logger.error(
        `register jti Redis: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }
  }

  override async consume(jti: string): Promise<boolean> {
    const key = `${REDIS_JTI_PREFIX}${jti}`;
    try {
      const r = await this.redis.eval(REDIS_CONSUME_LUA, 1, key);
      return Number(r) === 1;
    } catch (e) {
      this.logger.warn(
        `consume jti Redis: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }
}
