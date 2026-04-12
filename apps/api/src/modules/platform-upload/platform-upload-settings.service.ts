import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlatformUploadSettingsDto } from './dto/update-platform-upload-settings.dto';
import {
  PLATFORM_UPLOAD_CEILING_DEFAULT_BYTES,
  PLATFORM_UPLOAD_DEFAULT_BYTES,
  PLATFORM_UPLOAD_MIN_BYTES,
} from './platform-upload.constants';

const SETTINGS_ID = 'default';

export interface PlatformUploadSettingsPublic {
  id: string;
  maxUploadBytes: number;
  /** Borne basse autorisée (octets) — pour l’UI. */
  minUploadBytes: number;
  /** Borne haute autorisée (octets) — dérivée de l’env d’exploitation. */
  maxUploadBytesCeiling: number;
  updatedAt: Date;
}

@Injectable()
export class PlatformUploadSettingsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformUploadSettingsService.name);
  /** Cache synchrone pour Multer / validations (rafraîchi au boot et après PATCH). */
  private cachedEffectiveMaxBytes = PLATFORM_UPLOAD_DEFAULT_BYTES;

  constructor(private readonly prisma: PrismaService) {}

  private parseCeiling(): number {
    const raw = process.env.PLATFORM_UPLOAD_MAX_BYTES_CEILING;
    if (raw === undefined || raw === '') {
      return PLATFORM_UPLOAD_CEILING_DEFAULT_BYTES;
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < PLATFORM_UPLOAD_MIN_BYTES) {
      this.logger.warn(
        `PLATFORM_UPLOAD_MAX_BYTES_CEILING invalide (${raw}), fallback ${PLATFORM_UPLOAD_CEILING_DEFAULT_BYTES}`,
      );
      return PLATFORM_UPLOAD_CEILING_DEFAULT_BYTES;
    }
    return n;
  }

  /** Plafond absolu d’exploitation (env). */
  getCeilingBytes(): number {
    return this.parseCeiling();
  }

  clampToAllowedRange(bytes: number): number {
    const ceiling = this.parseCeiling();
    return Math.min(
      Math.max(bytes, PLATFORM_UPLOAD_MIN_BYTES),
      ceiling,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.refreshCacheFromDb();
  }

  private async refreshCacheFromDb(): Promise<void> {
    let row = await this.prisma.platformUploadSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (!row) {
      row = await this.prisma.platformUploadSettings.create({
        data: {
          id: SETTINGS_ID,
          maxUploadBytes: PLATFORM_UPLOAD_DEFAULT_BYTES,
        },
      });
    }
    this.cachedEffectiveMaxBytes = this.clampToAllowedRange(row.maxUploadBytes);
    if (this.cachedEffectiveMaxBytes !== row.maxUploadBytes) {
      await this.prisma.platformUploadSettings.update({
        where: { id: SETTINGS_ID },
        data: { maxUploadBytes: this.cachedEffectiveMaxBytes },
      });
    }
  }

  /**
   * Limite effective pour Multer et contrôles métier (synchrone).
   */
  getEffectiveMaxBytes(): number {
    return this.cachedEffectiveMaxBytes;
  }

  async get(): Promise<PlatformUploadSettingsPublic> {
    const row = await this.prisma.platformUploadSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const maxUploadBytes = row
      ? this.clampToAllowedRange(row.maxUploadBytes)
      : PLATFORM_UPLOAD_DEFAULT_BYTES;
    return {
      id: SETTINGS_ID,
      maxUploadBytes,
      minUploadBytes: PLATFORM_UPLOAD_MIN_BYTES,
      maxUploadBytesCeiling: this.parseCeiling(),
      updatedAt: row?.updatedAt ?? new Date(),
    };
  }

  async patch(
    dto: UpdatePlatformUploadSettingsDto,
  ): Promise<PlatformUploadSettingsPublic> {
    const ceiling = this.parseCeiling();
    if (dto.maxUploadBytes > ceiling) {
      throw new BadRequestException(
        `maxUploadBytes ne peut pas dépasser le plafond d’exploitation (${ceiling} octets, variable PLATFORM_UPLOAD_MAX_BYTES_CEILING).`,
      );
    }
    const clamped = this.clampToAllowedRange(dto.maxUploadBytes);
    await this.prisma.platformUploadSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, maxUploadBytes: clamped },
      update: { maxUploadBytes: clamped },
    });
    this.cachedEffectiveMaxBytes = clamped;
    return this.get();
  }
}
