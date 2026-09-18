import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProcedureVersionLifecycle } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProcurementObjectStorageService } from '../procurement/s3/procurement-object-storage.service';
import {
  ALLOWED_PROCEDURE_ASSET_MIME,
  PROCEDURE_ASSET_MIME_TO_EXT,
} from './lib/procedure-assets.constants';
import { collectProcedureAssetIds } from './lib/procedure-content.util';

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

export type ProcedureAssetPublic = {
  id: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

@Injectable()
export class ProcedureAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ProcurementObjectStorageService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async assertProcedure(clientId: string, procedureId: string) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id: procedureId, clientId },
      select: {
        id: true,
        status: true,
        currentDraftVersionId: true,
      },
    });
    if (!procedure) {
      throw new NotFoundException('Procédure introuvable');
    }
    return procedure;
  }

  async list(
    clientId: string,
    procedureId: string,
  ): Promise<ProcedureAssetPublic[]> {
    await this.assertProcedure(clientId, procedureId);
    return this.prisma.procedureAsset.findMany({
      where: { clientId, procedureId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        label: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
  }

  async upload(
    clientId: string,
    procedureId: string,
    file: Express.Multer.File | undefined,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<ProcedureAssetPublic> {
    await this.assertProcedure(clientId, procedureId);
    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException('Fichier requis');
    }

    const mime = (file.mimetype ?? '').toLowerCase();
    if (!ALLOWED_PROCEDURE_ASSET_MIME.has(mime)) {
      throw new UnprocessableEntityException(
        'Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WebP, GIF, PDF.',
      );
    }
    const ext = PROCEDURE_ASSET_MIME_TO_EXT[mime] ?? '.bin';
    const original = (file.originalname ?? 'fichier').slice(0, 300);
    const label =
      original.replace(/\.[^.]+$/, '').trim().slice(0, 200) || 'Fichier';

    const stored = await this.storage.putObject({
      clientId,
      domain: 'procedures',
      body: file.buffer,
      contentType: mime,
      extension: ext,
    });

    const created = await this.prisma.procedureAsset.create({
      data: {
        clientId,
        procedureId,
        label,
        mimeType: mime,
        sizeBytes: file.size ?? file.buffer.length,
        storageBucket: stored.bucket,
        storageKey: stored.objectKey,
        createdByUserId: actorUserId ?? null,
      },
      select: {
        id: true,
        label: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.asset.uploaded',
      resourceType: 'procedure_asset',
      resourceId: created.id,
      newValue: {
        procedureId,
        label: created.label,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return created;
  }

  async getDownloadStream(
    clientId: string,
    procedureId: string,
    assetId: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    await this.assertProcedure(clientId, procedureId);
    const asset = await this.prisma.procedureAsset.findFirst({
      where: { id: assetId, clientId, procedureId },
    });
    if (!asset) {
      throw new NotFoundException('Fichier introuvable');
    }

    const { stream, contentType } = await this.storage.getObjectStream(
      asset.storageBucket,
      asset.storageKey,
    );
    const filename = `${asset.label.slice(0, 180)}${
      PROCEDURE_ASSET_MIME_TO_EXT[asset.mimeType] ?? ''
    }`;

    return {
      stream,
      contentType: asset.mimeType || contentType || 'application/octet-stream',
      filename,
    };
  }

  async delete(
    clientId: string,
    procedureId: string,
    assetId: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ): Promise<{ ok: true }> {
    const procedure = await this.assertProcedure(clientId, procedureId);
    const asset = await this.prisma.procedureAsset.findFirst({
      where: { id: assetId, clientId, procedureId },
      select: { id: true, label: true },
    });
    if (!asset) {
      throw new NotFoundException('Fichier introuvable');
    }

    if (procedure.currentDraftVersionId) {
      const draft = await this.prisma.procedureVersion.findFirst({
        where: {
          id: procedure.currentDraftVersionId,
          clientId,
          procedureId,
          lifecycle: ProcedureVersionLifecycle.DRAFT,
        },
        select: { contentJson: true },
      });
      if (draft) {
        const refs = collectProcedureAssetIds(draft.contentJson);
        if (refs.includes(assetId)) {
          throw new BadRequestException(
            'Ce fichier est encore utilisé dans le brouillon. Retirez-le du contenu avant de le supprimer.',
          );
        }
      }
    }

    await this.prisma.procedureAsset.delete({
      where: { id: asset.id },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.asset.deleted',
      resourceType: 'procedure_asset',
      resourceId: asset.id,
      oldValue: { procedureId, label: asset.label },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return { ok: true };
  }

  /** Vérifie que tous les assetId du contentJson appartiennent à la procédure. */
  async assertAssetsBelongToProcedure(
    clientId: string,
    procedureId: string,
    contentJson: unknown,
  ): Promise<void> {
    const ids = collectProcedureAssetIds(contentJson);
    if (ids.length === 0) return;
    const found = await this.prisma.procedureAsset.findMany({
      where: { clientId, procedureId, id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException(
        'Un média référencé n’appartient pas à cette procédure',
      );
    }
  }
}
