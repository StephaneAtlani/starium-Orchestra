import { Injectable } from '@nestjs/common';

/**
 * Store one-shot des `jti` OAuth (anti-replay).
 * Implémentation mémoire — en multi-instance utiliser Redis (futur).
 */
export abstract class MicrosoftOAuthStateStore {
  abstract register(jti: string, ttlMs: number): void;
  abstract consume(jti: string): boolean;
}

@Injectable()
export class MemoryMicrosoftOAuthStateStore extends MicrosoftOAuthStateStore {
  private readonly entries = new Map<string, number>();

  override register(jti: string, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.entries.set(jti, expiresAt);
    this.pruneExpired();
  }

  override consume(jti: string): boolean {
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
