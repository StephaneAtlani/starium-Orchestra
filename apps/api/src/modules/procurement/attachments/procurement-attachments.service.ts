import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Readable } from 'node:stream';
import {
  ProcurementAttachmentCategory,
  ProcurementAttachmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PlatformUploadSettingsService } from '../../platform-upload/platform-upload-settings.service';
import { ProcurementObjectStorageService } from '../s3/procurement-object-storage.service';
import type { ProcurementAuditContext } from '../suppliers/suppliers.service';
import {
  ALLOWED_PROCUREMENT_ATTACHMENT_MIME,
  MIME_TO_EXT,
} from './procurement-attachments.constants';
import type { UploadProcurementAttachmentFieldsDto } from './dto/upload-procurement-attachment-fields.dto';

export interface ProcurementAttachmentPublic {
  id: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  category: ProcurementAttachmentCategory;
  status: ProcurementAttachmentStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  uploadedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

function toPublic(
  row: {
    id: string;
    name: string;
    originalFilename: string | null;
    mimeType: string | null;
    extension: string | null;
    sizeBytes: number | null;
    category: ProcurementAttachmentCategory;
    status: ProcurementAttachmentStatus;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    uploadedByUser: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  },
): ProcurementAttachmentPublic {
  return {
    id: row.id,
    name: row.name,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    extension: row.extension,
    sizeBytes: row.sizeBytes,
    category: row.category,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    uploadedBy: row.uploadedByUser
      ? {
          id: row.uploadedByUser.id,
          firstName: row.uploadedByUser.firstName,
          lastName: row.uploadedByUser.lastName,
          email: row.uploadedByUser.email,
        }
      : null,
  };
}

@Injectable()
export class ProcurementAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ProcurementObjectStorageService,
    private readonly auditLogs: AuditLogsService,
    private readonly platformUpload: PlatformUploadSettingsService,
  ) {}

  private assertFile(file: Express.Multer.File | undefined): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fichier requis');
    }
    const maxBytes = this.platformUpload.getEffectiveMaxBytes();
    if (file.size > maxBytes) {
      const mb = (maxBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
      throw new BadRequestException(
        `Fichier trop volumineux (maximum ${mb} Mo, réglage plateforme).`,
      );
    }
    const mime = file.mimetype?.toLowerCase() ?? '';
    if (!ALLOWED_PROCUREMENT_ATTACHMENT_MIME.has(mime)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }
  }

  async listForPurchaseOrder(
    clientId: string,
    purchaseOrderId: string,
  ): Promise<ProcurementAttachmentPublic[]> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, clientId },
      select: { id: true },
    });
    if (!po) {
      throw new NotFoundException('Commande introuvable');
    }
    const rows = await this.prisma.procurementAttachment.findMany({
      where: { clientId, purchaseOrderId, status: 'ACTIVE' },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPublic);
  }

  async listForInvoice(
    clientId: string,
    invoiceId: string,
  ): Promise<ProcurementAttachmentPublic[]> {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, clientId },
      select: { id: true },
    });
    if (!inv) {
      throw new NotFoundException('Facture introuvable');
    }
    const rows = await this.prisma.procurementAttachment.findMany({
      where: { clientId, invoiceId, status: 'ACTIVE' },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPublic);
  }

  async createForPurchaseOrder(
    clientId: string,
    purchaseOrderId: string,
    file: Express.Multer.File | undefined,
    fields: UploadProcurementAttachmentFieldsDto,
    context?: ProcurementAuditContext,
  ): Promise<ProcurementAttachmentPublic> {
    this.assertFile(file);
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, clientId },
      select: { id: true },
    });
    if (!po) {
      throw new NotFoundException('Commande introuvable');
    }
    const mime = file!.mimetype.toLowerCase();
    const ext = MIME_TO_EXT[mime] ?? '.bin';
    const { bucket, objectKey, checksumSha256 } = await this.storage.putObject({
      clientId,
      domain: 'commandes',
      body: file!.buffer,
      contentType: mime,
      extension: ext,
    });
    const name =
      fields.name?.trim() ||
      file!.originalname?.trim() ||
      'document';
    const created = await this.prisma.procurementAttachment.create({
      data: {
        clientId,
        purchaseOrderId,
        invoiceId: null,
        name,
        originalFilename: file!.originalname?.trim() ?? null,
        mimeType: mime,
        extension: ext.replace(/^\./, '') || null,
        sizeBytes: file!.size,
        category: fields.category ?? ProcurementAttachmentCategory.OTHER,
        status: ProcurementAttachmentStatus.ACTIVE,
        storageType: 'STARIUM',
        storageBucket: bucket,
        objectKey,
        checksumSha256,
        uploadedByUserId: context?.actorUserId ?? null,
      },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'procurement_attachment.uploaded',
      resourceType: 'procurement_attachment',
      resourceId: created.id,
      newValue: {
        parent: 'purchase_order',
        purchaseOrderId,
        name: created.name,
        category: created.category,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toPublic(created);
  }

  async createForInvoice(
    clientId: string,
    invoiceId: string,
    file: Express.Multer.File | undefined,
    fields: UploadProcurementAttachmentFieldsDto,
    context?: ProcurementAuditContext,
  ): Promise<ProcurementAttachmentPublic> {
    this.assertFile(file);
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, clientId },
      select: { id: true },
    });
    if (!inv) {
      throw new NotFoundException('Facture introuvable');
    }
    const mime = file!.mimetype.toLowerCase();
    const ext = MIME_TO_EXT[mime] ?? '.bin';
    const { bucket, objectKey, checksumSha256 } = await this.storage.putObject({
      clientId,
      domain: 'factures',
      body: file!.buffer,
      contentType: mime,
      extension: ext,
    });
    const name =
      fields.name?.trim() ||
      file!.originalname?.trim() ||
      'document';
    const created = await this.prisma.procurementAttachment.create({
      data: {
        clientId,
        invoiceId,
        purchaseOrderId: null,
        name,
        originalFilename: file!.originalname?.trim() ?? null,
        mimeType: mime,
        extension: ext.replace(/^\./, '') || null,
        sizeBytes: file!.size,
        category: fields.category ?? ProcurementAttachmentCategory.OTHER,
        status: ProcurementAttachmentStatus.ACTIVE,
        storageType: 'STARIUM',
        storageBucket: bucket,
        objectKey,
        checksumSha256,
        uploadedByUserId: context?.actorUserId ?? null,
      },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'procurement_attachment.uploaded',
      resourceType: 'procurement_attachment',
      resourceId: created.id,
      newValue: {
        parent: 'invoice',
        invoiceId,
        name: created.name,
        category: created.category,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toPublic(created);
  }

  async getDownloadStreamForPurchaseOrder(
    clientId: string,
    purchaseOrderId: string,
    attachmentId: string,
    context?: ProcurementAuditContext,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    const row = await this.prisma.procurementAttachment.findFirst({
      where: {
        id: attachmentId,
        clientId,
        purchaseOrderId,
        status: ProcurementAttachmentStatus.ACTIVE,
      },
    });
    if (!row) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'procurement_attachment.access_denied',
        resourceType: 'procurement_attachment',
        resourceId: attachmentId,
        newValue: { reason: 'not_found_or_wrong_parent', parent: 'purchase_order' },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      throw new NotFoundException('Pièce jointe introuvable');
    }
    const { stream, contentType } = await this.storage.getObjectStream(
      row.storageBucket,
      row.objectKey,
    );
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'procurement_attachment.downloaded',
      resourceType: 'procurement_attachment',
      resourceId: attachmentId,
      newValue: { parent: 'purchase_order', purchaseOrderId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    const filename =
      row.originalFilename?.trim() ||
      `${row.name}${row.extension ? `.${row.extension}` : ''}`;
    return {
      stream,
      contentType: contentType || row.mimeType || 'application/octet-stream',
      filename,
    };
  }

  async getDownloadStreamForInvoice(
    clientId: string,
    invoiceId: string,
    attachmentId: string,
    context?: ProcurementAuditContext,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    const row = await this.prisma.procurementAttachment.findFirst({
      where: {
        id: attachmentId,
        clientId,
        invoiceId,
        status: ProcurementAttachmentStatus.ACTIVE,
      },
    });
    if (!row) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'procurement_attachment.access_denied',
        resourceType: 'procurement_attachment',
        resourceId: attachmentId,
        newValue: { reason: 'not_found_or_wrong_parent', parent: 'invoice' },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      throw new NotFoundException('Pièce jointe introuvable');
    }
    const { stream, contentType } = await this.storage.getObjectStream(
      row.storageBucket,
      row.objectKey,
    );
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'procurement_attachment.downloaded',
      resourceType: 'procurement_attachment',
      resourceId: attachmentId,
      newValue: { parent: 'invoice', invoiceId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    const filename =
      row.originalFilename?.trim() ||
      `${row.name}${row.extension ? `.${row.extension}` : ''}`;
    return {
      stream,
      contentType: contentType || row.mimeType || 'application/octet-stream',
      filename,
    };
  }

  async archiveForPurchaseOrder(
    clientId: string,
    purchaseOrderId: string,
    attachmentId: string,
    context?: ProcurementAuditContext,
  ): Promise<ProcurementAttachmentPublic> {
    const row = await this.prisma.procurementAttachment.findFirst({
      where: {
        id: attachmentId,
        clientId,
        purchaseOrderId,
        status: ProcurementAttachmentStatus.ACTIVE,
      },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!row) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'procurement_attachment.archive_denied',
        resourceType: 'procurement_attachment',
        resourceId: attachmentId,
        newValue: { reason: 'not_found', parent: 'purchase_order' },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      throw new NotFoundException('Pièce jointe introuvable');
    }
    const updated = await this.prisma.procurementAttachment.update({
      where: { id: attachmentId },
      data: { status: ProcurementAttachmentStatus.ARCHIVED, archivedAt: new Date() },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'procurement_attachment.archived',
      resourceType: 'procurement_attachment',
      resourceId: attachmentId,
      newValue: { parent: 'purchase_order', purchaseOrderId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toPublic(updated);
  }

  async archiveForInvoice(
    clientId: string,
    invoiceId: string,
    attachmentId: string,
    context?: ProcurementAuditContext,
  ): Promise<ProcurementAttachmentPublic> {
    const row = await this.prisma.procurementAttachment.findFirst({
      where: {
        id: attachmentId,
        clientId,
        invoiceId,
        status: ProcurementAttachmentStatus.ACTIVE,
      },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!row) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'procurement_attachment.archive_denied',
        resourceType: 'procurement_attachment',
        resourceId: attachmentId,
        newValue: { reason: 'not_found', parent: 'invoice' },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      throw new NotFoundException('Pièce jointe introuvable');
    }
    const updated = await this.prisma.procurementAttachment.update({
      where: { id: attachmentId },
      data: { status: ProcurementAttachmentStatus.ARCHIVED, archivedAt: new Date() },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'procurement_attachment.archived',
      resourceType: 'procurement_attachment',
      resourceId: attachmentId,
      newValue: { parent: 'invoice', invoiceId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toPublic(updated);
  }
}
