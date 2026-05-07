import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import type { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
  clientUserToLicenseAssignmentSnapshot,
  resolveCanonicalLicenseAction,
  wrapLicenseAuditPayload,
} from '../audit-logs/acl-audit-actions';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AssignUserLicenseDto } from './dto/assign-user-license.dto';

type AssignMode = 'platform' | 'client_admin';
type AssignmentInput = Pick<
  AssignUserLicenseDto,
  | 'licenseType'
  | 'licenseBillingMode'
  | 'subscriptionId'
  | 'licenseStartsAt'
  | 'licenseEndsAt'
  | 'licenseAssignmentReason'
>;

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getClientUsage(clientId: string) {
    const [totals, bySubscription, subscriptions] = await Promise.all([
      this.prisma.clientUser.count({
        where: {
          clientId,
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
        },
      }),
      this.prisma.clientUser.groupBy({
        by: ['subscriptionId'],
        where: {
          clientId,
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
          subscriptionId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.clientSubscription.findMany({
        where: { clientId },
        select: {
          id: true,
          status: true,
          readWriteSeatsLimit: true,
          graceEndsAt: true,
        },
      }),
    ]);

    const usedBySubscription = new Map(
      bySubscription.map((item) => [item.subscriptionId, item._count._all]),
    );

    return {
      clientId,
      totalReadWriteBillableUsed: totals,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        status: sub.status,
        graceEndsAt: sub.graceEndsAt,
        readWriteSeatsLimit: sub.readWriteSeatsLimit,
        readWriteBillableUsed: usedBySubscription.get(sub.id) ?? 0,
      })),
    };
  }

  async assignByPlatform(
    actorUserId: string | undefined,
    clientId: string,
    userId: string,
    dto: AssignUserLicenseDto,
    meta?: RequestMeta,
  ) {
    const membership = await this.getMembership(clientId, userId);
    const assignment = await this.validateLicenseAssignment({
      clientId,
      dto,
      targetUserId: userId,
      mode: 'platform',
    });
    return this.assignLicenseInTransaction({
      actorUserId,
      clientId,
      userId,
      membershipId: membership.id,
      assignment,
      meta,
    });
  }

  async assignByClientAdmin(
    actorUserId: string,
    clientId: string,
    userId: string,
    dto: AssignUserLicenseDto,
    meta?: RequestMeta,
  ) {
    await this.getMembership(clientId, actorUserId);
    const membership = await this.getMembership(clientId, userId);

    const allowed =
      (dto.licenseType === ClientUserLicenseType.READ_ONLY &&
        dto.licenseBillingMode === ClientUserLicenseBillingMode.NON_BILLABLE) ||
      (dto.licenseType === ClientUserLicenseType.READ_WRITE &&
        dto.licenseBillingMode === ClientUserLicenseBillingMode.CLIENT_BILLABLE);
    if (!allowed) {
      throw new ForbiddenException(
        'Le client admin ne peut attribuer que READ_ONLY+NON_BILLABLE ou READ_WRITE+CLIENT_BILLABLE',
      );
    }

    const assignment = await this.validateLicenseAssignment({
      clientId,
      dto,
      targetUserId: userId,
      mode: 'client_admin',
    });

    return this.assignLicenseInTransaction({
      actorUserId,
      clientId,
      userId,
      membershipId: membership.id,
      assignment,
      meta,
    });
  }

  async validateWriteAccess(userId: string, clientId: string): Promise<void> {
    const membership = await this.prisma.clientUser.findUnique({
      where: { userId_clientId: { userId, clientId } },
      include: { subscription: true },
    });
    if (!membership || membership.status !== ClientUserStatus.ACTIVE) {
      throw new ForbiddenException('Membre actif requis pour écrire');
    }
    if (membership.licenseType !== ClientUserLicenseType.READ_WRITE) {
      throw new ForbiddenException('Écriture bloquée: licence READ_ONLY');
    }
    if (
      membership.licenseEndsAt instanceof Date &&
      membership.licenseEndsAt.getTime() < Date.now()
    ) {
      throw new ForbiddenException('Écriture bloquée: licence expirée');
    }
    if (
      membership.licenseBillingMode === ClientUserLicenseBillingMode.CLIENT_BILLABLE
    ) {
      await this.ensureSubscriptionIsValid({
        clientId,
        subscriptionId: membership.subscriptionId,
      });
    }
  }

  private async validateLicenseAssignment(params: {
    clientId: string;
    dto: AssignUserLicenseDto;
    targetUserId: string;
    mode: AssignMode;
  }): Promise<AssignmentInput> {
    const { clientId, dto, targetUserId, mode } = params;
    const pair = `${dto.licenseType}:${dto.licenseBillingMode}`;
    const allowedPairs = new Set<string>([
      `${ClientUserLicenseType.READ_ONLY}:${ClientUserLicenseBillingMode.NON_BILLABLE}`,
      `${ClientUserLicenseType.READ_WRITE}:${ClientUserLicenseBillingMode.CLIENT_BILLABLE}`,
      `${ClientUserLicenseType.READ_WRITE}:${ClientUserLicenseBillingMode.NON_BILLABLE}`,
      `${ClientUserLicenseType.READ_WRITE}:${ClientUserLicenseBillingMode.PLATFORM_INTERNAL}`,
      `${ClientUserLicenseType.READ_WRITE}:${ClientUserLicenseBillingMode.EVALUATION}`,
      `${ClientUserLicenseType.READ_WRITE}:${ClientUserLicenseBillingMode.EXTERNAL_BILLABLE}`,
    ]);
    if (!allowedPairs.has(pair)) {
      throw new BadRequestException(
        `Couple licence invalide: ${dto.licenseType} + ${dto.licenseBillingMode}`,
      );
    }

    const isBillableWrite =
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      dto.licenseBillingMode === ClientUserLicenseBillingMode.CLIENT_BILLABLE;
    const isSpecialWrite =
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      dto.licenseBillingMode !== ClientUserLicenseBillingMode.CLIENT_BILLABLE;
    const reason = dto.licenseAssignmentReason?.trim() || null;
    const licenseStartsAt = dto.licenseStartsAt ? new Date(dto.licenseStartsAt) : null;
    let licenseEndsAt = dto.licenseEndsAt ? new Date(dto.licenseEndsAt) : null;
    const requiresPlatformAdmin =
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      (dto.licenseBillingMode === ClientUserLicenseBillingMode.NON_BILLABLE ||
        dto.licenseBillingMode === ClientUserLicenseBillingMode.PLATFORM_INTERNAL ||
        dto.licenseBillingMode === ClientUserLicenseBillingMode.EVALUATION ||
        dto.licenseBillingMode === ClientUserLicenseBillingMode.EXTERNAL_BILLABLE);

    if (requiresPlatformAdmin && mode !== 'platform') {
      throw new ForbiddenException(
        'Ce mode de licence est réservé aux Platform Admin',
      );
    }

    if (
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      dto.licenseBillingMode === ClientUserLicenseBillingMode.NON_BILLABLE &&
      !reason
    ) {
      throw new BadRequestException(
        'licenseAssignmentReason est obligatoire pour READ_WRITE + NON_BILLABLE',
      );
    }
    if (
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      dto.licenseBillingMode === ClientUserLicenseBillingMode.PLATFORM_INTERNAL
    ) {
      if (!reason) {
        throw new BadRequestException(
          'licenseAssignmentReason est obligatoire pour READ_WRITE + PLATFORM_INTERNAL',
        );
      }
      if (!licenseEndsAt) {
        throw new BadRequestException(
          'licenseEndsAt est obligatoire pour READ_WRITE + PLATFORM_INTERNAL',
        );
      }
    }
    if (
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      dto.licenseBillingMode === ClientUserLicenseBillingMode.EVALUATION
    ) {
      if (!reason) {
        throw new BadRequestException(
          'licenseAssignmentReason est obligatoire pour READ_WRITE + EVALUATION',
        );
      }
      if (!licenseEndsAt) {
        const now = new Date();
        now.setUTCDate(now.getUTCDate() + 30);
        licenseEndsAt = now;
      }
    }
    if (
      dto.licenseType === ClientUserLicenseType.READ_WRITE &&
      dto.licenseBillingMode === ClientUserLicenseBillingMode.EXTERNAL_BILLABLE &&
      !reason
    ) {
      throw new BadRequestException(
        'licenseAssignmentReason est obligatoire pour READ_WRITE + EXTERNAL_BILLABLE',
      );
    }

    if (isBillableWrite && !dto.subscriptionId) {
      throw new BadRequestException(
        'subscriptionId est obligatoire pour READ_WRITE + CLIENT_BILLABLE',
      );
    }

    if (!isBillableWrite && dto.subscriptionId) {
      throw new BadRequestException(
        'subscriptionId doit être null hors READ_WRITE + CLIENT_BILLABLE',
      );
    }

    if (isBillableWrite && dto.subscriptionId) {
      await this.ensureSubscriptionIsValid({
        clientId,
        subscriptionId: dto.subscriptionId,
      });
      await this.ensureQuotaAvailable({
        clientId,
        subscriptionId: dto.subscriptionId,
        targetUserId,
      });
    }

    return {
      licenseType: dto.licenseType,
      licenseBillingMode: dto.licenseBillingMode,
      subscriptionId: isBillableWrite ? (dto.subscriptionId ?? null) : null,
      licenseStartsAt: licenseStartsAt?.toISOString() ?? null,
      licenseEndsAt: licenseEndsAt?.toISOString() ?? null,
      licenseAssignmentReason: isSpecialWrite || reason ? reason : null,
    };
  }

  private async ensureQuotaAvailable(params: {
    clientId: string;
    subscriptionId: string;
    targetUserId: string;
  }) {
    const { clientId, subscriptionId, targetUserId } = params;
    const [subscription, current] = await Promise.all([
      this.prisma.clientSubscription.findUnique({
        where: { id: subscriptionId },
        select: {
          readWriteSeatsLimit: true,
        },
      }),
      this.prisma.clientUser.count({
        where: {
          clientId,
          subscriptionId,
          status: ClientUserStatus.ACTIVE,
          licenseType: ClientUserLicenseType.READ_WRITE,
          licenseBillingMode: ClientUserLicenseBillingMode.CLIENT_BILLABLE,
          userId: { not: targetUserId },
        },
      }),
    ]);
    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }
    if (current + 1 > subscription.readWriteSeatsLimit) {
      throw new BadRequestException(
        'Quota de sièges READ_WRITE CLIENT_BILLABLE dépassé',
      );
    }
  }

  private async ensureSubscriptionIsValid(params: {
    clientId: string;
    subscriptionId: string | null | undefined;
  }) {
    const { clientId, subscriptionId } = params;
    if (!subscriptionId) {
      throw new BadRequestException(
        'Abonnement requis pour READ_WRITE + CLIENT_BILLABLE',
      );
    }
    const sub = await this.prisma.clientSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub || sub.clientId !== clientId) {
      throw new BadRequestException(
        'subscriptionId invalide: abonnement hors client actif',
      );
    }
    const now = new Date();
    const inGrace =
      sub.graceEndsAt instanceof Date && sub.graceEndsAt.getTime() >= now.getTime();
    if (sub.status === ClientSubscriptionStatus.ACTIVE) return sub;
    if (sub.status === ClientSubscriptionStatus.EXPIRED && inGrace) return sub;
    throw new BadRequestException(
      'Abonnement invalide: statut non autorisé ou hors période de grâce',
    );
  }

  private async getMembership(clientId: string, userId: string) {
    const row = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: {
          userId,
          clientId,
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Utilisateur non rattaché à ce client');
    }
    return row;
  }

  private async assignLicenseInTransaction(params: {
    actorUserId?: string;
    clientId: string;
    userId: string;
    membershipId: string;
    assignment: AssignmentInput;
    meta?: RequestMeta;
  }) {
    const { actorUserId, clientId, userId, membershipId, assignment, meta } =
      params;

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.clientUser.findFirst({
        where: { id: membershipId, clientId, userId },
      });
      if (!before) {
        throw new NotFoundException('Utilisateur non rattaché à ce client');
      }

      const updated = await tx.clientUser.update({
        where: { id: before.id },
        data: {
          licenseType: assignment.licenseType,
          licenseBillingMode: assignment.licenseBillingMode,
          subscriptionId: assignment.subscriptionId ?? null,
          licenseStartsAt: assignment.licenseStartsAt
            ? new Date(assignment.licenseStartsAt)
            : null,
          licenseEndsAt: assignment.licenseEndsAt
            ? new Date(assignment.licenseEndsAt)
            : null,
          licenseAssignmentReason: assignment.licenseAssignmentReason ?? null,
        },
      });

      const action = resolveCanonicalLicenseAction(before, updated);
      const auditMeta = {
        actorUserId,
        targetUserId: userId,
        reason: updated.licenseAssignmentReason ?? null,
        requestId: meta?.requestId,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      };

      await this.auditLogs.create(
        {
          clientId,
          userId: actorUserId,
          action,
          resourceType: AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
          resourceId: updated.id,
          oldValue: wrapLicenseAuditPayload(
            clientUserToLicenseAssignmentSnapshot(before),
            auditMeta,
          ),
          newValue: wrapLicenseAuditPayload(
            clientUserToLicenseAssignmentSnapshot(updated),
            auditMeta,
          ),
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          requestId: meta?.requestId,
        },
        tx,
      );

      return updated;
    });
  }
}
