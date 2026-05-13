import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import type { EffectiveRightsOperation } from '../access-diagnostics/access-diagnostics.types';

/** Sous-ensemble `ClientUser` + subscription pour les garde-fous licence / abonnement. */
export type MembershipAccessGateInput = {
  status: ClientUserStatus;
  licenseType: ClientUserLicenseType;
  licenseEndsAt: Date | null;
  licenseBillingMode: ClientUserLicenseBillingMode;
  subscriptionId: string | null;
  subscription: {
    status: ClientSubscriptionStatus;
    graceEndsAt: Date | null;
  } | null;
};

export type MembershipGateOutcome = { ok: true } | { ok: false; reasonCode: string };

export function evaluateLicenseGate(
  membership: Pick<MembershipAccessGateInput, 'status' | 'licenseType' | 'licenseEndsAt'>,
  operation: EffectiveRightsOperation,
): MembershipGateOutcome {
  if (membership.status !== ClientUserStatus.ACTIVE) {
    return { ok: false, reasonCode: 'USER_NOT_ACTIVE' };
  }
  if (
    (operation === 'write' || operation === 'admin') &&
    membership.licenseType !== ClientUserLicenseType.READ_WRITE
  ) {
    return { ok: false, reasonCode: 'LICENSE_READ_ONLY' };
  }
  if (
    membership.licenseEndsAt instanceof Date &&
    membership.licenseEndsAt.getTime() < Date.now()
  ) {
    return { ok: false, reasonCode: 'LICENSE_EXPIRED' };
  }
  return { ok: true };
}

export function evaluateSubscriptionGate(
  membership: Pick<
    MembershipAccessGateInput,
    'licenseBillingMode' | 'subscriptionId' | 'subscription'
  >,
): MembershipGateOutcome {
  if (membership.licenseBillingMode !== ClientUserLicenseBillingMode.CLIENT_BILLABLE) {
    return { ok: true };
  }
  if (!membership.subscriptionId || !membership.subscription) {
    return { ok: false, reasonCode: 'SUBSCRIPTION_REQUIRED' };
  }
  const now = Date.now();
  const sub = membership.subscription;
  const inGrace =
    sub.graceEndsAt instanceof Date && sub.graceEndsAt.getTime() >= now;
  if (
    sub.status === ClientSubscriptionStatus.ACTIVE ||
    (sub.status === ClientSubscriptionStatus.EXPIRED && inGrace)
  ) {
    return { ok: true };
  }
  return { ok: false, reasonCode: 'SUBSCRIPTION_INACTIVE' };
}
