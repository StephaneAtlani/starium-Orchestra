#!/usr/bin/env node
/**
 * Préprod — marque rolled-back toutes les migrations Prisma en échec (P3009),
 * puis `migrate deploy` + start API.
 *
 * @prisma/client vit dans le workspace api (pnpm) — resolution via createRequire.
 */
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

const requireFromApi = createRequire('/app/apps/api/package.json');
const { PrismaClient } = requireFromApi('@prisma/client');

async function listFailed() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM "_prisma_migrations"
       WHERE finished_at IS NULL AND rolled_back_at IS NULL
       ORDER BY started_at`,
    );
    return rows.map((r) => r.migration_name).filter(Boolean);
  } catch {
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: '/app' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runSoft(cmd, args) {
  spawnSync(cmd, args, { stdio: 'inherit', cwd: '/app' });
}

(async () => {
  console.log('[preprod] Resolving failed Prisma migrations (if any)…');
  const failed = await listFailed();
  if (failed.length === 0) {
    console.log('[preprod] No failed migrations recorded.');
  } else {
    for (const name of failed) {
      console.log(`[preprod] migrate resolve --rolled-back ${name}`);
      runSoft('pnpm', [
        '--filter',
        '@starium-orchestra/api',
        'exec',
        'prisma',
        'migrate',
        'resolve',
        '--rolled-back',
        name,
      ]);
    }
  }

  console.log('[preprod] prisma migrate deploy…');
  run('pnpm', ['--filter', '@starium-orchestra/api', 'prisma:migrate']);

  console.log('[preprod] starting API…');
  const node = spawnSync('node', ['apps/api/dist/main.js'], {
    stdio: 'inherit',
    cwd: '/app',
  });
  process.exit(node.status ?? 1);
})();
