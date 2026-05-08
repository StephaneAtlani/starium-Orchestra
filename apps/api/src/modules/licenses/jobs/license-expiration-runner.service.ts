import { Injectable, Logger } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserRole,
  ClientUserStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import {
  AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
  AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
  CLIENT_SUBSCRIPTION_ACTION,
  CLIENT_USER_LICENSE_ACTION,
  clientSubscriptionToSnapshot,
  clientUserToLicenseAssignmentSnapshot,
  wrapSubscriptionAuditPayload,
  wrapLicenseAuditPayload,
} from '../../audit-logs/acl-audit-actions';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../prisma/prisma.service';

const SYSTEM_ACTOR = 'system:license-expiration-job';
const LICENSE_EXPIRATION_NOTIFICATION_ENTITY = 'license_expiration_job';
const REASON_EVALUATION_EXPIRED = 'AUTO_EXPIRE_EVALUATION';
const REASON_SUPPORT_ACCESS_EXPIRED = 'AUTO_EXPIRE_SUPPORT_ACCESS';
const REASON_SUBSCRIPTION_EXPIRED = 'AUTO_EXPIRE_SUBSCRIPTION_ENDED';

export type LicenseExpirationScanJobPayload = {
  windowStartIso: string;
  windowEndIso: string;
};

type ScanStats = {
  subscriptionsExpired: number;
  subscriptionsProcessed: number;
  licenseDowngradesFromSubscription: number;
  evaluationDowngrades: number;
  supportAccessDowngrades: number;
};

