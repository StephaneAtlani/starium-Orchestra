import { Injectable } from '@nestjs/common';

/**
 * Mutex in-memory par connectionId : une seule opération refresh à la fois ;
 * les appels concurrents partagent la même promesse.
 */
@Injectable()
export class MicrosoftRefreshLockService {
  private readonly inflight = new Map<string, Promise<string>>();

  /**
   * Exécute `fn` en exclusion mutuelle pour `connectionId`.
   * Tous les appels concurrents attendent la même promesse de jeton d'accès.
   */
  async runExclusive(
    connectionId: string,
    fn: () => Promise<string>,
  ): Promise<string> {
    const existing = this.inflight.get(connectionId);
    if (existing) {
      return existing;
    }
    const p = fn().finally(() => {
      this.inflight.delete(connectionId);
    });
    this.inflight.set(connectionId, p);
    return p;
  }
}
