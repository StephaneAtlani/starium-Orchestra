import {
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  type ClientSubscription,
  type ClientUser,
} from '@prisma/client';

/** Ressource audit — rattachement stable (RFC-ACL-008). */
export const AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE = 'client_user_license';
export const AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION = 'client_subscription';

/** Abonnement client */
export const CLIENT_SUBSCRIPTION_ACTION = {
  CREATED: 'client_subscription.created',
  UPDATED: 'client_subscription.updated',
  ACTIVATED: 'client_subscription.activated',
  SUSPENDED: 'client_subscription.suspended',
  CANCELLED: 'client_subscription.cancelled',
} as const;

/** Licence utilisateur (mutation canonique unique par événement) */
export const CLIENT_USER_LICENSE_ACTION = {
  ASSIGNED: 'client_user.license.assigned',
  UPDATED: 'client_user.license.updated',
  EVALUATION_GRANTED: 'client_user.license.evaluation_granted',
  EVALUATION_EXTENDED: 'client_user.license.evaluation_extended',
  SUPPORT_ACCESS_GRANTED: 'client_user.license.support_access_granted',
  BILLING_MODE_CHANGED: 'client_user.license.billing_mode_changed',
  WRITE_DENIED: 'client_user.license.write_denied',
} as const;

/** Anciennes actions courtes — uniquement compatibilité lecture (ACTION_VARIANTS). */
export const LEGACY_LICENSE_AUDIT_ACTION = {
  EVALUATION_GRANTED: 'evaluation_granted',
  SUPPORT_ACCESS_GRANTED: 'support_access_granted',
  BILLING_MODE_CHANGED: 'billing_mode_changed',
} as const;

export type LicenseWriteDeniedReasonCode =
  | 'WRITE_DENIED_READ_ONLY'
  | 'WRITE_DENIED_LICENSE_EXPIRED'
  | 'WRITE_DENIED_SUPPORT_ACCESS_EXPIRED'
  | 'WRITE_DENIED_SUBSCRIPTION';

export interface AuditEventMeta {
  actorUserId?: string;
  targetUserId?: string;
  /** Motif licence (champ métier), pas un secret */
  reason?: string | null;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Snapshot métier symétrique (champs licence / rattachement). */
export interface ClientUserLicenseAssignmentSnapshot {
  id: string;
  userId: string;
  clientId: string;
  licenseType: string;
  licenseBillingMode: string;
  subscriptionId: string | null;
  licenseStartsAt: string | null;
  licenseEndsAt: string | null;
  licenseAssignmentReason: string | null;
}

export interface WrappedLicenseAuditPayload {
  assignment: ClientUserLicenseAssignmentSnapshot | null;
  meta: AuditEventMeta;
}

/** Enveloppe RFC-ACL-008 : snapshot métier + meta séparée. */
export function wrapLicenseAuditPayload(
  assignment: ClientUserLicenseAssignmentSnapshot | null,
  meta: AuditEventMeta,
): WrappedLicenseAuditPayload {
  return { assignment, meta };
}

export function clientUserToLicenseAssignmentSnapshot(
  row: ClientUser,
): ClientUserLicenseAssignmentSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    clientId: row.clientId,
    licenseType: row.licenseType,
    licenseBillingMode: row.licenseBillingMode,
    subscriptionId: row.subscriptionId ?? null,
    licenseStartsAt: row.licenseStartsAt?.toISOString() ?? null,
    licenseEndsAt: row.licenseEndsAt?.toISOString() ?? null,
    licenseAssignmentReason: row.licenseAssignmentReason ?? null,
  };
}

