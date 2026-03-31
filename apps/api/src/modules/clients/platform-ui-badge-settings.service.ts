import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseUiBadgeConfigPayload } from './ui-badge-config.parse';
import { getDefaultPlatformBadgeConfig } from './platform-ui-badge-defaults';

const PLATFORM_ROW_ID = 'default';

@Injectable()
export class PlatformUiBadgeSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaults(): Promise<{ config: Prisma.JsonValue | null }> {
    const row = await this.prisma.platformUiBadgeSettings.findUnique({
      where: { id: PLATFORM_ROW_ID },
      select: { badgeConfig: true },
    });
    const stored = row?.badgeConfig as Prisma.JsonValue | null | undefined;
    return {
      config: stored ?? getDefaultPlatformBadgeConfig(),
    };
  }

  async updateDefaults(body: unknown): Promise<{ config: Prisma.JsonValue | null }> {
    const parsed = parseUiBadgeConfigPayload(body);
    await this.prisma.platformUiBadgeSettings.upsert({
      where: { id: PLATFORM_ROW_ID },
      create: { id: PLATFORM_ROW_ID, badgeConfig: parsed },
      update: { badgeConfig: parsed },
    });
    return { config: parsed as Prisma.JsonValue };
  }
}
