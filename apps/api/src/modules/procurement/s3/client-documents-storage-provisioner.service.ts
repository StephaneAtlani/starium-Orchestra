import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import { ProcurementStorageResolutionService } from './procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3-procurement-blob-storage.service';
import { buildClientDocumentsBucketName } from './client-documents-bucket-name.util';

const PLATFORM_PROCUREMENT_SETTINGS_ID = 'default';

/** Marqueur à la racine du bucket client : corps non vide (certains S3 refusent PutObject 0 octet). */
const CLIENT_S3_ROOT_MARKER = '.starium-client-root';

/**
 * Un client = répertoire `{racine}/{clientId}` en LOCAL, ou **bucket S3 dédié** (nom dérivé du
 * préfixe plateforme + slug client) avec marqueur racine. Idempotent.
 */
@Injectable()
export class ClientDocumentsStorageProvisionerService {
  private readonly logger = new Logger(ClientDocumentsStorageProvisionerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
    this.logger.log(
      `[procurement] provision client=${clientId} slug=${client.slug} driver_effectif=${ctx.driver}`,
    );

    if (ctx.driver === 'LOCAL') {
      const dir = path.join(ctx.root, client.id);
      await mkdir(dir, { recursive: true });
      if (!client.documentsBucketProvisionedAt) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { documentsBucketProvisionedAt: new Date() },
        });
      }
      this.logger.log(`[procurement] répertoire disque « ${dir} » (driver_effectif=LOCAL).`);
      return;
    }

    const cfg = await this.s3Resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'Stockage S3 indisponible : activer la config plateforme (S3 + « Activer la configuration en base ») ou renseigner PROCUREMENT_S3_*.',
      );
    }

    const settings = await this.prisma.platformProcurementS3Settings.findUnique({
      where: { id: PLATFORM_PROCUREMENT_SETTINGS_ID },
      select: { clientDocumentsBucketPrefix: true },
    });
    const envPrefix = this.config
      .get<string>('PROCUREMENT_CLIENT_DOCUMENTS_BUCKET_PREFIX')
      ?.trim();
    const prefix =
      settings?.clientDocumentsBucketPrefix?.trim() || envPrefix || null;
    const clientBucket = buildClientDocumentsBucketName({
      prefix,
      clientId: client.id,
      slug: client.slug,
    });

    try {
      await this.s3Storage.putObject(cfg, {
        bucket: clientBucket,
        objectKey: CLIENT_S3_ROOT_MARKER,
        body: Buffer.from('Starium client storage root\n', 'utf8'),
        contentType: 'text/plain; charset=utf-8',
      });
    } catch (e) {
      this.logger.error(
        `[procurement] PutObject S3 échoué bucket=${clientBucket} key=${CLIENT_S3_ROOT_MARKER} : ${(e as Error).message}`,
      );
      throw e;
    }

    const needsRow =
      !client.documentsBucketProvisionedAt ||
      client.documentsBucketName?.trim() !== clientBucket;
    if (needsRow) {
      await this.prisma.client.update({
        where: { id: client.id },
        data: {
          documentsBucketName: clientBucket,
          documentsBucketProvisionedAt: new Date(),
        },
      });
    }
    this.logger.log(
      `[procurement] S3 → bucket client « ${clientBucket} » (marqueur « ${CLIENT_S3_ROOT_MARKER} » ; pièces sous Commandes|Factures|Contrats).`,
    );
  }
}