export interface ClientSubscriptionSnapshot {
  id: string;
  clientId: string;
  status: string;
  billingPeriod: string;
  readWriteSeatsLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  graceEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WrappedSubscriptionAuditPayload {
  subscription: ClientSubscriptionSnapshot | null;
  meta: AuditEventMeta;
}

export function clientSubscriptionToSnapshot(
  row: ClientSubscription,
): ClientSubscriptionSnapshot {
  return {
    id: row.id,
    clientId: row.clientId,
    status: row.status,
    billingPeriod: row.billingPeriod,
    readWriteSeatsLimit: row.readWriteSeatsLimit,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    graceEndsAt: row.graceEndsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function wrapSubscriptionAuditPayload(
  subscription: ClientSubscriptionSnapshot | null,
  meta: AuditEventMeta,
): WrappedSubscriptionAuditPayload {
  return { subscription, meta };
}

export function resolveSubscriptionAuditActionForTransition(
  targetStatus: ClientSubscription['status'],
): string {
  switch (targetStatus) {
    case 'ACTIVE':
      return CLIENT_SUBSCRIPTION_ACTION.ACTIVATED;
    case 'SUSPENDED':
      return CLIENT_SUBSCRIPTION_ACTION.SUSPENDED;
    case 'CANCELED':
      return CLIENT_SUBSCRIPTION_ACTION.CANCELLED;
    default:
      return CLIENT_SUBSCRIPTION_ACTION.UPDATED;
  }
}

/** Patch abonnement : si le statut change, action alignée sur la transition ; sinon updated. */
export function resolveSubscriptionAuditActionForPatch(
  before: ClientSubscription,
  after: ClientSubscription,
): string {
  if (before.status !== after.status) {
    return resolveSubscriptionAuditActionForTransition(after.status);
  }
  return CLIENT_SUBSCRIPTION_ACTION.UPDATED;
}

function isDefaultLicenseSnapshot(row: ClientUser): boolean {
  return (
    row.licenseType === ClientUserLicenseType.READ_ONLY &&
    row.licenseBillingMode === ClientUserLicenseBillingMode.NON_BILLABLE &&
    row.subscriptionId == null &&
    row.licenseStartsAt == null &&
    row.licenseEndsAt == null &&
    (row.licenseAssignmentReason == null || row.licenseAssignmentReason === '')
  );
}

function assignmentSnapshotFromUser(row: ClientUser): ClientUserLicenseAssignmentSnapshot {
  return clientUserToLicenseAssignmentSnapshot(row);
}

function snapshotsEqual(
  a: ClientUserLicenseAssignmentSnapshot,
  b: ClientUserLicenseAssignmentSnapshot,
): boolean {
  return (
    a.licenseType === b.licenseType &&
    a.licenseBillingMode === b.licenseBillingMode &&
    a.subscriptionId === b.subscriptionId &&
    a.licenseStartsAt === b.licenseStartsAt &&
    a.licenseEndsAt === b.licenseEndsAt &&
    (a.licenseAssignmentReason ?? null) === (b.licenseAssignmentReason ?? null)
  );
}

/**
 * Une seule action canonique par mutation (RFC-ACL-008).
 */
export function resolveCanonicalLicenseAction(
  before: ClientUser,
  after: ClientUser,
): string {
  const beforeSnap = assignmentSnapshotFromUser(before);
  const afterSnap = assignmentSnapshotFromUser(after);

  if (isDefaultLicenseSnapshot(before) && !snapshotsEqual(beforeSnap, afterSnap)) {
    return CLIENT_USER_LICENSE_ACTION.ASSIGNED;
  }

  if (before.licenseBillingMode !== after.licenseBillingMode) {
    if (after.licenseBillingMode === ClientUserLicenseBillingMode.EVALUATION) {
      return CLIENT_USER_LICENSE_ACTION.EVALUATION_GRANTED;
    }
    if (after.licenseBillingMode === ClientUserLicenseBillingMode.PLATFORM_INTERNAL) {
      return CLIENT_USER_LICENSE_ACTION.SUPPORT_ACCESS_GRANTED;
    }
    return CLIENT_USER_LICENSE_ACTION.BILLING_MODE_CHANGED;
  }

  if (after.licenseBillingMode === ClientUserLicenseBillingMode.EVALUATION) {
    const endsChanged =
      before.licenseEndsAt?.getTime() !== after.licenseEndsAt?.getTime();
    const reasonChanged =
      (before.licenseAssignmentReason ?? null) !==
      (after.licenseAssignmentReason ?? null);
    if (endsChanged || reasonChanged) {
      return CLIENT_USER_LICENSE_ACTION.EVALUATION_EXTENDED;
    }
  }

  return CLIENT_USER_LICENSE_ACTION.UPDATED;
}
