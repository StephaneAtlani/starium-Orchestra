import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import type { FlagKey } from './flag-keys';

/**
 * Strict parsing : seuls `"true"` (insensible casse) et `"1"` activent ; toute autre valeur ou
 * absence ⇒ désactivé. Cohérent avec `parseAccessDiagnosticsEnrichedFlag`.
 */
export function parseStrictBooleanEnv(value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * RFC-ACL-022 — service **singleton** de résolution des feature flags.
 *
 * Ordre de résolution :
 *   1. cache requête (si `request.featureFlagsCache` fourni)
 *   2. ligne DB `ClientFeatureFlag` ({clientId, flagKey})
 *   3. variable d'environnement `process.env[flagKey]` (parsing strict `true` / `1`)
 *   4. défaut `false`
 *
 * Aucun cache global au niveau du service : le seul cache vit sur la requête HTTP courante.
 */
@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(
    clientId: string,
    flagKey: FlagKey,
    request?: RequestWithClient,
  ): Promise<boolean> {
    const cacheKey = `${clientId}:${flagKey}`;

    if (request?.featureFlagsCache?.has(cacheKey)) {
      return request.featureFlagsCache.get(cacheKey) ?? false;
    }

    const row = await this.prisma.clientFeatureFlag.findUnique({
      where: { clientId_flagKey: { clientId, flagKey } },
      select: { enabled: true },
    });

    let result: boolean;
    if (row) {
      result = row.enabled;
    } else {
      result = parseStrictBooleanEnv(process.env[flagKey]);
    }

    if (request) {
      if (!request.featureFlagsCache) {
        request.featureFlagsCache = new Map<string, boolean>();
      }
      request.featureFlagsCache.set(cacheKey, result);
    }

    return result;
  }
}
