import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

@Injectable()
export class ProjectDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectDocument.findMany({
      where: {
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(clientId: string, projectId: string, documentId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const doc = await this.prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
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
    await this.projects.getProjectForScope(clientId, projectId);

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

  async update(
    clientId: string,
    projectId: string,
    documentId: string,
    dto: UpdateProjectDocumentDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
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
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectDocument.findFirst({
      where: { id: documentId, clientId, projectId, status: { not: 'DELETED' } },
    });
    if (!existing) throw new NotFoundException('Project document not found');
    if (existing.status === 'ARCHIVED') return existing;

    const now = new Date();
    const updated = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: { status: 'ARCHIVED', archivedAt: now },
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
    await this.projects.getProjectForScope(clientId, projectId);
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

