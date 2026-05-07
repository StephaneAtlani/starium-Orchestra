import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  Prisma,
  SubscriptionBillingPeriod,
} from '@prisma/client';
import type { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
  CLIENT_SUBSCRIPTION_ACTION,
  clientSubscriptionToSnapshot,
  resolveSubscriptionAuditActionForPatch,
  resolveSubscriptionAuditActionForTransition,
  wrapSubscriptionAuditPayload,
  type AuditEventMeta,
} from '../audit-logs/acl-audit-actions';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateClientSubscriptionDto } from './dto/create-client-subscription.dto';
import { UpdateClientSubscriptionDto } from './dto/update-client-subscription.dto';

export type SubscriptionMutationContext = {
  actorUserId?: string;
  meta?: RequestMeta;
};

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listByClient(clientId: string) {
    await this.ensureClient(clientId);
    return this.prisma.clientSubscription.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    clientId: string,
    dto: CreateClientSubscriptionDto,
    context?: SubscriptionMutationContext,
  ) {
    await this.ensureClient(clientId);
    const auditMeta = this.buildAuditMeta(context);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.clientSubscription.create({
        data: {
          clientId,
          status: dto.status ?? ClientSubscriptionStatus.DRAFT,
          billingPeriod: dto.billingPeriod ?? SubscriptionBillingPeriod.MONTHLY,
          readWriteSeatsLimit: dto.readWriteSeatsLimit,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          graceEndsAt: dto.graceEndsAt ? new Date(dto.graceEndsAt) : null,
        },
      });

      await this.auditLogs.create(
        {
          clientId,
          userId: context?.actorUserId,
          action: CLIENT_SUBSCRIPTION_ACTION.CREATED,
          resourceType: AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
          resourceId: created.id,
          oldValue: wrapSubscriptionAuditPayload(null, auditMeta),
          newValue: wrapSubscriptionAuditPayload(
            clientSubscriptionToSnapshot(created),
            auditMeta,
          ),
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          requestId: auditMeta.requestId,
        },
        tx,
      );

      return created;
    });
  }

  async update(
    clientId: string,
    subscriptionId: string,
    dto: UpdateClientSubscriptionDto,
    context?: SubscriptionMutationContext,
  ) {
    await this.ensureClient(clientId);

    const data: Prisma.ClientSubscriptionUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.billingPeriod) data.billingPeriod = dto.billingPeriod;
    if (dto.readWriteSeatsLimit !== undefined) {
      data.readWriteSeatsLimit = dto.readWriteSeatsLimit;
    }
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.graceEndsAt !== undefined) {
      data.graceEndsAt = dto.graceEndsAt ? new Date(dto.graceEndsAt) : null;
    }

    if (Object.keys(data).length === 0) {
      return this.ensureSubscription(clientId, subscriptionId);
    }

    const auditMeta = this.buildAuditMeta(context);

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.clientSubscription.findFirst({
        where: { id: subscriptionId, clientId },
      });
      if (!before) {
        throw new NotFoundException('Abonnement introuvable pour ce client');
      }

      const after = await tx.clientSubscription.update({
        where: { id: subscriptionId },
        data,
      });

      const action = resolveSubscriptionAuditActionForPatch(before, after);

      await this.auditLogs.create(
        {
          clientId,
          userId: context?.actorUserId,
          action,
          resourceType: AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
          resourceId: after.id,
          oldValue: wrapSubscriptionAuditPayload(
            clientSubscriptionToSnapshot(before),
            auditMeta,
          ),
          newValue: wrapSubscriptionAuditPayload(
            clientSubscriptionToSnapshot(after),
            auditMeta,
          ),
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          requestId: auditMeta.requestId,
        },
        tx,
      );

      return after;
    });
  }

  async transition(
    clientId: string,
    subscriptionId: string,
    status: ClientSubscriptionStatus,
    context?: SubscriptionMutationContext,
  ) {
    await this.ensureClient(clientId);
    const auditMeta = this.buildAuditMeta(context);

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.clientSubscription.findFirst({
        where: { id: subscriptionId, clientId },
      });
      if (!before) {
        throw new NotFoundException('Abonnement introuvable pour ce client');
      }

      if (before.status === status) {
        return before;
      }

      const after = await tx.clientSubscription.update({
        where: { id: subscriptionId },
        data: { status },
      });

      const action = resolveSubscriptionAuditActionForTransition(status);

      await this.auditLogs.create(
        {
          clientId,
          userId: context?.actorUserId,
          action,
          resourceType: AUDIT_RESOURCE_TYPE_CLIENT_SUBSCRIPTION,
          resourceId: after.id,
          oldValue: wrapSubscriptionAuditPayload(
            clientSubscriptionToSnapshot(before),
            auditMeta,
          ),
          newValue: wrapSubscriptionAuditPayload(
            clientSubscriptionToSnapshot(after),
            auditMeta,
          ),
          ipAddress: auditMeta.ipAddress,
          userAgent: auditMeta.userAgent,
          requestId: auditMeta.requestId,
        },
        tx,
      );

      return after;
    });
  }

  private buildAuditMeta(context?: SubscriptionMutationContext): AuditEventMeta {
    return {
      actorUserId: context?.actorUserId,
      requestId: context?.meta?.requestId,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
    };
  }

  private async ensureClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client non trouvé');
    return client;
  }

  private async ensureSubscription(clientId: string, subscriptionId: string) {
    const row = await this.prisma.clientSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!row || row.clientId !== clientId) {
      throw new NotFoundException('Abonnement introuvable pour ce client');
    }
    return row;
  }
}
