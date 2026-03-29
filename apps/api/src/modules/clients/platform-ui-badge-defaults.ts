import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';

/**
 * `apps/api/prisma/default-platform-ui-badge-config.json` — défauts plateforme (couleurs / libellés).
 * Chemin depuis le JS compilé : `dist/modules/clients/*.js` → `../../../prisma/`.
 */
let cached: Prisma.JsonValue | null = null;

export function getDefaultPlatformBadgeConfig(): Prisma.JsonValue {
  if (cached) return cached;
  const filePath = join(
    __dirname,
    '../../../prisma/default-platform-ui-badge-config.json',
  );
  const raw = readFileSync(filePath, 'utf8');
  cached = JSON.parse(raw) as Prisma.JsonValue;
  return cached;
}

/** Tests ou rechargement : invalide le cache (optionnel). */
export function clearDefaultPlatformBadgeConfigCache(): void {
  cached = null;
}
