/**
 * Environnement applicatif (signal = `NODE_ENV`).
 *
 * Pièges Next :
 * - DefinePlugin inline `process.env.NODE_ENV` → "production"|"development" au build.
 * - `next dev` impose NODE_ENV=development au process (écrase le `.env`).
 * - Compose fige STARIUM_NODE_ENV au *create* du conteneur — un edit `.env`
 *   sans recreate ne met pas à jour process.env.
 *
 * Lecture runtime (server-only), à chaque requête :
 * 1. Ligne `NODE_ENV=` du `.env` racine (monté en web-dev) — live
 * 2. `STARIUM_NODE_ENV` (entrypoint / compose préprod)
 * 3. `node:process`.env (standalone)
 *
 * Ne pas importer depuis un Client Component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env as nodeEnvMap } from 'node:process';

export type StariumAppEnv = 'development' | 'preproduction' | 'production';

function nodeEnvKey(): string {
  return ['NODE', 'ENV'].join('_');
}

function isVitestRuntime(): boolean {
  return nodeEnvMap.VITEST === 'true' || nodeEnvMap.NODE_ENV === 'test';
}

/** Extrait `NODE_ENV` d’un contenu dotenv (ignore le reste, pas de DCP). */
export function parseNodeEnvFromDotenv(contents: string): string | null {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^NODE_ENV\s*=\s*(?:['"]?)([^'"#\n]+?)(?:['"])?\s*(?:#.*)?$/.exec(
      trimmed,
    );
    if (match?.[1]) {
      const value = match[1].trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

function dotenvCandidatePaths(): string[] {
  const cwd = process.cwd();
  return [
    '/app/.env',
    resolve(cwd, '../../.env'),
    resolve(cwd, '.env'),
  ];
}

function readNodeEnvFromDotenvFile(): string | null {
  for (const file of dotenvCandidatePaths()) {
    if (!existsSync(file)) continue;
    try {
      return parseNodeEnvFromDotenv(readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

function readRawDeployEnv(): string {
  if (!isVitestRuntime()) {
    const fromFile = readNodeEnvFromDotenvFile();
    if (fromFile) return fromFile;
  }
  const key = nodeEnvKey();
  const starium = nodeEnvMap.STARIUM_NODE_ENV;
  if (typeof starium === 'string' && starium.trim() !== '') {
    return starium;
  }
  const raw = nodeEnvMap[key] ?? nodeEnvMap.NODE_ENV;
  return String(raw ?? 'development');
}

export function readNodeEnv(): string {
  return readRawDeployEnv().trim().toLowerCase();
}

export function getAppEnv(): StariumAppEnv {
  const nodeEnv = readNodeEnv();
  if (nodeEnv === 'preproduction' || nodeEnv === 'preprod') {
    return 'preproduction';
  }
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return 'development';
  }
  return 'production';
}

export function isPreproductionEnv(): boolean {
  return getAppEnv() === 'preproduction';
}

/** Filet si NODE_ENV n’est pas propagé — host préprod (ignoré si `.env` = development). */
export function isPreproductionHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  return h.includes('preprod') || h.includes('preproduction');
}
