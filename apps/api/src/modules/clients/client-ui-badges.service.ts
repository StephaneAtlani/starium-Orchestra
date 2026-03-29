import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseUiBadgeConfigPayload } from './ui-badge-config.parse';

@Injectable()
export class ClientUiBadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForActiveClient(clientId: string) {
    const [row, platformRow] = await Promise.all([
      this.prisma.client.findFirst({
        where: { id: clientId },
        select: { uiBadgeConfig: true },
      }),
      this.prisma.platformUiBadgeSettings.findUnique({
        where: { id: 'default' },
        select: { badgeConfig: true },
      }),
    ]);
    if (!row) {
      throw new NotFoundException('Client introuvable');
    }
    return {
      clientConfig: row.uiBadgeConfig as Prisma.JsonValue | null,
      platformDefaults: (platformRow?.badgeConfig as Prisma.JsonValue) ?? null,
    };
  }

  async updateForActiveClient(
    clientId: string,
    body: unknown,
  ): Promise<{ config: Prisma.JsonValue | null }> {
    const parsed = parseUiBadgeConfigPayload(body);
    await this.prisma.client.update({
      where: { id: clientId },
      data: { uiBadgeConfig: parsed },
    });
    return { config: parsed as Prisma.JsonValue };
  }

  /** Supprime les surcharges client → affichage = défauts plateforme + code. */
  async resetClientOverrides(clientId: string) {
    await this.prisma.client.update({
      where: { id: clientId },
      data: { uiBadgeConfig: Prisma.DbNull },
    });
    return this.getForActiveClient(clientId);
  }
}
