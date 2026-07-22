import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

/** Dérive deux entiers signés 32 bits pour pg_advisory_xact_lock(int, int). */
export function emailAdvisoryLockKeys(emailNormalized: string): {
  key1: number;
  key2: number;
} {
  const hash = createHash('sha256').update(emailNormalized, 'utf8').digest();
  const key1 = hash.readInt32BE(0);
  const key2 = hash.readInt32BE(4);
  return { key1, key2 };
}

export async function acquireEmailAdvisoryLock(
  tx: Prisma.TransactionClient,
  emailNormalized: string,
): Promise<void> {
  const { key1, key2 } = emailAdvisoryLockKeys(emailNormalized);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key1}::int, ${key2}::int)`;
}

export async function acquireEmailAdvisoryLocks(
  tx: Prisma.TransactionClient,
  emailNormalizedCandidates: string[],
): Promise<void> {
  const sorted = [...new Set(emailNormalizedCandidates)].sort((a, b) =>
    a.localeCompare(b),
  );
  for (const email of sorted) {
    await acquireEmailAdvisoryLock(tx, email);
  }
}
