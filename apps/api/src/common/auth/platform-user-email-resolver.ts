import { Prisma } from '@prisma/client';
import { normalizeEmail } from '../../modules/me/email-identity.util';

export type EmailResolutionResult = {
  primaryUserIds: string[];
  verifiedIdentityUserIds: string[];
  unverifiedIdentityUserIds: string[];
};

export type ProvisioningMatchResult =
  | { kind: 'not_found' }
  | { kind: 'matched'; userId: string }
  | { kind: 'ambiguous'; userIds: string[] };

export function dedupeUserIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function getEligibleUserIds(result: EmailResolutionResult): string[] {
  return dedupeUserIds([
    ...result.primaryUserIds,
    ...result.verifiedIdentityUserIds,
  ]);
}

export function normalizeEmailCandidates(
  candidates: Array<string | null | undefined>,
): string[] {
  const normalized: string[] = [];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const value = normalizeEmail(raw);
    if (value.includes('@')) normalized.push(value);
  }
  return dedupeUserIds(normalized);
}

export async function resolveUserIdsByEmails(
  prisma: Prisma.TransactionClient | PrismaServiceLike,
  candidates: string[],
): Promise<EmailResolutionResult> {
  const normalized = normalizeEmailCandidates(candidates);
  if (normalized.length === 0) {
    return {
      primaryUserIds: [],
      verifiedIdentityUserIds: [],
      unverifiedIdentityUserIds: [],
    };
  }

  const primaryUsers = await prisma.user.findMany({
    where: {
      OR: normalized.map((email) => ({
        email: { equals: email, mode: 'insensitive' as const },
      })),
    },
    select: { id: true },
  });

  const identities = await prisma.userEmailIdentity.findMany({
    where: {
      emailNormalized: { in: normalized },
    },
    select: { userId: true, isVerified: true, isActive: true },
  });

  const verifiedIdentityUserIds: string[] = [];
  const unverifiedIdentityUserIds: string[] = [];
  for (const identity of identities) {
    if (identity.isVerified && identity.isActive) {
      verifiedIdentityUserIds.push(identity.userId);
    } else if (!identity.isVerified) {
      unverifiedIdentityUserIds.push(identity.userId);
    }
  }

  return {
    primaryUserIds: dedupeUserIds(primaryUsers.map((u) => u.id)),
    verifiedIdentityUserIds: dedupeUserIds(verifiedIdentityUserIds),
    unverifiedIdentityUserIds: dedupeUserIds(unverifiedIdentityUserIds),
  };
}

export function matchProvisioningFromResolution(
  result: EmailResolutionResult,
): ProvisioningMatchResult {
  const eligible = getEligibleUserIds(result);
  if (eligible.length === 0) return { kind: 'not_found' };
  if (eligible.length === 1) return { kind: 'matched', userId: eligible[0] };
  return { kind: 'ambiguous', userIds: eligible };
}

/** Minimal Prisma surface for resolver (service or transaction client). */
export type PrismaServiceLike = {
  user: Prisma.TransactionClient['user'];
  userEmailIdentity: Prisma.TransactionClient['userEmailIdentity'];
};
