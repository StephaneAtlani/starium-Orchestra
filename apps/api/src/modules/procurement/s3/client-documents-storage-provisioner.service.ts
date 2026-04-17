import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { createProcurementS3Client } from './procurement-s3-client.factory';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3-procurement-blob-storage.service';
import type { ResolvedProcurementS3Config } from './procurement-s3.types';

/**
 * Un client = un répertoire : `{racine}/{clientId}` en LOCAL, ou `{clientId}/` dans le bucket S3.
 * Idempotent à chaque appel (pas d’early-return qui saute la création).
 */
@Injectable()
export class ClientDocumentsStorageProvisionerService {
  private readonly logger = new Logger(ClientDocumentsStorageProvisionerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolution: ProcurementStorageResolutionService,
    private readonly s3Storage: S3ProcurementBlobStorageService,
    private readonly s3Resolver: ProcurementS3ConfigResolverService,
  ) {}

  async provisionClientDocumentStorage(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        slug: true,
        documentsBucketName: true,
        documentsBucketProvisionedAt: true,
      },
    });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    const ctx = await this.resolution.resolveForOperations();

    if (ctx.driver === 'LOCAL') {
      const dir = path.join(ctx.root, client.id);
      await mkdir(dir, { recursive: true });
      if (!client.documentsBucketProvisionedAt) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { documentsBucketProvisionedAt: new Date() },
        });
      }
      this.logger.log(`Client « ${client.slug} » : répertoire LOCAL « ${dir} ».`);
      return;
    }

    const cfg = await this.s3Resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'Stockage S3 indisponible pour provisionner le stockage documents client.',
      );
    }

    const platformBucket = cfg.bucket.trim();
    await this.s3Storage.ensureBucketExists(cfg);
    await this.putClientRootPrefix(cfg, platformBucket, client.id);

    const needsRow =
      !client.documentsBucketProvisionedAt ||
      client.documentsBucketName?.trim() !== platformBucket;
    if (needsRow) {
      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          documentsBucketName: platformBucket,
          documentsBucketProvisionedAt: new Date(),
        },
      });
    }
    this.logger.log(
      `Client « ${client.slug} » : répertoire S3 « ${client.id}/ » dans le bucket « ${platformBucket} ».`,
    );
  }

  /** Objet zero-byte `{clientId}/` pour matérialiser le dossier client dans la console S3. */
  private async putClientRootPrefix(
    cfg: ResolvedProcurementS3Config,
    bucket: string,
    clientId: string,
  ): Promise<void> {
    const key = `${clientId}/`;
    const s3 = createProcurementS3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      accessKey: cfg.accessKey,
      secretKey: cfg.secretKey,
      useSsl: cfg.useSsl,
      forcePathStyle: cfg.forcePathStyle,
    });
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.alloc(0),
        ContentType: 'application/x-directory',
      }),
    );
  }
}