@Injectable()
export class LicenseExpirationRunnerService {
  private readonly logger = new Logger(LicenseExpirationRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async runScan(payload: LicenseExpirationScanJobPayload): Promise<ScanStats> {
    const now = new Date(payload.windowEndIso);
    const batchSize = Number(process.env.LICENSE_EXPIRATION_BATCH_SIZE ?? '200');
    const stats: ScanStats = {
      subscriptionsExpired: 0,
      subscriptionsProcessed: 0,
      licenseDowngradesFromSubscription: 0,
      evaluationDowngrades: 0,
      supportAccessDowngrades: 0,
    };

    let lastSubscriptionId: string | undefined;
    while (true) {
      const subscriptionCandidates = await this.prisma.clientSubscription.findMany({
        where: {
          OR: [
            { status: ClientSubscriptionStatus.ACTIVE, endsAt: { lt: now } },
            { status: ClientSubscriptionStatus.EXPIRED, graceEndsAt: { lt: now } },
          ],
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(lastSubscriptionId
          ? { cursor: { id: lastSubscriptionId }, skip: 1 }
          : {}),
      });
      if (subscriptionCandidates.length === 0) break;
      for (const candidate of subscriptionCandidates) {
        const result = await this.processSubscriptionExpiration(
          candidate.id,
          now,
          payload.windowStartIso,
        );
        stats.subscriptionsProcessed += Number(result.processed);
        stats.subscriptionsExpired += Number(result.subscriptionExpired);
        stats.licenseDowngradesFromSubscription += result.downgradedLicenses;
      }
      lastSubscriptionId =
        subscriptionCandidates[subscriptionCandidates.length - 1]?.id;
    }

    let lastClientUserId: string | undefined;
    while (true) {
      const licenseCandidates = await this.prisma.clientUser.findMany({
        where: {
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseEndsAt: { lt: now },
          licenseBillingMode: {
            in: [
              ClientUserLicenseBillingMode.EVALUATION,
              ClientUserLicenseBillingMode.PLATFORM_INTERNAL,
            ],
          },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(lastClientUserId ? { cursor: { id: lastClientUserId }, skip: 1 } : {}),
      });
      if (licenseCandidates.length === 0) break;

      for (const candidate of licenseCandidates) {
        const result = await this.processLicenseExpiration(
          candidate.id,
          now,
          payload.windowStartIso,
        );
        if (result === CLIENT_USER_LICENSE_ACTION.EVALUATION_EXPIRED) {
          stats.evaluationDowngrades += 1;
        }
        if (result === CLIENT_USER_LICENSE_ACTION.SUPPORT_ACCESS_EXPIRED) {
          stats.supportAccessDowngrades += 1;
        }
      }

      lastClientUserId = licenseCandidates[licenseCandidates.length - 1]?.id;
    }

    await this.emitVolumeNotifications(stats, payload.windowStartIso);

    this.logger.log(
      `License expiration scan completed window=${payload.windowStartIso} expiredSubscriptions=${stats.subscriptionsExpired} subscriptionDowngrades=${stats.licenseDowngradesFromSubscription} evaluationDowngrades=${stats.evaluationDowngrades} supportDowngrades=${stats.supportAccessDowngrades}`,
    );
    return stats;
  }

  private async processSubscriptionExpiration(
    subscriptionId: string,
    now: Date,
    windowStartIso: string,
  ): Promise<{
    processed: boolean;
    subscriptionExpired: boolean;
    downgradedLicenses: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.clientSubscription.findUnique({
        where: { id: subscriptionId },
      });
      if (!before) {
        return { processed: false, subscriptionExpired: false, downgradedLicenses: 0 };
      }

      let after = before;
      let subscriptionExpired = false;
      if (
        before.status === ClientSubscriptionStatus.ACTIVE &&
        before.endsAt instanceof Date &&
        before.endsAt.getTime() < now.getTime()
      ) {
        after = await tx.clientSubscription.update({
          where: { id: before.id },
          data: { status: ClientSubscriptionStatus.EXPIRED },
        });
        subscriptionExpired = true;
        await this.auditLogs.create(
          {
            clientId: before.clientId,
            userId: undefined,
            action: CLIENT_SUBSCRIPTION_ACTION.EXPIRED,
            resourceType: AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
            resourceId: before.id,
            oldValue: wrapSubscriptionAuditPayload(
              clientSubscriptionToSnapshot(before),
              {
                actorUserId: SYSTEM_ACTOR,
                requestId: windowStartIso,
              },
            ),
            newValue: wrapSubscriptionAuditPayload(
              clientSubscriptionToSnapshot(after),
              {
                actorUserId: SYSTEM_ACTOR,
                requestId: windowStartIso,
              },
            ),
            requestId: windowStartIso,
          },
          tx,
        );
        await this.notifyClientAdmins(
          tx,
          before.clientId,
          `subscription-expired:${before.id}:${windowStartIso}`,
          'Abonnement expiré',
          `L'abonnement ${before.id} est passé en statut EXPIRED.`,
          {
            event: 'subscription_expired',
            subscriptionId: before.id,
            windowStartIso,
          },
        );
      }

      let downgradedLicenses = 0;
      if (this.isGraceEnded(after, now)) {
        const linkedLicenses = await tx.clientUser.findMany({
          where: {
            clientId: after.clientId,
            status: ClientUserStatus.ACTIVE,
            subscriptionId: after.id,
            licenseType: ClientUserLicenseType.READ_WRITE,
            licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
          },
        });

        for (const member of linkedLicenses) {
          const updated = await tx.clientUser.update({
            where: { id: member.id },
            data: {
              licenseType: ClientUserLicenseType.READ_ONLY,
              licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
              subscriptionId: null,
              licenseAssignmentReason: REASON_SUBSCRIPTION_EXPIRED,
            },
          });

          await this.auditLogs.create(
            {
              clientId: member.clientId,
              userId: undefined,
              action: CLIENT_USER_LICENSE_ACTION.SUBSCRIPTION_EXPIRED_DOWNGRADE,
              resourceType: AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
              resourceId: member.id,
              oldValue: wrapLicenseAuditPayload(
                clientUserToLicenseAssignmentSnapshot(member),
                {
                  actorUserId: SYSTEM_ACTOR,
                  targetUserId: member.userId,
                  reason: REASON_SUBSCRIPTION_EXPIRED,
                  requestId: windowStartIso,
                },
              ),
              newValue: wrapLicenseAuditPayload(
                clientUserToLicenseAssignmentSnapshot(updated),
                {
                  actorUserId: SYSTEM_ACTOR,
                  targetUserId: member.userId,
                  reason: REASON_SUBSCRIPTION_EXPIRED,
                  requestId: windowStartIso,
                },
              ),
              requestId: windowStartIso,
            },
            tx,
          );
          downgradedLicenses += 1;
        }

        if (downgradedLicenses > 0) {
          await this.notifyClientAdmins(
            tx,
            after.clientId,
            `grace-ended:${after.id}:${windowStartIso}`,
            'Fin de période de grâce',
            `${downgradedLicenses} licence(s) ont été rétrogradées en lecture seule après expiration de la grâce.`,
            {
              event: 'subscription_grace_ended',
              subscriptionId: after.id,
              downgradedLicenses,
              windowStartIso,
            },
          );
        }
      }

      return {
        processed: subscriptionExpired || downgradedLicenses > 0,
        subscriptionExpired,
        downgradedLicenses,
      };
    });
  }

  private async processLicenseExpiration(
    clientUserId: string,
    now: Date,
    windowStartIso: string,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.clientUser.findUnique({
        where: { id: clientUserId },
      });
      if (!before) return null;
      if (before.status !== ClientUserStatus.ACTIVE) return null;
      if (before.licenseType !== ClientUserLicenseType.READ_WRITE) return null;
      if (!(before.licenseEndsAt instanceof Date)) return null;
      if (before.licenseEndsAt.getTime() >= now.getTime()) return null;
      if (
        before.licenseBillingMode !== ClientUserLicenseBillingMode.EVALUATION &&
        before.licenseBillingMode !== ClientUserLicenseBillingMode.PLATFORM_INTERNAL
      ) {
        return null;
      }

      const action =
        before.licenseBillingMode === ClientUserLicenseBillingMode.EVALUATION
          ? CLIENT_USER_LICENSE_ACTION.EVALUATION_EXPIRED
          : CLIENT_USER_LICENSE_ACTION.SUPPORT_ACCESS_EXPIRED;
      const reason =
        action === CLIENT_USER_LICENSE_ACTION.EVALUATION_EXPIRED
          ? REASON_EVALUATION_EXPIRED
          : REASON_SUPPORT_ACCESS_EXPIRED;

      const after = await tx.clientUser.update({
        where: { id: before.id },
        data: {
          licenseType: ClientUserLicenseType.READ_ONLY,
          licenseBillingMode: ClientUserLicenseBillingMode.NON_BILLABLE,
          subscriptionId: null,
          licenseAssignmentReason: reason,
        },
      });

      await this.auditLogs.create(
        {
          clientId: before.clientId,
          userId: undefined,
          action,
          resourceType: AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
          resourceId: before.id,
          oldValue: wrapLicenseAuditPayload(
            clientUserToLicenseAssignmentSnapshot(before),
            {
              actorUserId: SYSTEM_ACTOR,
              targetUserId: before.userId,
              reason,
              requestId: windowStartIso,
            },
          ),
          newValue: wrapLicenseAuditPayload(
            clientUserToLicenseAssignmentSnapshot(after),
            {
              actorUserId: SYSTEM_ACTOR,
              targetUserId: after.userId,
              reason,
              requestId: windowStartIso,
            },
          ),
          requestId: windowStartIso,
        },
        tx,
      );

      if (action === CLIENT_USER_LICENSE_ACTION.SUPPORT_ACCESS_EXPIRED) {
        await this.notifyClientAdmins(
          tx,
          before.clientId,
          `support-access-expired:${before.id}:${windowStartIso}`,
          'Accès support expiré',
          `L'accès support temporaire de l'utilisateur ${before.userId} est expiré.`,
          {
            event: 'support_access_expired',
            clientUserId: before.id,
            userId: before.userId,
            windowStartIso,
          },
        );
      }

      return action;
    });
  }

  private isGraceEnded(subscription: { endsAt: Date | null; graceEndsAt: Date | null }, now: Date): boolean {
    if (!(subscription.endsAt instanceof Date)) {
      return false;
    }
    const graceReference = subscription.graceEndsAt ?? subscription.endsAt;
    return graceReference.getTime() < now.getTime();
  }

  private async notifyClientAdmins(
    tx: Prisma.TransactionClient,
    clientId: string,
    dedupeKey: string,
    title: string,
    message: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    const admins = await tx.clientUser.findMany({
      where: {
        clientId,
        role: ClientUserRole.CLIENT_ADMIN,
        status: ClientUserStatus.ACTIVE,
      },
      select: { userId: true },
    });

    for (const admin of admins) {
      const existing = await tx.notification.findFirst({
        where: {
          clientId,
          userId: admin.userId,
          entityType: LICENSE_EXPIRATION_NOTIFICATION_ENTITY,
          entityId: dedupeKey,
        },
        select: { id: true },
      });
      if (existing) continue;

      await tx.notification.create({
        data: {
          clientId,
          userId: admin.userId,
          type: NotificationType.SYSTEM,
          title,
          message,
          entityType: LICENSE_EXPIRATION_NOTIFICATION_ENTITY,
          entityId: dedupeKey,
          metadata,
        },
      });
    }
  }

  private async emitVolumeNotifications(
    stats: ScanStats,
    windowStartIso: string,
  ): Promise<void> {
    const threshold = Number(
      process.env.LICENSE_EXPIRATION_VOLUME_NOTIFICATION_THRESHOLD ?? '5',
    );
    if (stats.licenseDowngradesFromSubscription < threshold) {
      return;
    }

    const impactedClients = await this.prisma.clientUser.groupBy({
      by: ['clientId'],
      where: {
        licenseAssignmentReason: REASON_SUBSCRIPTION_EXPIRED,
        updatedAt: {
          gte: new Date(windowStartIso),
        },
      },
      _count: {
        _all: true,
      },
    });

    for (const client of impactedClients) {
      if (client._count._all < threshold) continue;
      await this.prisma.$transaction(async (tx) => {
        await this.notifyClientAdmins(
          tx,
          client.clientId,
          `downgrade-volume:${client.clientId}:${windowStartIso}`,
          'Volume élevé de licences rétrogradées',
          `${client._count._all} licences ont été rétrogradées sur ce scan.`,
          {
            event: 'license_downgrade_volume',
            threshold,
            downgradedLicenses: client._count._all,
            windowStartIso,
          },
        );
      });
    }
  }
}
