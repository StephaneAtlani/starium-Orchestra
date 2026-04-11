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
import { ProcurementStorageDriver } from '@prisma/client';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { MicrosoftTokenCryptoService } from '../../microsoft/microsoft-token-crypto.service';
import { UpdatePlatformProcurementS3SettingsDto } from './dto/update-platform-procurement-s3-settings.dto';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';

const SETTINGS_ID = 'default';

export interface PlatformProcurementS3SettingsPublic {
  id: string;
  enabled: boolean;
  storageDriver: ProcurementStorageDriver;
  localRoot: string | null;
  endpoint: string | null;
  region: string | null;
  accessKey: string | null;
  hasSecret: boolean;
  bucket: string | null;
  useSsl: boolean;
  forcePathStyle: boolean;
  updatedAt: Date;
  /** Source effective pour les opérations S3 (db / env / indisponible). */
  effectiveSource: 'db' | 'env' | 'none';
  /** Driver effectif après override env `PROCUREMENT_STORAGE_DRIVER` (RFC-035). */
  effectiveDriver: 'local' | 's3';
  /** Origine de la racine locale lorsque `effectiveDriver === local`. */
  effectiveLocalRootSource: 'env' | 'db' | 'none';
}

@Injectable()
export class PlatformProcurementS3SettingsService {
  private readonly logger = new Logger(PlatformProcurementS3SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: MicrosoftTokenCryptoService,
    private readonly storageResolution: ProcurementStorageResolutionService,
  ) {}

  private toPublic(row: {
    id: string;
    enabled: boolean;
    storageDriver: ProcurementStorageDriver;
    localRoot: string | null;
    endpoint: string | null;
    region: string | null;
    accessKey: string | null;
    secretKeyEncrypted: string | null;
    bucket: string | null;
    useSsl: boolean;
    forcePathStyle: boolean;
    updatedAt: Date;
  }): Omit<
    PlatformProcurementS3SettingsPublic,
    'effectiveSource' | 'effectiveDriver' | 'effectiveLocalRootSource'
  > {
    return {
      id: row.id,
      enabled: row.enabled,
      storageDriver: row.storageDriver,
      localRoot: row.localRoot,
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
    const meta = await this.storageResolution.getEffectiveMetadataForRow(row);
    return { ...this.toPublic(row), ...meta };
  }

  async patch(
    dto: UpdatePlatformProcurementS3SettingsDto,
  ): Promise<PlatformProcurementS3SettingsPublic> {
    const data: Record<string, unknown> = {};
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.storageDriver !== undefined) data.storageDriver = dto.storageDriver;
    if (dto.localRoot !== undefined) {
      data.localRoot = dto.localRoot?.trim() || null;
    }
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
      await this.assertStorageConnectivity(updated);
    }

    return this.get();
  }

  private async assertStorageConnectivity(
    row: {
      storageDriver: ProcurementStorageDriver;
      enabled: boolean;
      localRoot: string | null;
      endpoint: string | null;
      region: string | null;
      accessKey: string | null;
      secretKeyEncrypted: string | null;
      bucket: string | null;
      useSsl: boolean;
      forcePathStyle: boolean;
    },
  ): Promise<void> {
    const driver = this.storageResolution.effectiveDriverFromRow(row);
    if (driver === ProcurementStorageDriver.LOCAL) {
      await this.assertLocalConnectivity(row);
      return;
    }
    await this.assertS3Connectivity(row);
  }

  private async assertLocalConnectivity(
    row: {
      enabled: boolean;
      localRoot: string | null;
    },
  ): Promise<void> {
    const lr = this.storageResolution.resolveLocalRootFromRow(row);
    if (!lr) {
      throw new BadRequestException(
        'Stockage local : définir PROCUREMENT_LOCAL_ROOT ou localRoot plateforme avec « activé ».',
      );
    }
    try {
      await mkdir(lr.path, { recursive: true });
      await access(lr.path, fsConstants.W_OK);
    } catch (e) {
      this.logger.warn(`Local storage check failed: ${(e as Error).message}`);
      throw new BadRequestException(
        'Répertoire de stockage local inaccessible ou non inscriptible.',
      );
    }
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

  private async assertS3Connectivity(
    row: Parameters<PlatformProcurementS3SettingsService['buildClientFromRow']>[0] & {
      bucket: string | null;
    },
  ): Promise<void> {
    if (!row.bucket?.trim()) {
      throw new BadRequestException('Bucket requis lorsque le stockage objet (S3) est activé.');
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
        'Connexion S3 impossible (vérifier endpoint, identifiants et nom du bucket).',
      );
    }
  }
}
