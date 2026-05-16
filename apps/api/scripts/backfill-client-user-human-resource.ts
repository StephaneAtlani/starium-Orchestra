/**
 * RFC-ACL-023 — Backfill lien ClientUser ↔ Resource HUMAN.
 *
 * Usage (simulation obligatoire en premier) :
 *   pnpm --filter @starium-orchestra/api exec ts-node --transpile-only \
 *     scripts/backfill-client-user-human-resource.ts --client-id <ID> --dry-run
 *
 * Application après revue CSV :
 *   pnpm --filter @starium-orchestra/api exec ts-node --transpile-only \
 *     scripts/backfill-client-user-human-resource.ts --client-id <ID> --apply
 */
import { PrismaClient } from '@prisma/client';
import {
  parseBackfillCliArgs,
  runClientUserHumanResourceBackfill,
} from '../src/common/backfill/client-user-human-resource.backfill';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const args = parseBackfillCliArgs(process.argv);
  console.log(
    `[backfill-client-user-human-resource] client=${args.clientId} mode=${args.mode} strategy=${args.strategyFlag ?? 'pipeline'} enableNameStrict=${args.enableNameStrict}`,
  );

  const result = await runClientUserHumanResourceBackfill(prisma, {
    clientId: args.clientId,
    mode: args.mode,
    strategyFlag: args.strategyFlag,
    enableNameStrict: args.enableNameStrict,
    limit: args.limit,
  });

  console.log(`[backfill-client-user-human-resource] rapport CSV : ${result.reportPath}`);
  console.log(
    `[backfill-client-user-human-resource] totals linked=${result.totals.linked} skipped=${result.totals.skipped} ambiguous=${result.totals.ambiguous} noCandidate=${result.totals.noCandidate} error=${result.totals.error}`,
  );
}

main()
  .catch((err) => {
    console.error('[backfill-client-user-human-resource] échec', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
