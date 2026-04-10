import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from '../../microsoft/microsoft-token-crypto.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { UpdatePlatformProcurementS3SettingsDto } from './dto/update-platform-procurement-s3-settings.dto';

const SETTINGS_ID = 'default';

export interface PlatformProcurementS3SettingsPublic {
  id: string;
  enabled: boolean;
  endpoint: string | null;
  region: string | null;
  accessKey: string | null;
  hasSecret: boolean;
  bucket: string | null;
  useSsl: boolean;
  forcePathStyle: boolean;
  updatedAt: Date;
  /** Source effective pour les opérations S3 après merge (db / env / indisponible). */
  effectiveSource: 'db' | 'env' | 'none';
}

@Injectable()
export class PlatformProcurementS3SettingsService {
  private readonly logger = new Logger(PlatformProcurementS3SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MicrosoftTokenCryptoService,
    private readonly resolver: ProcurementS3ConfigResolverService,
  ) {}

  private toPublic(row: {
    id: string;
    enabled: boolean;
    endpoint: string | null;
    region: string | null;
    accessKey: string | null;
    secretKeyEncrypted: string | null;
    bucket: string | null;
    useSsl: boolean;
    forcePathStyle: boolean;
    updatedAt: Date;
  }): Omit<PlatformProcurementS3SettingsPublic, 'effectiveSource'> {
    return {
      id: row.id,
      enabled: row.enabled,
      endpoint: row.endpoint,
      region: row.region,
      accessKey: row.accessKey,
      hasSecret: Boolean(row.secretKeyEncrypted?.trim().length),
      bucket: row.bucket,
      useSsl: row.useSsl,
      forcePathStyle: row.forcePathStyle,
      updatedAt: row.updatedAt,
    };
  }

  async get(): Promise<PlatformProcurementS3SettingsPublic> {
    let row = await this.prisma.platformProcurementS3Settings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (!row) {
      row = await this.prisma.platformProcurementS3Settings.create({
        data: { id: SETTINGS_ID },
      });
    }
    const resolved = await this.resolver.resolve();
    const effectiveSource: 'db' | 'env' | 'none' = resolved
      ? resolved.source
      : 'none';
    return { ...this.toPublic(row), effectiveSource };
  }

  async patch(
    dto: UpdatePlatformProcurementS3SettingsDto,
  ): Promise<PlatformProcurementS3SettingsPublic> {
    const data: Record<string, unknown> = {};
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.endpoint !== undefined) data.endpoint = dto.endpoint?.trim() || null;
    if (dto.region !== undefined) data.region = dto.region?.trim() || null;
    if (dto.accessKey !== undefined) data.accessKey = dto.accessKey?.trim() || null;
    if (dto.secretKey !== undefined) {
      data.secretKeyEncrypted = dto.secretKey?.trim().length
        ? this.crypto.encrypt(dto.secretKey.trim())
        : null;
    }
    if (dto.bucket !== undefined) data.bucket = dto.bucket?.trim() || null;
    if (dto.useSsl !== undefined) data.useSsl = dto.useSsl;
    if (dto.forcePathStyle !== undefined) data.forcePathStyle = dto.forcePathStyle;

    if (Object.keys(data).length === 0) {
      return this.get();
    }

    const updated = await this.prisma.platformProcurementS3Settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...(data as object) },
      update: data as object,
    });

    if (updated.enabled) {
      await this.assertConnectivity(updated);
    }

    return this.get();
  }

  private buildClientFromRow(row: {
    endpoint: string | null;
    region: string | null;
    accessKey: string | null;
    secretKeyEncrypted: string | null;
    useSsl: boolean;
    forcePathStyle: boolean;
  }): S3Client {
    if (
      !row.endpoint?.trim() ||
      !row.accessKey?.trim() ||
      !row.secretKeyEncrypted?.trim()
    ) {
      throw new BadRequestException(
        'Configuration S3 incomplète : endpoint, accessKey et secret requis pour la validation.',
      );
    }
    const secretKey = this.crypto.decrypt(row.secretKeyEncrypted);
    const raw = row.endpoint.trim();
    const endpointUrl = /^https?:\/\//i.test(raw)
      ? raw
      : `${row.useSsl ? 'https' : 'http'}://${raw}`;
    return new S3Client({
      region: row.region?.trim() || 'us-east-1',
      endpoint: endpointUrl,
      forcePathStyle: row.forcePathStyle,
      credentials: {
        accessKeyId: row.accessKey.trim(),
        secretAccessKey: secretKey,
      },
    });
  }

  private async assertConnectivity(
    row: Parameters<PlatformProcurementS3SettingsService['buildClientFromRow']>[0] & {
      bucket: string | null;
    },
  ): Promise<void> {
    if (!row.bucket?.trim()) {
      throw new BadRequestException('Bucket requis lorsque le stockage est activé.');
    }
    const client = this.buildClientFromRow(row);
    const bucket = row.bucket.trim();
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name;
      const status = (e as { $metadata?: { httpStatusCode?: number } })?.$metadata
        ?.httpStatusCode;
      if (name === 'NotFound' || status === 404) {
        try {
          await client.send(new CreateBucketCommand({ Bucket: bucket }));
          return;
        } catch (createErr) {
          this.logger.warn(
            `CreateBucket failed: ${(createErr as Error).message}`,
          );
        }
      }
      this.logger.warn(
        `S3 connectivity check failed: ${(e as Error).message}`,
      );
      throw new BadRequestException(
        'Connexion S3/MinIO impossible (vérifier endpoint, identifiants et nom du bucket).',
      );
    }
  }
}
