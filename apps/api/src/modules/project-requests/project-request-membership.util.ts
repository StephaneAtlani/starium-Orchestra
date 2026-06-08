import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  evaluateLicenseGate,
  evaluateSubscriptionGate,
  type MembershipAccessGateInput,
} from '../access-decision/membership-access-gates';
import type { EffectiveRightsOperation } from '../access-diagnostics/access-diagnostics.types';

export type MembershipWithSubscription = Prisma.ClientUserGetPayload<{
  include: { subscription: true };
}>;

export function assertMembershipLicense(
  membership: MembershipAccessGateInput | null | undefined,
  operation: EffectiveRightsOperation,
): void {
  if (!membership) {
    throw new ForbiddenException('Membre client actif requis');
  }
  const lic = evaluateLicenseGate(membership, operation);
  if (!lic.ok) {
    throw new ForbiddenException(
      operation === 'read'
        ? 'Licence insuffisante pour la lecture'
        : 'Licence insuffisante: écriture réservée aux licences READ_WRITE',
    );
  }
  const sub = evaluateSubscriptionGate(membership);
  if (!sub.ok) {
    throw new ForbiddenException('Abonnement client requis ou inactif');
  }
}
