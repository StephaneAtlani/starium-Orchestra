import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProcedureCategory,
  ProcedureStatus,
  ProcedureVersionLifecycle,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { ListProceduresQueryDto } from './dto/list-procedures.query.dto';
import { UpdateProcedureDraftDto } from './dto/update-procedure-draft.dto';
import {
  assertProcedureContentJson,
  EMPTY_PROCEDURE_DOC,
} from './lib/procedure-content.util';
import { ProcedureAssetsService } from './procedure-assets.service';

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

const EMPTY_DOC = EMPTY_PROCEDURE_DOC;

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

@Injectable()
export class ProceduresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly assets: ProcedureAssetsService,
  ) {}

  async list(clientId: string, query: ListProceduresQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where: Prisma.ProcedureWhereInput = { clientId };

    if (query.status) {
      where.status = query.status;
    } else if (!query.includeArchived) {
      where.status = { not: ProcedureStatus.ARCHIVED };
    }
    if (query.category) where.category = query.category;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.procedure.count({ where }),
      this.prisma.procedure.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    const ownerIds = [
      ...new Set(rows.map((r) => r.ownerUserId).filter(Boolean) as string[]),
    ];
    const owners = ownerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const ownerMap = new Map(owners.map((u) => [u.id, u]));

    const publishedIds = rows
      .map((r) => r.currentPublishedVersionId)
      .filter(Boolean) as string[];
    const publishedVersions = publishedIds.length
      ? await this.prisma.procedureVersion.findMany({
          where: { id: { in: publishedIds }, clientId },
          select: {
            id: true,
            versionNumber: true,
            publishedAt: true,
          },
        })
      : [];
    const publishedMap = new Map(publishedVersions.map((v) => [v.id, v]));

    return {
      items: rows.map((row) => this.toListItem(row, ownerMap, publishedMap)),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string) {
    const row = await this.prisma.procedure.findFirst({
      where: { id, clientId },
    });
    if (!row) throw new NotFoundException('Procédure introuvable');

    const draft = row.currentDraftVersionId
      ? await this.prisma.procedureVersion.findFirst({
          where: { id: row.currentDraftVersionId, clientId, procedureId: id },
        })
      : null;

    const owner = row.ownerUserId
      ? await this.prisma.user.findFirst({
          where: { id: row.ownerUserId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : null;

    return {
      ...this.toDetail(row, owner),
      currentDraft: draft
        ? {
            id: draft.id,
            versionNumber: draft.versionNumber,
            lifecycle: draft.lifecycle,
            title: draft.title,
            contentJson: draft.contentJson,
            updatedAt: draft.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async updateDraft(
    clientId: string,
    id: string,
    dto: UpdateProcedureDraftDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id, clientId },
    });
    if (!procedure) throw new NotFoundException('Procédure introuvable');
    if (procedure.status === ProcedureStatus.ARCHIVED) {
      throw new BadRequestException(
        'Procédure archivée — désarchiver pour modifier le contenu',
      );
    }
    if (!procedure.currentDraftVersionId) {
      throw new BadRequestException('Aucun brouillon courant');
    }
    if (dto.expectedUpdatedAt) {
      const expected = new Date(dto.expectedUpdatedAt).getTime();
      if (procedure.updatedAt.getTime() !== expected) {
        throw new ConflictException(
          'La procédure a été modifiée entre-temps — rechargez puis réessayez',
        );
      }
    }

    const contentJson = assertProcedureContentJson(dto.contentJson);
    await this.assets.assertAssetsBelongToProcedure(clientId, id, contentJson);

    const draft = await this.prisma.procedureVersion.findFirst({
      where: {
        id: procedure.currentDraftVersionId,
        clientId,
        procedureId: id,
        lifecycle: ProcedureVersionLifecycle.DRAFT,
      },
    });
    if (!draft) throw new NotFoundException('Brouillon introuvable');

    await this.prisma.$transaction([
      this.prisma.procedureVersion.update({
        where: { id: draft.id },
        data: { contentJson: contentJson as Prisma.InputJsonValue },
      }),
      this.prisma.procedure.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.draft.updated',
      resourceType: 'procedure',
      resourceId: id,
      newValue: {
        versionId: draft.id,
        versionNumber: draft.versionNumber,
        contentBytes: JSON.stringify(contentJson).length,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  async create(
    clientId: string,
    dto: CreateProcedureDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const code = normalizeCode(dto.code);
    const title = dto.title.trim();
    if (!code || !title) {
      throw new BadRequestException('Code et titre sont obligatoires');
    }

    if (dto.ownerUserId) {
      await this.ensureOwnerInClient(clientId, dto.ownerUserId);
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const procedure = await tx.procedure.create({
          data: {
            clientId,
            code,
            title,
            description: dto.description?.trim() || null,
            category: dto.category ?? ProcedureCategory.OTHER,
            status: ProcedureStatus.DRAFT,
            ownerUserId: dto.ownerUserId || null,
            createdByUserId: actorUserId ?? null,
          },
        });

        const version = await tx.procedureVersion.create({
          data: {
            clientId,
            procedureId: procedure.id,
            versionNumber: 1,
            lifecycle: ProcedureVersionLifecycle.DRAFT,
            title,
            contentJson: EMPTY_DOC,
          },
        });

        return tx.procedure.update({
          where: { id: procedure.id },
          data: { currentDraftVersionId: version.id },
        });
      });

      await this.auditLogs.create({
        clientId,
        userId: actorUserId,
        action: 'procedure.created',
        resourceType: 'procedure',
        resourceId: created.id,
        newValue: {
          code: created.code,
          title: created.title,
          status: created.status,
          category: created.category,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });

      return this.getById(clientId, created.id);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'Une procédure avec ce code existe déjà pour ce client',
        );
      }
      throw error;
    }
  }

  async archive(
    clientId: string,
    id: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.procedure.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Procédure introuvable');
    if (existing.status === ProcedureStatus.ARCHIVED) {
      return this.getById(clientId, id);
    }

    const updated = await this.prisma.procedure.update({
      where: { id },
      data: {
        statusBeforeArchive: existing.status,
        status: ProcedureStatus.ARCHIVED,
        archivedAt: new Date(),
        archivedByUserId: actorUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.archived',
      resourceType: 'procedure',
      resourceId: updated.id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  async unarchive(
    clientId: string,
    id: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.procedure.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Procédure introuvable');
    if (existing.status !== ProcedureStatus.ARCHIVED) {
      return this.getById(clientId, id);
    }

    const restoreStatus =
      existing.statusBeforeArchive === ProcedureStatus.PUBLISHED
        ? ProcedureStatus.PUBLISHED
        : ProcedureStatus.DRAFT;

    const updated = await this.prisma.procedure.update({
      where: { id },
      data: {
        status: restoreStatus,
        statusBeforeArchive: null,
        archivedAt: null,
        archivedByUserId: null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.unarchived',
      resourceType: 'procedure',
      resourceId: updated.id,
      oldValue: { status: ProcedureStatus.ARCHIVED },
      newValue: { status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  private async ensureOwnerInClient(clientId: string, userId: string) {
    const membership = await this.prisma.clientUser.findFirst({
      where: { clientId, userId },
      select: { id: true },
    });
    if (!membership) {
      throw new NotFoundException(
        'Propriétaire introuvable dans le client actif',
      );
    }
  }

  private ownerLabel(owner: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null): string | null {
    if (!owner) return null;
    const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
    return name || owner.email;
  }

  private toListItem(
    row: {
      id: string;
      code: string;
      title: string;
      description: string | null;
      category: ProcedureCategory;
      status: ProcedureStatus;
      ownerUserId: string | null;
      currentPublishedVersionId: string | null;
      updatedAt: Date;
    },
    ownerMap: Map<
      string,
      { id: string; firstName: string | null; lastName: string | null; email: string }
    >,
    publishedMap: Map<
      string,
      { id: string; versionNumber: number; publishedAt: Date | null }
    >,
  ) {
    const owner = row.ownerUserId ? ownerMap.get(row.ownerUserId) ?? null : null;
    const published = row.currentPublishedVersionId
      ? publishedMap.get(row.currentPublishedVersionId) ?? null
      : null;
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      ownerLabel: this.ownerLabel(owner),
      publishedVersionNumber: published?.versionNumber ?? null,
      publishedAt: published?.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(
    row: {
      id: string;
      code: string;
      title: string;
      description: string | null;
      category: ProcedureCategory;
      status: ProcedureStatus;
      ownerUserId: string | null;
      currentDraftVersionId: string | null;
      currentPublishedVersionId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    owner: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null,
  ) {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      ownerLabel: this.ownerLabel(owner),
      currentDraftVersionId: row.currentDraftVersionId,
      currentPublishedVersionId: row.currentPublishedVersionId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
