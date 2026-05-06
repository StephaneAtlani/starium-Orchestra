import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  Prisma,
  SubscriptionBillingPeriod,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientSubscriptionDto } from './dto/create-client-subscription.dto';
import { UpdateClientSubscriptionDto } from './dto/update-client-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async listByClient(clientId: string) {
    await this.ensureClient(clientId);
    return this.prisma.clientSubscription.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(clientId: string, dto: CreateClientSubscriptionDto) {
    await this.ensureClient(clientId);
    return this.prisma.clientSubscription.create({
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
  }

  async update(clientId: string, subscriptionId: string, dto: UpdateClientSubscriptionDto) {
    const row = await this.ensureSubscription(clientId, subscriptionId);

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
      return row;
    }

    return this.prisma.clientSubscription.update({
      where: { id: subscriptionId },
      data,
    });
  }

  async transition(
    clientId: string,
    subscriptionId: string,
    status: ClientSubscriptionStatus,
  ) {
    const row = await this.ensureSubscription(clientId, subscriptionId);
    if (row.status === status) {
      return row;
    }
    return this.prisma.clientSubscription.update({
      where: { id: subscriptionId },
      data: { status },
    });
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
