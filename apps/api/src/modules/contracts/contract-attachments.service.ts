import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Readable } from 'node:stream';
import {
  ContractAttachmentCategory,
  ProcurementAttachmentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformUploadSettingsService } from '../platform-upload/platform-upload-settings.service';
import { ProcurementObjectStorageService } from '../procurement/s3/procurement-object-storage.service';
import {
  ALLOWED_PROCUREMENT_ATTACHMENT_MIME,
  MIME_TO_EXT,
} from '../procurement/attachments/procurement-attachments.constants';
import type { ContractsAuditContext } from './contracts.service';
import type { UploadContractAttachmentFieldsDto } from './dto/upload-contract-attachment-fields.dto';
import { AccessControlService } from '../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';

export interface ContractAttachmentPublic {
  id: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  category: ContractAttachmentCategory;
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

function toPublic(row: {
  id: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  category: ContractAttachmentCategory;
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
}): ContractAttachmentPublic {
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
export class ContractAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ProcurementObjectStorageService,
    private readonly auditLogs: AuditLogsService,
    private readonly platformUpload: PlatformUploadSettingsService,
    private readonly accessControl: Pick<
      AccessControlService,
      'canReadResource' | 'canWriteResource' | 'canAdminResource'
    > = {
      canReadResource: async () => true,
      canWriteResource: async () => true,
      canAdminResource: async () => true,
    },
  ) {}

  private async loadParentContractForAcl(
    clientId: string,
    supplierContractId: string,
    userId: string,
    operation: 'read' | 'write' | 'admin',
  ): Promise<void> {
    const parent = await this.prisma.supplierContract.findFirst({
      where: { id: supplierContractId, clientId },
      select: { id: true },
    });
    if (!parent) {
      throw new NotFoundException('Contrat introuvable');
    }
    const allowed =
      operation === 'read'
        ? await this.accessControl.canReadResource({
            clientId,
            userId,
            resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
            resourceId: supplierContractId,
          })
        : operation === 'write'
          ? await this.accessControl.canWriteResource({
              clientId,
              userId,
              resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
              resourceId: supplierContractId,
            })
          : await this.accessControl.canAdminResource({
              clientId,
              userId,
              resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.CONTRACT,
              resourceId: supplierContractId,
            });
    if (!allowed) {
      throw new ForbiddenException('Accès refusé par ACL ressource');
    }
  }

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

  async list(
    clientId: string,
    supplierContractId: string,
    userId?: string,
  ): Promise<ContractAttachmentPublic[]> {
    if (userId) {
      await this.loadParentContractForAcl(clientId, supplierContractId, userId, 'read');
    } else {
      const c = await this.prisma.supplierContract.findFirst({
        where: { id: supplierContractId, clientId },
        select: { id: true },
      });
      if (!c) throw new NotFoundException('Contrat introuvable');
    }
    const rows = await this.prisma.contractAttachment.findMany({
      where: { clientId, supplierContractId, status: 'ACTIVE' },
      include: {
        uploadedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPublic);
  }

  async create(
    clientId: string,
    supplierContractId: string,
    file: Express.Multer.File | undefined,
    fields: UploadContractAttachmentFieldsDto,
    context?: ContractsAuditContext,
  ): Promise<ContractAttachmentPublic> {
    this.assertFile(file);
    if (context?.actorUserId) {
      await this.loadParentContractForAcl(
        clientId,
        supplierContractId,
        context.actorUserId,
        'write',
      );
    }
    const mime = file!.mimetype.toLowerCase();
    const ext = MIME_TO_EXT[mime] ?? '.bin';
    const { bucket, objectKey, checksumSha256 } = await this.storage.putObject({
      clientId,
      domain: 'contrats',
      body: file!.buffer,
      contentType: mime,
      extension: ext,
    });
    const name =
      fields.name?.trim() ||
      file!.originalname?.trim() ||
      'document';
    const created = await this.prisma.contractAttachment.create({
      data: {
        clientId,
        supplierContractId,
        name,
        originalFilename: file!.originalname?.trim() ?? null,
        mimeType: mime,
        extension: ext.replace(/^\./, '') || null,
        sizeBytes: file!.size,
        category: fields.category ?? ContractAttachmentCategory.OTHER,
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
      action: 'contract_attachment.uploaded',
      resourceType: 'contract_attachment',
      resourceId: created.id,
      newValue: {
        supplierContractId,
        name: created.name,
        category: created.category,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toPublic(created);
  }

  async getDownloadStream(
    clientId: string,
    supplierContractId: string,
    attachmentId: string,
    context?: ContractsAuditContext,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    if (context?.actorUserId) {
      await this.loadParentContractForAcl(
        clientId,
        supplierContractId,
        context.actorUserId,
        'read',
      );
    }
    const row = await this.prisma.contractAttachment.findFirst({
      where: {
        id: attachmentId,
        clientId,
        supplierContractId,
        status: ProcurementAttachmentStatus.ACTIVE,
      },
    });
    if (!row) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'contract_attachment.access_denied',
        resourceType: 'contract_attachment',
        resourceId: attachmentId,
        newValue: {
          reason: 'not_found_or_wrong_parent',
          supplierContractId,
        },
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
      action: 'contract_attachment.downloaded',
      resourceType: 'contract_attachment',
      resourceId: attachmentId,
      newValue: { supplierContractId },
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

  async archive(
    clientId: string,
    supplierContractId: string,
    attachmentId: string,
    context?: ContractsAuditContext,
  ): Promise<ContractAttachmentPublic> {
    if (context?.actorUserId) {
      await this.loadParentContractForAcl(
        clientId,
        supplierContractId,
        context.actorUserId,
        'admin',
      );
    }
    const row = await this.prisma.contractAttachment.findFirst({
      where: {
        id: attachmentId,
        clientId,
        supplierContractId,
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
        action: 'contract_attachment.archive_denied',
        resourceType: 'contract_attachment',
        resourceId: attachmentId,
        newValue: { reason: 'not_found', supplierContractId },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
      throw new NotFoundException('Pièce jointe introuvable');
    }
    const updated = await this.prisma.contractAttachment.update({
      where: { id: attachmentId },
      data: {
        status: ProcurementAttachmentStatus.ARCHIVED,
        archivedAt: new Date(),
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
      action: 'contract_attachment.archived',
      resourceType: 'contract_attachment',
      resourceId: attachmentId,
      newValue: { supplierContractId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toPublic(updated);
  }
}
