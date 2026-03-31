import { Injectable } from '@nestjs/common';

/**
 * Rate limiting léger en mémoire par IP (callback OAuth public).
 * Limite : 60 requêtes / minute / IP (best-effort ; par instance en multi-pod).
 */
@Injectable()
export class MicrosoftCallbackRateLimitService {
  private readonly buckets = new Map<
    string,
    { count: number; windowEnd: number }
  >();
  private readonly windowMs = 60_000;
  private readonly maxPerWindow = 60;

  tryConsume(ip: string): boolean {
    const now = Date.now();
    let b = this.buckets.get(ip);
    if (!b || now > b.windowEnd) {
      b = { count: 0, windowEnd: now + this.windowMs };
      this.buckets.set(ip, b);
    }
    if (b.count >= this.maxPerWindow) {
      return false;
    }
    b.count += 1;
    return true;
  }
}
