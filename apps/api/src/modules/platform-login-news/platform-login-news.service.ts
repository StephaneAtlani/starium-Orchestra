import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlatformLoginNewsDto } from './dto/update-platform-login-news.dto';
import {
  PLATFORM_LOGIN_NEWS_SETTINGS_ID,
} from './platform-login-news.constants';

export interface PlatformLoginNewsPublic {
  message: string | null;
}

export interface PlatformLoginNewsAdmin extends PlatformLoginNewsPublic {
  id: string;
  updatedAt: Date | null;
}

@Injectable()
export class PlatformLoginNewsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeMessage(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async getPublic(): Promise<PlatformLoginNewsPublic> {
    const row = await this.prisma.platformLoginNews.findUnique({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
    });
    return { message: this.normalizeMessage(row?.message) };
  }

  async getAdmin(): Promise<PlatformLoginNewsAdmin> {
    const row = await this.prisma.platformLoginNews.findUnique({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
    });
    return {
      id: PLATFORM_LOGIN_NEWS_SETTINGS_ID,
      message: this.normalizeMessage(row?.message),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async patch(dto: UpdatePlatformLoginNewsDto): Promise<PlatformLoginNewsAdmin> {
    const message = this.normalizeMessage(dto.message);
    await this.prisma.platformLoginNews.upsert({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
      create: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID, message },
      update: { message },
    });
    return this.getAdmin();
  }
}
