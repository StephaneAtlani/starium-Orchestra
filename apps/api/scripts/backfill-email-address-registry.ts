#!/usr/bin/env ts-node
/**
 * Backfill EmailAddressRegistry (Lot 1) — dry-run par défaut.
 * Usage:
 *   pnpm --filter @starium-orchestra/api exec ts-node scripts/backfill-email-address-registry.ts
 *   ... --execute
 */
import { EmailAddressRegistryType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  return { execute: argv.includes('--execute') };
}

async function main() {
  const { execute } = parseArgs(process.argv);
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  const identities = await prisma.userEmailIdentity.findMany({
    select: { id: true, userId: true, emailNormalized: true, directoryManaged: true },
  });

  let primaryCount = 0;
  let identityCount = 0;
  const collisions: string[] = [];

  for (const user of users) {
    const normalized = user.email.trim().toLowerCase();
    if (!normalized.includes('@')) continue;
    const existing = await prisma.emailAddressRegistry.findUnique({
      where: { emailNormalized: normalized },
      select: { userId: true },
    });
    if (existing && existing.userId !== user.id) {
      collisions.push(normalized);
      continue;
    }
    primaryCount++;
    if (execute) {
      await prisma.emailAddressRegistry.upsert({
        where: { emailNormalized: normalized },
        create: {
          emailNormalized: normalized,
          userId: user.id,
          type: EmailAddressRegistryType.PRIMARY,
        },
        update: {
          userId: user.id,
          type: EmailAddressRegistryType.PRIMARY,
          userEmailIdentityId: null,
        },
      });
    }
  }

  for (const identity of identities) {
    const existing = await prisma.emailAddressRegistry.findUnique({
      where: { emailNormalized: identity.emailNormalized },
      select: { userId: true },
    });
    if (existing && existing.userId !== identity.userId) {
      collisions.push(identity.emailNormalized);
      continue;
    }
    identityCount++;
    if (execute) {
      await prisma.emailAddressRegistry.upsert({
        where: { emailNormalized: identity.emailNormalized },
        create: {
          emailNormalized: identity.emailNormalized,
          userId: identity.userId,
          userEmailIdentityId: identity.id,
          type: identity.directoryManaged
            ? EmailAddressRegistryType.DIRECTORY
            : EmailAddressRegistryType.SECONDARY,
        },
        update: {
          userId: identity.userId,
          userEmailIdentityId: identity.id,
          type: identity.directoryManaged
            ? EmailAddressRegistryType.DIRECTORY
            : EmailAddressRegistryType.SECONDARY,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: !execute,
        primaryCandidates: primaryCount,
        identityCandidates: identityCount,
        collisions,
      },
      null,
      2,
    ),
  );

  if (collisions.length > 0) {
    process.exit(execute ? 1 : 0);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
