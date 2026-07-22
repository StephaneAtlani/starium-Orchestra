#!/usr/bin/env ts-node
/**
 * Réconciliation doublons annuaire / SSO — dry-run par défaut.
 * Usage:
 *   pnpm --filter @starium-orchestra/api exec ts-node scripts/reconcile-directory-duplicate-users.ts --dry-run
 *   ... --execute --canonical-user-id=... --duplicate-user-id=...
 */
import { PrismaClient } from '@prisma/client';
import {
  RECONCILE_USER_FK_DMMF_FINGERPRINT,
  validateFkWhitelistAgainstDmmf,
} from './reconcile-user-fk-whitelist';
import { EmailReservationService } from '../src/common/auth/email-reservation.service';

const prisma = new PrismaClient();
/** F11 — réservations e-mail avant transfert identités (chemin --execute Lot 3). */
const emailReservation = new EmailReservationService();
void emailReservation;

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = { dryRun: true };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--execute') args.dryRun = false;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value ?? argv[++i] ?? true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const dryRun = args.dryRun !== false;
  const clientId = args['client-id'] as string | undefined;
  const canonicalUserId = args['canonical-user-id'] as string | undefined;
  const duplicateUserId = args['duplicate-user-id'] as string | undefined;

  const fkCheck = validateFkWhitelistAgainstDmmf([]);
  const report: Record<string, unknown> = {
    dryRun,
    clientIdFilter: clientId ?? null,
    fkWhitelistValidated: fkCheck.valid,
    dmmfFingerprintExpected: RECONCILE_USER_FK_DMMF_FINGERPRINT,
    dmmfFingerprintCalculated: fkCheck.fingerprint,
    pairs: [] as Array<{ canonicalUserId: string; duplicateUserId: string }>,
    deleteUserAllowed: false,
  };

  if (!dryRun) {
    if (!canonicalUserId || !duplicateUserId) {
      console.error(
        'Refus: --execute exige --canonical-user-id et --duplicate-user-id',
      );
      process.exit(1);
    }
    if (fkCheck.fingerprint !== RECONCILE_USER_FK_DMMF_FINGERPRINT) {
      console.error('Refus: UNCOVERED_RELATION — empreinte DMMF invalide');
      process.exit(1);
    }
    console.error(
      'Exécution fusion non implémentée dans ce MVP — utilisez dry-run pour validation.',
    );
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: clientId
      ? {
          clientUsers: { some: { clientId } },
        }
      : undefined,
    select: {
      id: true,
      email: true,
      emailIdentities: { select: { emailNormalized: true } },
    },
    take: 500,
  });

  const byEmail = new Map<string, string[]>();
  for (const user of users) {
    const emails = new Set<string>([user.email.toLowerCase()]);
    for (const id of user.emailIdentities) {
      emails.add(id.emailNormalized);
    }
    for (const email of emails) {
      const list = byEmail.get(email) ?? [];
      list.push(user.id);
      byEmail.set(email, list);
    }
  }

  const candidatePairs = new Set<string>();
  for (const ids of byEmail.values()) {
    const unique = [...new Set(ids)];
    if (unique.length < 2) continue;
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = [unique[i], unique[j]].sort().join(':');
        if (!candidatePairs.has(key)) {
          candidatePairs.add(key);
          (report.pairs as Array<{ canonicalUserId: string; duplicateUserId: string }>).push({
            canonicalUserId: unique[i],
            duplicateUserId: unique[j],
          });
        }
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
