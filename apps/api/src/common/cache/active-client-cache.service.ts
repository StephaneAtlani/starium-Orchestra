import { Injectable } from '@nestjs/common';
import { ActiveClientContext } from '../types/request-with-client';

interface CacheEntry {
  context: ActiveClientContext;
  expiresAt: number;
}

@Injectable()
export class ActiveClientCacheService {
  private readonly ttlMs = 60_000;
  private readonly store = new Map<string, CacheEntry>();

  private buildKey(userId: string, clientId: string): string {
    return `${userId}::${clientId}`;
  }

  async get(
    userId: string,
    clientId: string,
  ): Promise<ActiveClientContext | null> {
    const key = this.buildKey(userId, clientId);
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.context;
  }

  async set(
    userId: string,
    clientId: string,
    context: ActiveClientContext,
  ): Promise<void> {
    const key = this.buildKey(userId, clientId);
    this.store.set(key, {
      context,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  async invalidate(userId: string, clientId: string): Promise<void> {
    const key = this.buildKey(userId, clientId);
    this.store.delete(key);
  }
}

