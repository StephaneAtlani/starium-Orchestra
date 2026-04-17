import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ClientDocumentStorageDomain } from './client-document-storage-domain';
import { buildClientDocumentObjectKey } from './client-document-storage-path.util';
import { ClientDocumentsStorageProvisionerService } from './client-documents-storage-provisioner.service';
import { LocalProcurementBlobStorageService } from './local-procurement-blob-storage.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import {
  PROCUREMENT_LOCAL_BUCKET_SENTINEL,
  ProcurementStorageResolutionService,
} from './procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3-procurement-blob-storage.service';

const SETTINGS_ID = 'default';

@Injectable()
export class ProcurementObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ProcurementObjectStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolution: ProcurementStorageResolutionService,
    private readonly localStorage: LocalProcurementBlobStorageService,
    private readonly s3Storage: S3ProcurementBlobStorageService,
    private readonly s3Resolver: ProcurementS3ConfigResolverService,
    private readonly clientDocumentsProvisioner: ClientDocumentsStorageProvisionerService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const ctx = await this.resolution.resolveForOperations();
      if (ctx.driver === 'LOCAL') {
        await this.localStorage.ensureRootReady(ctx.root);
      } else {
        await this.s3Storage.ensureBucketExists(ctx.config);
      }
    } catch (e) {
      this.logger.warn(
        `Procurement stockage : init au démarrage ignorée (${(e as Error).message}). Nouvel essai à l'usage.`,
      );
    }
  }

  async putObject(params: {
    clientId: string;
    domain: ClientDocumentStorageDomain;
    body: Buffer;
    contentType: string;
    extension: string;
  }): Promise<{ bucket: string; objectKey: string; checksumSha256: string }> {
    await this.clientDocumentsProvisioner.provisionClientDocumentStorage(params.clientId);

    const ext =
      params.extension && params.extension.startsWith('.')
        ? params.extension
        : `.${params.extension || 'bin'}`;
    const safeExt = ext.replace(/[^.a-zA-Z0-9]/g, '') || '.bin';

    const ctx = await this.resolution.resolveForOperations();
    if (ctx.driver === 'LOCAL') {
      const objectKey = buildClientDocumentObjectKey(
        params.clientId,
        params.domain,
        safeExt,
      );
      return this.localStorage.putObject(ctx.root, {
        body: params.body,
        contentType: params.contentType,
        objectKey,
      });
    }

    const cfg = await this.s3Resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'Stockage des pièces indisponible : configurer S3 (plateforme ou variables PROCUREMENT_S3_*).',
      );
    }

    const exists = await this.prisma.client.findUnique({
      where: { id: params.clientId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Client introuvable');
    }

    const bucket = cfg.bucket.trim();
    if (!bucket) {
      throw new ServiceUnavailableException('Bucket S3 plateforme non configuré.');
    }

    const objectKey = buildClientDocumentObjectKey(
      params.clientId,
      params.domain,
      safeExt,
    );

    return this.s3Storage.putObject(cfg, {
      bucket,
      objectKey,
      body: params.body,
      contentType: params.contentType,
    });
  }

  async getObjectStream(
    bucket: string,
    objectKey: string,
  ): Promise<{ stream: Readable; contentType?: string }> {
    if (bucket === PROCUREMENT_LOCAL_BUCKET_SENTINEL) {
      const row = await this.prisma.platformProcurementS3Settings.findUnique({
        where: { id: SETTINGS_ID },
      });
      const lr = this.resolution.resolveLocalRootFromRow(row);
      if (!lr) {
        throw new ServiceUnavailableException(
          'Lecture pièce locale impossible : racine de stockage non configurée.',
        );
      }
      return this.localStorage.getObjectStream(lr.path, bucket, objectKey);
    }
    const cfg = await this.s3Resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'Stockage S3 indisponible pour la lecture de cette pièce.',
      );
    }
    return this.s3Storage.getObjectStream(cfg, bucket, objectKey);
  }
}
