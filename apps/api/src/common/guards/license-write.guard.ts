import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientSubscriptionStatus, ClientUserLicenseType, ClientUserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_WRITE_LICENSE_KEY } from '../decorators/require-write-license.decorator';
import { RequestWithClient } from '../types/request-with-client';

@Injectable()
export class LicenseWriteGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const shouldCheck =
      this.reflector.get<boolean>(REQUIRE_WRITE_LICENSE_KEY, context.getHandler()) ??
      this.reflector.get<boolean>(REQUIRE_WRITE_LICENSE_KEY, context.getClass());

    if (!shouldCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithClient>();
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
      throw new ForbiddenException(
        "Licence insuffisante: écriture réservée aux licences READ_WRITE",
      );
    }
    if (
      membership.licenseEndsAt instanceof Date &&
      membership.licenseEndsAt.getTime() < Date.now()
    ) {
      throw new ForbiddenException('Écriture bloquée: licence expirée');
    }

    if (membership.licenseBillingMode === 'CLIENT_BILLABLE') {
      const sub = membership.subscription;
      if (!sub) {
        throw new ForbiddenException(
          "Licence invalide: abonnement requis pour READ_WRITE + CLIENT_BILLABLE",
        );
      }
      if (sub.clientId !== clientId) {
        throw new ForbiddenException(
          "Licence invalide: abonnement hors client actif",
        );
      }
      const now = new Date();
      const inGrace =
        sub.graceEndsAt instanceof Date && sub.graceEndsAt.getTime() >= now.getTime();
      const isActive = sub.status === ClientSubscriptionStatus.ACTIVE;
      if (!isActive && !inGrace) {
        throw new ForbiddenException(
          "Écriture bloquée: abonnement inactif ou hors période de grâce",
        );
      }
      if (
        sub.status === ClientSubscriptionStatus.SUSPENDED ||
        sub.status === ClientSubscriptionStatus.CANCELED
      ) {
        throw new ForbiddenException(
          "Écriture bloquée: abonnement suspendu/annulé",
        );
      }
      if (sub.status === ClientSubscriptionStatus.EXPIRED && !inGrace) {
        throw new ForbiddenException(
          "Écriture bloquée: abonnement expiré hors période de grâce",
        );
      }
    }

    return true;
  }
}
