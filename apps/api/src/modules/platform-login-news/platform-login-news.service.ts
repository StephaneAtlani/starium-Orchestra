import { BadRequestException, Injectable } from '@nestjs/common';
import { PlatformLoginNewsType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlatformLoginNewsDto } from './dto/update-platform-login-news.dto';
import {
  PLATFORM_LOGIN_NEWS_SETTINGS_ID,
} from './platform-login-news.constants';

export interface PlatformLoginNewsPublic {
  message: string | null;
  messageType: PlatformLoginNewsType;
  startsAt: Date | null;
  endsAt: Date | null;
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

  private normalizeOptionalDate(raw: string | null | undefined): Date | null {
    if (raw == null || raw === '') return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private resolveMessageType(
    dtoType: PlatformLoginNewsType | undefined,
    existingType: PlatformLoginNewsType | null | undefined,
  ): PlatformLoginNewsType {
    return dtoType ?? existingType ?? PlatformLoginNewsType.INFORMATION;
  }

  private resolveOptionalDate(
    dtoValue: string | null | undefined,
    existing: Date | null | undefined,
  ): Date | null {
    if (dtoValue === undefined) return existing ?? null;
    return this.normalizeOptionalDate(dtoValue);
  }

  private assertValidSchedule(startsAt: Date | null, endsAt: Date | null): void {
    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début.',
      );
    }
  }

  private isWithinDisplayWindow(
    startsAt: Date | null | undefined,
    endsAt: Date | null | undefined,
    now = new Date(),
  ): boolean {
    if (startsAt && now < startsAt) return false;
    if (endsAt && now > endsAt) return false;
    return true;
  }

  private mapRow(row: {
    message: string | null;
    messageType: PlatformLoginNewsType;
    startsAt: Date | null;
    endsAt: Date | null;
  }): Omit<PlatformLoginNewsPublic, 'message'> & { message: string | null } {
    return {
      message: this.normalizeMessage(row.message),
      messageType: row.messageType ?? PlatformLoginNewsType.INFORMATION,
      startsAt: row.startsAt ?? null,
      endsAt: row.endsAt ?? null,
    };
  }

  async getPublic(): Promise<PlatformLoginNewsPublic> {
    const row = await this.prisma.platformLoginNews.findUnique({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
    });
    if (!row) {
      return {
        message: null,
        messageType: PlatformLoginNewsType.INFORMATION,
        startsAt: null,
        endsAt: null,
      };
    }

    const mapped = this.mapRow(row);
    if (
      !mapped.message ||
      !this.isWithinDisplayWindow(mapped.startsAt, mapped.endsAt)
    ) {
      return {
        message: null,
        messageType: mapped.messageType,
        startsAt: null,
        endsAt: null,
      };
    }

    return mapped;
  }

  async getAdmin(): Promise<PlatformLoginNewsAdmin> {
    const row = await this.prisma.platformLoginNews.findUnique({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
    });
    if (!row) {
      return {
        id: PLATFORM_LOGIN_NEWS_SETTINGS_ID,
        message: null,
        messageType: PlatformLoginNewsType.INFORMATION,
        startsAt: null,
        endsAt: null,
        updatedAt: null,
      };
    }

    return {
      id: PLATFORM_LOGIN_NEWS_SETTINGS_ID,
      ...this.mapRow(row),
      updatedAt: row.updatedAt ?? null,
    };
  }

  async patch(dto: UpdatePlatformLoginNewsDto): Promise<PlatformLoginNewsAdmin> {
    const existing = await this.prisma.platformLoginNews.findUnique({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
    });

    const message =
      dto.message !== undefined
        ? this.normalizeMessage(dto.message)
        : this.normalizeMessage(existing?.message);

    const messageType = this.resolveMessageType(dto.messageType, existing?.messageType);
    const startsAt = this.resolveOptionalDate(dto.startsAt, existing?.startsAt);
    const endsAt = this.resolveOptionalDate(dto.endsAt, existing?.endsAt);

    this.assertValidSchedule(startsAt, endsAt);

    await this.prisma.platformLoginNews.upsert({
      where: { id: PLATFORM_LOGIN_NEWS_SETTINGS_ID },
      create: {
        id: PLATFORM_LOGIN_NEWS_SETTINGS_ID,
        message,
        messageType,
        startsAt,
        endsAt,
      },
      update: { message, messageType, startsAt, endsAt },
    });
    return this.getAdmin();
  }
}
