import type { Readable } from 'node:stream';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ProcurementObjectStorageService } from '../procurement/s3/procurement-object-storage.service';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

@Injectable()
export class StrategicDirectionStrategyDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly storage: ProcurementObjectStorageService,
    private readonly strategies: StrategicDirectionStrategyService,
  ) {}

  private async assertStrategyInScope(clientId: string, strategyId: string) {
    const strategy = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id: strategyId, clientId },
      select: { id: true, status: true, directionId: true },
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');
    return strategy;
  }

  async list(clientId: string, strategyId: string, userId?: string) {
    if (!userId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.assertStrategyInScope(clientId, strategyId);
    return this.prisma.strategicDirectionStrategyDocument.findMany({
      where: {
        clientId,
        strategyId,
        status: { not: 'DELETED' },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        name: true,
        originalFilename: true,
        mimeType: true,
        extension: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async upload(
    clientId: string,
    strategyId: string,
    file: Express.Multer.File | undefined,
    context: AuditContext,
  ) {
    if (!context.actorUserId) {
      throw new ForbiddenException('Contexte utilisateur manquant');
    }
    const strategy = await this.assertStrategyInScope(clientId, strategyId);
    await this.strategies.assertActorCanWriteStrategy(
      clientId,
      context.actorUserId,
      strategy.directionId,
      'update',
    );
    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException('Fichier requis');
    }

    const mime = (file.mimetype ?? '').toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      throw new UnprocessableEntityException(
        'Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WebP, GIF, PDF.',
      );
    }
    const ext = MIME_TO_EXT[mime] ?? '.bin';
    const originalFilename = (file.originalname ?? 'document').slice(0, 300);
    const name =
      originalFilename.replace(/\.[^.]+$/, '') || 'Document schéma directeur';

    const stored = await this.storage.putObject({
      clientId,
      domain: 'strategie',
      body: file.buffer,
      contentType: mime,
      extension: ext,
    });

    const created = await this.prisma.strategicDirectionStrategyDocument.create({
      data: {
        clientId,
        strategyId,
        name,
        originalFilename,
        mimeType: mime,
        extension: ext.replace(/^\./, ''),
        sizeBytes: file.size ?? file.buffer.length,
        status: 'ACTIVE',
        storageType: 'STARIUM',
        storageBucket: stored.bucket,
        storageKey: stored.objectKey,
        uploadedByUserId: context.actorUserId,
      },
      select: {
        id: true,
        name: true,
        originalFilename: true,
        mimeType: true,
        extension: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context.actorUserId,
      action: 'strategic_direction_strategy.document_uploaded',
      resourceType: 'strategic_direction_strategy_document',
      resourceId: created.id,
      newValue: {
        strategyId,
        name: created.name,
        mimeType: created.mimeType,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return created;
  }

  async getDownloadStream(
    clientId: string,
    strategyId: string,
    documentId: string,
    userId?: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    if (!userId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.assertStrategyInScope(clientId, strategyId);

    const doc = await this.prisma.strategicDirectionStrategyDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        strategyId,
        status: { not: 'DELETED' },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.storageType !== 'STARIUM' || !doc.storageKey) {
      throw new UnprocessableEntityException(
        'Téléchargement disponible uniquement pour les fichiers stockés dans Starium.',
      );
    }

    const { stream, contentType } = await this.storage.getObjectStream(
      doc.storageBucket!,
      doc.storageKey,
    );
    const filename = (
      doc.originalFilename?.trim() ||
      doc.name?.trim() ||
      'document'
    ).slice(0, 200);

    return {
      stream,
      contentType: doc.mimeType || contentType || 'application/octet-stream',
      filename,
    };
  }
}
