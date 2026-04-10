import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from '../../microsoft/microsoft-token-crypto.service';
import type { ResolvedProcurementS3Config } from './procurement-s3.types';

const SETTINGS_ID = 'default';

@Injectable()
export class ProcurementS3ConfigResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: MicrosoftTokenCryptoService,
  ) {}

  /**
   * DB si ligne `enabled` + champs requis + secret déchiffrable ; sinon env `PROCUREMENT_S3_*` ; sinon null.
   */
  async resolve(): Promise<ResolvedProcurementS3Config | null> {
    const row = await this.prisma.platformProcurementS3Settings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (
      row?.enabled &&
      row.endpoint?.trim() &&
      row.accessKey?.trim() &&
      row.secretKeyEncrypted?.trim() &&
      row.bucket?.trim()
    ) {
      try {
        const secretKey = this.crypto.decrypt(row.secretKeyEncrypted);
        return {
          source: 'db',
          endpoint: row.endpoint.trim(),
          region: (row.region ?? 'us-east-1').trim() || 'us-east-1',
          accessKey: row.accessKey.trim(),
          secretKey,
          bucket: row.bucket.trim(),
          useSsl: row.useSsl,
          forcePathStyle: row.forcePathStyle,
        };
      } catch {
        return this.resolveFromEnv();
      }
    }
    return this.resolveFromEnv();
  }

  private resolveFromEnv(): ResolvedProcurementS3Config | null {
    const endpoint = this.config.get<string>('PROCUREMENT_S3_ENDPOINT')?.trim();
    const accessKey = this.config.get<string>('PROCUREMENT_S3_ACCESS_KEY')?.trim();
    const secretKey = this.config.get<string>('PROCUREMENT_S3_SECRET_KEY')?.trim();
    const bucket = this.config.get<string>('PROCUREMENT_S3_BUCKET')?.trim();
    if (!endpoint || !accessKey || !secretKey || !bucket) {
      return null;
    }
    const region =
      this.config.get<string>('PROCUREMENT_S3_REGION')?.trim() || 'us-east-1';
    const useSsl =
      this.config.get<string>('PROCUREMENT_S3_USE_SSL')?.toLowerCase() === 'true';
    const forcePathStyle =
      this.config.get<string>('PROCUREMENT_S3_FORCE_PATH_STYLE')?.toLowerCase() !==
      'false';
    return {
      source: 'env',
      endpoint,
      region,
      accessKey,
      secretKey,
      bucket,
      useSsl,
      forcePathStyle,
    };
  }
}
