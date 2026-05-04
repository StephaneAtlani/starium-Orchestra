import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type IORedis from 'ioredis';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * Store one-shot des `jti` OAuth M365 (anti-replay) **et** mémoire du résultat de callback
 * pour idempotence (retry proxy/CDN, prefetch navigateur). Les deux opérations sur la même clé.
 */
export abstract class MicrosoftOAuthStateStore {
  abstract register(jti: string, ttlMs: number): Promise<void>;
  abstract consume(jti: string): Promise<boolean>;
  /** Mémoriser le résultat final (URL de redirection navigateur) du 1ᵉʳ callback. */
  abstract rememberResult(jti: string, redirectUrl: string, ttlMs: number): Promise<void>;
  /** null si pas encore mémorisé ou expiré. */
  abstract getRememberedResult(jti: string): Promise<string | null>;
}

@Injectable()
export class MemoryMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  private readonly entries = new Map<string, number>();
  private readonly results = new Map<string, { url: string; expiresAt: number }>();

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

  override async rememberResult(jti: string, redirectUrl: string, ttlMs: number): Promise<void> {
    this.results.set(jti, { url: redirectUrl, expiresAt: Date.now() + ttlMs });
    this.pruneExpiredResults();
  }

  override async getRememberedResult(jti: string): Promise<string | null> {
    const entry = this.results.get(jti);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.results.delete(jti);
      return null;
    }
    return entry.url;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [k, exp] of this.entries) {
      if (now > exp) {
        this.entries.delete(k);
      }
    }
  }

  private pruneExpiredResults(): void {
    const now = Date.now();
    for (const [k, v] of this.results) {
      if (now > v.expiresAt) {
        this.results.delete(k);
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

  override async rememberResult(jti: string, redirectUrl: string, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    try {
      /** On met à jour la même ligne (déjà créée par `register`) ; ne crée rien si la ligne a été purgée. */
      await this.prisma.microsoftOAuthState.updateMany({
        where: { stateTokenHash: dbHash(jti) },
        data: { redirectResultUrl: redirectUrl, expiresAt },
      });
    } catch (e) {
      this.logger.warn(
        `rememberResult jti DB: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  override async getRememberedResult(jti: string): Promise<string | null> {
    try {
      const row = await this.prisma.microsoftOAuthState.findFirst({
        where: {
          stateTokenHash: dbHash(jti),
          expiresAt: { gt: new Date() },
          NOT: { redirectResultUrl: null },
        },
        select: { redirectResultUrl: true },
      });
      return row?.redirectResultUrl ?? null;
    } catch (e) {
      this.logger.warn(
        `getRememberedResult jti DB: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
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

  override async rememberResult(jti: string, redirectUrl: string, ttlMs: number): Promise<void> {
    const key = `${REDIS_JTI_PREFIX}result:${jti}`;
    try {
      await this.redis.set(key, redirectUrl, 'PX', ttlMs);
    } catch (e) {
      this.logger.warn(
        `rememberResult jti Redis: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  override async getRememberedResult(jti: string): Promise<string | null> {
    const key = `${REDIS_JTI_PREFIX}result:${jti}`;
    try {
      return (await this.redis.get(key)) ?? null;
    } catch (e) {
      this.logger.warn(
        `getRememberedResult jti Redis: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }
}
