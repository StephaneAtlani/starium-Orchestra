import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFile, unlink } from 'node:fs/promises';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { RequestMeta } from '../../../common/decorators/request-meta.decorator';
import { ClientDocumentsStorageProvisionerService } from './client-documents-storage-provisioner.service';
import type { ClientDocumentStorageDomain } from './client-document-storage-domain';
import { buildS3ClientDocumentObjectKey } from './client-document-storage-path.util';
import { LocalProcurementBlobStorageService } from './local-procurement-blob-storage.service';
import { ProcurementS3ConfigResolverService } from './procurement-s3-config.resolver.service';
import {
  PROCUREMENT_LOCAL_BUCKET_SENTINEL,
  ProcurementStorageResolutionService,
} from './procurement-storage-resolution.service';
import { S3ProcurementBlobStorageService } from './s3-procurement-blob-storage.service';

const SETTINGS_ID = 'default';

@Injectable()
export class ProcurementLocalDocumentsS3MigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolution: ProcurementStorageResolutionService,
    private readonly localStorage: LocalProcurementBlobStorageService,
    private readonly s3Storage: S3ProcurementBlobStorageService,
    private readonly s3Resolver: ProcurementS3ConfigResolverService,
    private readonly provisioner: ClientDocumentsStorageProvisionerService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  parseDomainFromLocalObjectKey(
    clientId: string,
    objectKey: string,
  ): ClientDocumentStorageDomain | null {
    const parts = objectKey.split('/');
    if (parts.length < 4 || parts[0] !== clientId) {
      return null;
    }
    const folder = parts[1];
    if (folder === 'Commandes') {
      return 'commandes';
    }
    if (folder === 'Factures') {
      return 'factures';
    }
    if (folder === 'Contrats') {
      return 'contrats';
    }
    return null;
  }

  private safeExtensionFromRow(extension: string | null): string {
    const extRaw = extension?.trim();
    const extDot =
      extRaw && extRaw.startsWith('.')
        ? extRaw
        : extRaw
          ? `.${extRaw}`
          : '.bin';
    return extDot.replace(/[^.a-zA-Z0-9]/g, '') || '.bin';
  }

  async migrateClientProcurementLocalDocumentsToS3(
    clientId: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<{ migratedCount: number }> {
    const cfg = await this.s3Resolver.resolve();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'S3 non configuré pour la plateforme : renseigner la config procurement S3 ou les variables PROCUREMENT_S3_*.',
      );
    }

    const row = await this.prisma.platformProcurementS3Settings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const lr = this.resolution.resolveLocalRootFromRow(row);
    if (!lr) {
      throw new BadRequestException(
        'Racine locale introuvable (PROCUREMENT_LOCAL_ROOT ou localRoot plateforme activé) : impossible de lire les pièces historiques sur disque.',
      );
    }

    const clientExists = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!clientExists) {
      throw new NotFoundException('Client introuvable');
    }

    const targetBucket = await this.provisioner.ensureS3ClientDocumentsBucket(clientId);

    const attachments = await this.prisma.procurementAttachment.findMany({
      where: {
        clientId,
        storageBucket: PROCUREMENT_LOCAL_BUCKET_SENTINEL,
      },
      select: {
        id: true,
        objectKey: true,
        mimeType: true,
        extension: true,
      },
    });

    let migratedCount = 0;
    for (const att of attachments) {
      const domain = this.parseDomainFromLocalObjectKey(clientId, att.objectKey);
      if (!domain) {
        throw new BadRequestException(
          `Clé de stockage locale inattendue pour la pièce ${att.id} : ${att.objectKey}`,
        );
      }
      const filePath = this.localStorage.resolveFilePath(lr.path, att.objectKey);
      const body = await readFile(filePath);
      const safeExt = this.safeExtensionFromRow(att.extension);
      const newObjectKey = buildS3ClientDocumentObjectKey(domain, safeExt);
      const put = await this.s3Storage.putObject(cfg, {
        bucket: targetBucket,
        objectKey: newObjectKey,
        body,
        contentType: att.mimeType?.trim() || 'application/octet-stream',
      });
      await this.prisma.procurementAttachment.update({
        where: { id: att.id },
        data: {
          storageBucket: targetBucket,
          objectKey: newObjectKey,
          checksumSha256: put.checksumSha256,
        },
      });
      try {
        await unlink(filePath);
      } catch {
        /* fichier déjà absent ou verrou : la pièce est en S3 */
      }
      migratedCount += 1;
    }

    if (migratedCount > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'client.procurement_documents_migrated_to_s3',
        resourceType: 'client',
        resourceId: clientId,
        newValue: { migratedCount },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return { migratedCount };
  }
}
