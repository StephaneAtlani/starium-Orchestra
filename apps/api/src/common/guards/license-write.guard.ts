import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import {
  AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
  CLIENT_USER_LICENSE_ACTION,
  type LicenseWriteDeniedReasonCode,
} from '../../modules/audit-logs/acl-audit-actions';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_WRITE_LICENSE_KEY } from '../decorators/require-write-license.decorator';
import { RequestWithClient } from '../types/request-with-client';

type HttpRequest = RequestWithClient & {
  requestId?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class LicenseWriteGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const shouldCheck =
      this.reflector.get<boolean>(REQUIRE_WRITE_LICENSE_KEY, context.getHandler()) ??
      this.reflector.get<boolean>(REQUIRE_WRITE_LICENSE_KEY, context.getClass());

    if (!shouldCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const userId = request.user?.userId;
    const clientId = request.activeClient?.id;

    if (!userId || !clientId) {
      throw new ForbiddenException('Contexte utilisateur/client actif requis');
    }

    const membership = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: {
          userId,
          clientId,
        },
      },
      include: {
        subscription: true,
      },
    });

    if (!membership || membership.status !== ClientUserStatus.ACTIVE) {
      throw new ForbiddenException('Membre actif requis pour écrire');
    }

    if (membership.licenseType !== ClientUserLicenseType.READ_WRITE) {
      this.auditCriticalDenial(request, clientId, userId, membership.id, 'WRITE_DENIED_READ_ONLY');
      throw new ForbiddenException(
        'Licence insuffisante: écriture réservée aux licences READ_WRITE',
      );
    }

    const now = Date.now();
    const licenseExpired =
      membership.licenseEndsAt instanceof Date &&
      membership.licenseEndsAt.getTime() < now;

    if (licenseExpired) {
      const supportExpired =
        membership.licenseBillingMode === ClientUserLicenseBillingMode.PLATFORM_INTERNAL;
      this.auditCriticalDenial(
        request,
        clientId,
        userId,
        membership.id,
        supportExpired
          ? 'WRITE_DENIED_SUPPORT_ACCESS_EXPIRED'
          : 'WRITE_DENIED_LICENSE_EXPIRED',
      );
      throw new ForbiddenException(
        supportExpired
          ? 'Écriture bloquée: accès support expiré'
          : 'Écriture bloquée: licence expirée',
      );
    }

    if (membership.licenseBillingMode === ClientUserLicenseBillingMode.CLIENT_BILLABLE) {
      const sub = membership.subscription;
      if (!sub) {
        this.auditCriticalDenial(
          request,
          clientId,
          userId,
          membership.id,
          'WRITE_DENIED_SUBSCRIPTION',
        );
        throw new ForbiddenException(
          'Licence invalide: abonnement requis pour READ_WRITE + CLIENT_BILLABLE',
        );
      }
      if (sub.clientId !== clientId) {
        this.auditCriticalDenial(
          request,
          clientId,
          userId,
          membership.id,
          'WRITE_DENIED_SUBSCRIPTION',
        );
        throw new ForbiddenException('Licence invalide: abonnement hors client actif');
      }
      const nowDate = new Date();
      const inGrace =
        sub.graceEndsAt instanceof Date && sub.graceEndsAt.getTime() >= nowDate.getTime();
      const isActive = sub.status === ClientSubscriptionStatus.ACTIVE;
      if (!isActive && !inGrace) {
        this.auditCriticalDenial(
          request,
          clientId,
          userId,
          membership.id,
          'WRITE_DENIED_SUBSCRIPTION',
        );
        throw new ForbiddenException(
          'Écriture bloquée: abonnement inactif ou hors période de grâce',
        );
      }
      if (
        sub.status === ClientSubscriptionStatus.SUSPENDED ||
        sub.status === ClientSubscriptionStatus.CANCELED
      ) {
        this.auditCriticalDenial(
          request,
          clientId,
          userId,
          membership.id,
          'WRITE_DENIED_SUBSCRIPTION',
        );
        throw new ForbiddenException(
          'Écriture bloquée: abonnement suspendu/annulé',
        );
      }
      if (sub.status === ClientSubscriptionStatus.EXPIRED && !inGrace) {
        this.auditCriticalDenial(
          request,
          clientId,
          userId,
          membership.id,
          'WRITE_DENIED_SUBSCRIPTION',
        );
        throw new ForbiddenException(
          'Écriture bloquée: abonnement expiré hors période de grâce',
        );
      }
    }

    return true;
  }

  /** Refus sécurité/conformité uniquement ; échec audit n’empêche pas le 403 métier. */
  private auditCriticalDenial(
    request: HttpRequest,
    clientId: string,
    actorUserId: string,
    resourceId: string,
    reasonCode: LicenseWriteDeniedReasonCode,
  ): void {
    const headers = request.headers ?? {};
    const ua = headers['user-agent'];
    const headerRid = headers['x-request-id'];
    const requestId =
      (typeof headerRid === 'string' && headerRid.length > 0
        ? headerRid
        : undefined) ?? request.requestId;

    void this.auditLogs
      .create({
        clientId,
        userId: actorUserId,
        action: CLIENT_USER_LICENSE_ACTION.WRITE_DENIED,
        resourceType: AUDIT_RESOURCE_TYPE_CLIENT_USER_LICENSE,
        resourceId,
        oldValue: null,
        newValue: {
          reasonCode,
          actorUserId,
          requestId: requestId ?? null,
        },
        ipAddress: typeof request.ip === 'string' ? request.ip : undefined,
        userAgent: typeof ua === 'string' ? ua : undefined,
        requestId,
      })
      .catch(() => {
        /* défensif : promesse rejetée ou AuditLogs interne */
      });
  }
}
