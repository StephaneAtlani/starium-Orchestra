import type { Readable } from 'node:stream';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import {
  diffAuditSnapshots,
  projectDocumentEntityAuditSnapshot,
} from './project-audit-serialize';
import { ProjectsService } from './projects.service';
import { CreateProjectDocumentDto } from './dto/create-project-document.dto';
import { UpdateProjectDocumentDto } from './dto/update-project-document.dto';
import type { ListProjectDocumentsQueryDto } from './dto/list-project-documents-query.dto';
import type { UploadProjectDocumentFieldsDto } from './dto/upload-project-document-fields.dto';
import { ProjectDocumentContentService } from './project-document-content.service';
import {
  PROJECT_DOCUMENT_ALLOWED_MIME,
  PROJECT_DOCUMENT_LIST_TAKE,
  PROJECT_DOCUMENT_MIME_TO_EXT,
} from './project-documents.constants';

const UPLOADED_BY_INCLUDE = {
  uploadedByUser: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

@Injectable()
export class ProjectDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
    private readonly content: ProjectDocumentContentService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    userId?: string,
    query?: ListProjectDocumentsQueryDto,
  ) {
    if (!userId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanReadProject(clientId, userId, projectId);

    const where: Prisma.ProjectDocumentWhereInput = {
      clientId,
      projectId,
    };

    if (query?.status) {
      where.status = query.status;
    } else {
      where.status = { not: 'DELETED' };
    }

    if (query?.category) where.category = query.category;
    if (query?.storageType) where.storageType = query.storageType;

    const and: Prisma.ProjectDocumentWhereInput[] = [];

    if (query?.extension?.trim()) {
      const ext = query.extension.trim().replace(/^\./, '').toLowerCase();
      and.push({
        OR: [
          { extension: { equals: ext, mode: 'insensitive' } },
          { extension: { equals: `.${ext}`, mode: 'insensitive' } },
        ],
      });
    }

    const search = query?.search?.trim();
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { originalFilename: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (and.length > 0) where.AND = and;

    const orderBy: Prisma.ProjectDocumentOrderByWithRelationInput[] =
      query?.sort === 'name:asc'
        ? [{ name: 'asc' }, { updatedAt: 'desc' }]
        : [{ updatedAt: 'desc' }, { createdAt: 'desc' }];

    const take = Math.min(
      query?.take ?? PROJECT_DOCUMENT_LIST_TAKE,
      PROJECT_DOCUMENT_LIST_TAKE,
    );

    return this.prisma.projectDocument.findMany({
      where,
      orderBy,
      take,
      include: UPLOADED_BY_INCLUDE,
    });
  }

  async getOne(clientId: string, projectId: string, documentId: string, userId?: string) {
    if (!userId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanReadProject(clientId, userId, projectId);
    const doc = await this.prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
      include: UPLOADED_BY_INCLUDE,
    });
    if (!doc) throw new NotFoundException('Project document not found');
    return doc;
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectDocumentDto,
    context?: AuditContext,
  ) {
    if (!context?.actorUserId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanWriteProject(clientId, context.actorUserId, projectId);

    if (dto.storageType !== 'STARIUM' && dto.storageType !== 'EXTERNAL') {
      throw new BadRequestException('Unsupported storageType for MVP');
    }
    if (dto.storageType === 'STARIUM' && !dto.storageKey?.trim()) {
      throw new BadRequestException('storageKey is required for STARIUM');
    }
    if (dto.storageType === 'EXTERNAL' && !dto.externalUrl?.trim()) {
      throw new BadRequestException('externalUrl is required for EXTERNAL');
    }

    const created = await this.prisma.projectDocument.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        originalFilename: dto.originalFilename?.trim() ?? null,
        mimeType: dto.mimeType?.trim() ?? null,
        extension: dto.extension?.trim() ?? null,
        sizeBytes: dto.sizeBytes ?? null,
        category: dto.category ?? 'GENERAL',
        status: 'ACTIVE',
        storageType: dto.storageType,
        storageKey: dto.storageType === 'STARIUM' ? dto.storageKey!.trim() : null,
        externalUrl: dto.storageType === 'EXTERNAL' ? dto.externalUrl!.trim() : null,
        description: dto.description?.trim() ?? null,
        ...(dto.tags !== undefined && { tags: dto.tags as Prisma.InputJsonValue }),
        uploadedByUserId: context?.actorUserId ?? null,
      },
      include: UPLOADED_BY_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_DOCUMENT,
      resourceId: created.id,
      newValue: projectDocumentEntityAuditSnapshot(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return created;
  }

  async upload(
    clientId: string,
    projectId: string,
    file: Express.Multer.File | undefined,
    fields: UploadProjectDocumentFieldsDto,
    context?: AuditContext,
  ) {
    if (!context?.actorUserId) throw new ForbiddenException('Contexte utilisateur manquant');
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fichier requis');
    }
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanWriteProject(clientId, context.actorUserId, projectId);

    const mime = (file.mimetype ?? '').toLowerCase();
    if (!PROJECT_DOCUMENT_ALLOWED_MIME.has(mime)) {
      throw new UnprocessableEntityException(
        'Type de fichier non autorisé. Formats acceptés : PDF, Office, images, texte, CSV, ZIP.',
      );
    }
    const ext = PROJECT_DOCUMENT_MIME_TO_EXT[mime] ?? '.bin';
    const originalFilename = (file.originalname ?? 'document').slice(0, 300);
    const name =
      fields.name?.trim() ||
      originalFilename.replace(/\.[^.]+$/, '') ||
      'Document';

    const stored = await this.content.writeStariumObject({
      clientId,
      body: file.buffer,
      contentType: mime,
      extension: ext,
    });

    const created = await this.prisma.projectDocument.create({
      data: {
        clientId,
        projectId,
        name,
        originalFilename,
        mimeType: mime,
        extension: ext.replace(/^\./, ''),
        sizeBytes: file.size ?? file.buffer.length,
        category: fields.category ?? 'GENERAL',
        status: 'ACTIVE',
        storageType: 'STARIUM',
        storageBucket: stored.storageBucket,
        storageKey: stored.storageKey,
        externalUrl: null,
        description: fields.description?.trim() ?? null,
        uploadedByUserId: context.actorUserId,
      },
      include: UPLOADED_BY_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId: context.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_DOCUMENT,
      resourceId: created.id,
      newValue: {
        ...projectDocumentEntityAuditSnapshot(created),
        via: 'upload',
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return created;
  }

  async getDownloadStream(
    clientId: string,
    projectId: string,
    documentId: string,
    userId?: string,
  ): Promise<{ stream: Readable; contentType: string; filename: string }> {
    if (!userId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanReadProject(clientId, userId, projectId);

    const doc = await this.prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
    });
    if (!doc) throw new NotFoundException('Project document not found');

    if (doc.storageType !== 'STARIUM' || !doc.storageKey) {
      throw new UnprocessableEntityException(
        'Téléchargement disponible uniquement pour les fichiers stockés dans Starium. Ouvrez le lien externe depuis l’interface.',
      );
    }

    const { stream, contentType } = await this.content.openStariumReadStream(
      doc.storageBucket,
      doc.storageKey,
    );
    const filename =
      (doc.originalFilename?.trim() || doc.name?.trim() || 'document').slice(0, 200);

    return {
      stream,
      contentType: doc.mimeType || contentType || 'application/octet-stream',
      filename,
    };
  }

  async update(
    clientId: string,
    projectId: string,
    documentId: string,
    dto: UpdateProjectDocumentDto,
    context?: AuditContext,
  ) {
    if (!context?.actorUserId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanWriteProject(clientId, context.actorUserId, projectId);
    const existing = await this.prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
      include: UPLOADED_BY_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Project document not found');

    const data: Prisma.ProjectDocumentUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.tags !== undefined) data.tags = dto.tags as Prisma.InputJsonValue;

    if (Object.keys(data).length === 0) {
      return existing;
    }

    const updated = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data,
      include: UPLOADED_BY_INCLUDE,
    });

    const oldSnap = projectDocumentEntityAuditSnapshot(existing);
    const newSnap = projectDocumentEntityAuditSnapshot(updated);
    const { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_DOCUMENT,
        resourceId: documentId,
        oldValue,
        newValue,
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return updated;
  }

  async archive(
    clientId: string,
    projectId: string,
    documentId: string,
    context?: AuditContext,
  ) {
    if (!context?.actorUserId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanWriteProject(clientId, context.actorUserId, projectId);
    const existing = await this.prisma.projectDocument.findFirst({
      where: { id: documentId, clientId, projectId, status: { not: 'DELETED' } },
      include: UPLOADED_BY_INCLUDE,
    });
    if (!existing) throw new NotFoundException('Project document not found');
    if (existing.status === 'ARCHIVED') return existing;

    const now = new Date();
    const updated = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: { status: 'ARCHIVED', archivedAt: now },
      include: UPLOADED_BY_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_ARCHIVED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_DOCUMENT,
      resourceId: documentId,
      oldValue: { status: existing.status, archivedAt: existing.archivedAt?.toISOString() ?? null },
      newValue: { status: updated.status, archivedAt: updated.archivedAt?.toISOString() ?? null },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return updated;
  }

  async delete(
    clientId: string,
    projectId: string,
    documentId: string,
    context?: AuditContext,
  ) {
    if (!context?.actorUserId) throw new ForbiddenException('Contexte utilisateur manquant');
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertCanWriteProject(clientId, context.actorUserId, projectId);
    const existing = await this.prisma.projectDocument.findFirst({
      where: { id: documentId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Project document not found');
    if (existing.status === 'DELETED') return;

    const now = new Date();
    const updated = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: { status: 'DELETED', deletedAt: now },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_DOCUMENT,
      resourceId: documentId,
      oldValue: projectDocumentEntityAuditSnapshot(existing),
      newValue: { status: updated.status, deletedAt: updated.deletedAt?.toISOString() ?? null },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
