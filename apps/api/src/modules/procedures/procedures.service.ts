import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProcedureStatus,
  ProcedureVersionBumpType,
  ProcedureVersionLifecycle,
  ClientUserRole,
  ClientUserStatus,
  PlatformRole,
} from '@prisma/client';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { ListProceduresQueryDto } from './dto/list-procedures.query.dto';
import { TransitionProcedureDto } from './dto/transition-procedure.dto';
import { UpdateProcedureDraftDto } from './dto/update-procedure-draft.dto';
import {
  assertProcedureContentJson,
  countProcedureBlocks,
  EMPTY_PROCEDURE_DOC,
  isProcedureContentEmpty,
} from './lib/procedure-content.util';
import { personDisplayLabel } from './lib/procedure-display.util';
import {
  formatProcedureVersionLabel,
  resolveNextProcedureVersion,
} from './lib/procedure-version.util';
import { ProcedureAssetsService } from './procedure-assets.service';
import { ProcedureCategoriesService } from './procedure-categories.service';
import { ProcedureSettingsService } from './procedure-settings.service';

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

type CategoryRef = { id: string; code: string; label: string };

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
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly categories: ProcedureCategoriesService,
    private readonly settings: ProcedureSettingsService,
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
    if (query.categoryId) where.categoryId = query.categoryId;
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
        include: {
          category: { select: { id: true, code: true, label: true } },
        },
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
            versionMajor: true,
            versionMinor: true,
            bumpType: true,
            publishedAt: true,
            contentJson: true,
          },
        })
      : [];
    const publishedMap = new Map(publishedVersions.map((v) => [v.id, v]));

    const draftIds = rows
      .map((r) => r.currentDraftVersionId)
      .filter(Boolean) as string[];
    const draftVersions = draftIds.length
      ? await this.prisma.procedureVersion.findMany({
          where: { id: { in: draftIds }, clientId },
          select: { id: true, contentJson: true },
        })
      : [];
    const draftMap = new Map(draftVersions.map((v) => [v.id, v]));

    return {
      items: rows.map((row) =>
        this.toListItem(row, ownerMap, publishedMap, draftMap),
      ),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string) {
    const row = await this.prisma.procedure.findFirst({
      where: { id, clientId },
      include: {
        category: { select: { id: true, code: true, label: true } },
      },
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

    const published = row.currentPublishedVersionId
      ? await this.prisma.procedureVersion.findFirst({
          where: {
            id: row.currentPublishedVersionId,
            clientId,
            procedureId: id,
            lifecycle: ProcedureVersionLifecycle.PUBLISHED,
          },
        })
      : null;

    return {
      ...this.toDetail(row, owner, row.category),
      publishedVersion: published
        ? this.toPublishedVersionSummary(published, row.currentPublishedVersionId)
        : null,
      currentDraft: draft
        ? {
            id: draft.id,
            lifecycle: draft.lifecycle,
            title: draft.title,
            contentJson: draft.contentJson,
            updatedAt: draft.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async listVersions(clientId: string, procedureId: string) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id: procedureId, clientId },
      select: { id: true, currentPublishedVersionId: true },
    });
    if (!procedure) throw new NotFoundException('Procédure introuvable');

    const rows = await this.prisma.procedureVersion.findMany({
      where: {
        clientId,
        procedureId,
        lifecycle: ProcedureVersionLifecycle.PUBLISHED,
      },
      orderBy: [{ versionMajor: 'desc' }, { versionMinor: 'desc' }],
    });

    const publisherIds = [
      ...new Set(
        rows
          .map((r) => r.publishedByUserId)
          .filter(Boolean) as string[],
      ),
    ];
    const publishers = publisherIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: publisherIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const publisherMap = new Map(publishers.map((u) => [u.id, u]));

    return {
      items: rows.map((row) => {
        const publisher = row.publishedByUserId
          ? publisherMap.get(row.publishedByUserId) ?? null
          : null;
        return {
          id: row.id,
          versionLabel: formatProcedureVersionLabel(
            row.versionMajor,
            row.versionMinor,
          ),
          versionMajor: row.versionMajor,
          versionMinor: row.versionMinor,
          bumpType: row.bumpType,
          isMajor: row.bumpType === ProcedureVersionBumpType.MAJOR,
          isCurrent: row.id === procedure.currentPublishedVersionId,
          changeSummary: row.changeSummary,
          publishedAt: row.publishedAt?.toISOString() ?? null,
          publishedByLabel: this.ownerLabel(publisher),
          title: row.title,
        };
      }),
    };
  }

  async getVersion(clientId: string, procedureId: string, versionId: string) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id: procedureId, clientId },
      select: { id: true, currentPublishedVersionId: true },
    });
    if (!procedure) throw new NotFoundException('Procédure introuvable');

    const row = await this.prisma.procedureVersion.findFirst({
      where: {
        id: versionId,
        clientId,
        procedureId,
        lifecycle: ProcedureVersionLifecycle.PUBLISHED,
      },
    });
    if (!row) throw new NotFoundException('Version introuvable');

    const publisher = row.publishedByUserId
      ? await this.prisma.user.findFirst({
          where: { id: row.publishedByUserId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : null;

    return {
      id: row.id,
      versionLabel: formatProcedureVersionLabel(
        row.versionMajor,
        row.versionMinor,
      ),
      versionMajor: row.versionMajor,
      versionMinor: row.versionMinor,
      bumpType: row.bumpType,
      isMajor: row.bumpType === ProcedureVersionBumpType.MAJOR,
      isCurrent: row.id === procedure.currentPublishedVersionId,
      changeSummary: row.changeSummary,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publishedByLabel: this.ownerLabel(publisher),
      title: row.title,
      contentJson: row.contentJson,
    };
  }

  async restoreVersionToDraft(
    clientId: string,
    procedureId: string,
    versionId: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id: procedureId, clientId },
    });
    if (!procedure) throw new NotFoundException('Procédure introuvable');
    if (procedure.status === ProcedureStatus.ARCHIVED) {
      throw new BadRequestException(
        'Procédure archivée — désarchiver pour restaurer une version',
      );
    }
    if (!procedure.currentDraftVersionId) {
      throw new BadRequestException('Aucun brouillon courant');
    }

    const source = await this.prisma.procedureVersion.findFirst({
      where: {
        id: versionId,
        clientId,
        procedureId,
        lifecycle: ProcedureVersionLifecycle.PUBLISHED,
      },
    });
    if (!source) throw new NotFoundException('Version introuvable');

    const draft = await this.prisma.procedureVersion.findFirst({
      where: {
        id: procedure.currentDraftVersionId,
        clientId,
        procedureId,
        lifecycle: ProcedureVersionLifecycle.DRAFT,
      },
    });
    if (!draft) throw new NotFoundException('Brouillon introuvable');

    await this.prisma.$transaction([
      this.prisma.procedureVersion.update({
        where: { id: draft.id },
        data: {
          title: source.title,
          contentJson: source.contentJson as Prisma.InputJsonValue,
        },
      }),
      this.prisma.procedure.update({
        where: { id: procedureId },
        data: {
          title: source.title,
          updatedAt: new Date(),
        },
      }),
    ]);

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.draft.restored_from_version',
      resourceType: 'procedure',
      resourceId: procedureId,
      newValue: {
        sourceVersionId: source.id,
        versionLabel: formatProcedureVersionLabel(
          source.versionMajor,
          source.versionMinor,
        ),
        draftVersionId: draft.id,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, procedureId);
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
    if (
      dto.contentJson == null &&
      dto.title == null &&
      dto.categoryId == null
    ) {
      throw new BadRequestException(
        'Au moins un champ à mettre à jour est requis',
      );
    }
    if (dto.expectedUpdatedAt) {
      const expected = new Date(dto.expectedUpdatedAt).getTime();
      if (procedure.updatedAt.getTime() !== expected) {
        throw new ConflictException(
          'La procédure a été modifiée entre-temps — rechargez puis réessayez',
        );
      }
    }

    const draft = await this.prisma.procedureVersion.findFirst({
      where: {
        id: procedure.currentDraftVersionId,
        clientId,
        procedureId: id,
        lifecycle: ProcedureVersionLifecycle.DRAFT,
      },
    });
    if (!draft) throw new NotFoundException('Brouillon introuvable');

    let contentJson: Record<string, unknown> | undefined;
    if (dto.contentJson != null) {
      contentJson = assertProcedureContentJson(dto.contentJson);
      await this.assets.assertAssetsBelongToProcedure(clientId, id, contentJson);
    }

    const nextTitle = dto.title?.trim();
    const procedureData: Prisma.ProcedureUpdateInput = {
      updatedAt: new Date(),
    };
    if (nextTitle) {
      procedureData.title = nextTitle;
    }
    if (dto.categoryId) {
      const categoryId = await this.categories.resolveActiveCategoryId(
        clientId,
        dto.categoryId,
      );
      procedureData.category = { connect: { id: categoryId } };
    }

    const versionData: Prisma.ProcedureVersionUpdateInput = {};
    if (contentJson) {
      versionData.contentJson = contentJson as Prisma.InputJsonValue;
    }
    if (nextTitle) {
      versionData.title = nextTitle;
    }

    await this.prisma.$transaction([
      this.prisma.procedureVersion.update({
        where: { id: draft.id },
        data: versionData,
      }),
      this.prisma.procedure.update({
        where: { id },
        data: procedureData,
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
        contentBytes: contentJson
          ? JSON.stringify(contentJson).length
          : undefined,
        titleUpdated: Boolean(nextTitle),
        categoryUpdated: Boolean(dto.categoryId),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  async transition(
    clientId: string,
    id: string,
    dto: TransitionProcedureDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    if (!actorUserId) {
      throw new ForbiddenException('Utilisateur requis');
    }

    const to = dto.to as ProcedureStatus;
    if (to === ProcedureStatus.PUBLISHED) {
      await this.assertCanPublish(clientId, actorUserId);
    }

    const procedure = await this.prisma.procedure.findFirst({
      where: { id, clientId },
    });
    if (!procedure) throw new NotFoundException('Procédure introuvable');
    if (procedure.status === ProcedureStatus.ARCHIVED) {
      throw new BadRequestException(
        'Procédure archivée — transition impossible',
      );
    }
    if (dto.expectedUpdatedAt) {
      const expected = new Date(dto.expectedUpdatedAt).getTime();
      if (procedure.updatedAt.getTime() !== expected) {
        throw new ConflictException(
          'La procédure a été modifiée entre-temps — rechargez puis réessayez',
        );
      }
    }

    const from = procedure.status;
    if (from === to) {
      return this.getById(clientId, id);
    }

    const allowed =
      (from === ProcedureStatus.DRAFT &&
        (to === ProcedureStatus.IN_REVIEW || to === ProcedureStatus.DRAFT)) ||
      (from === ProcedureStatus.IN_REVIEW &&
        (to === ProcedureStatus.DRAFT ||
          to === ProcedureStatus.PUBLISHED ||
          to === ProcedureStatus.IN_REVIEW)) ||
      (from === ProcedureStatus.PUBLISHED &&
        (to === ProcedureStatus.IN_REVIEW || to === ProcedureStatus.DRAFT));

    if (!allowed) {
      throw new BadRequestException(
        `Transition ${from} → ${to} non autorisée`,
      );
    }

    if (
      to === ProcedureStatus.IN_REVIEW ||
      to === ProcedureStatus.PUBLISHED
    ) {
      if (!procedure.currentDraftVersionId) {
        throw new BadRequestException('Aucun brouillon courant');
      }
      const draft = await this.prisma.procedureVersion.findFirst({
        where: {
          id: procedure.currentDraftVersionId,
          clientId,
          procedureId: id,
          lifecycle: ProcedureVersionLifecycle.DRAFT,
        },
      });
      if (!draft) throw new NotFoundException('Brouillon introuvable');
      if (isProcedureContentEmpty(draft.contentJson)) {
        throw new BadRequestException(
          'Contenu vide — rédigez la procédure avant de continuer',
        );
      }

      if (to === ProcedureStatus.PUBLISHED) {
        return this.publishFromDraft(
          clientId,
          procedure,
          draft,
          dto.bumpType,
          dto.changeSummary,
          actorUserId,
          meta,
        );
      }
    }

    await this.prisma.procedure.update({
      where: { id },
      data: { status: to, updatedAt: new Date() },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.status_changed',
      resourceType: 'procedure',
      resourceId: id,
      oldValue: { status: from },
      newValue: { status: to },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  private async publishFromDraft(
    clientId: string,
    procedure: {
      id: string;
      status: ProcedureStatus;
      currentDraftVersionId: string | null;
      currentPublishedVersionId: string | null;
      title: string;
    },
    draft: {
      id: string;
      title: string;
      contentJson: Prisma.JsonValue;
    },
    bumpType: ProcedureVersionBumpType | undefined,
    changeSummary: string | undefined,
    actorUserId: string,
    meta?: AuditMeta,
  ) {
    const currentPublished = procedure.currentPublishedVersionId
      ? await this.prisma.procedureVersion.findFirst({
          where: {
            id: procedure.currentPublishedVersionId,
            clientId,
            procedureId: procedure.id,
            lifecycle: ProcedureVersionLifecycle.PUBLISHED,
          },
          select: { versionMajor: true, versionMinor: true },
        })
      : null;

    if (
      currentPublished &&
      (currentPublished.versionMajor == null ||
        currentPublished.versionMinor == null)
    ) {
      throw new BadRequestException(
        'Version publiée courante invalide — contactez un administrateur',
      );
    }

    let next: ReturnType<typeof resolveNextProcedureVersion>;
    try {
      next = resolveNextProcedureVersion(
        currentPublished
          ? {
              versionMajor: currentPublished.versionMajor!,
              versionMinor: currentPublished.versionMinor!,
            }
          : null,
        bumpType,
        changeSummary,
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'MAJOR_SUMMARY_REQUIRED') {
        throw new BadRequestException(
          'Indiquez un motif pour la version majeure',
        );
      }
      throw e;
    }

    const summary =
      next.bumpType === 'MAJOR' && currentPublished
        ? changeSummary!.trim()
        : changeSummary?.trim() || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const published = await tx.procedureVersion.update({
        where: { id: draft.id },
        data: {
          lifecycle: ProcedureVersionLifecycle.PUBLISHED,
          versionMajor: next.major,
          versionMinor: next.minor,
          bumpType: next.bumpType,
          title: draft.title || procedure.title,
          changeSummary: summary,
          publishedAt: new Date(),
          publishedByUserId: actorUserId,
        },
      });

      const newDraft = await tx.procedureVersion.create({
        data: {
          clientId,
          procedureId: procedure.id,
          versionMajor: null,
          versionMinor: null,
          bumpType: null,
          lifecycle: ProcedureVersionLifecycle.DRAFT,
          title: published.title,
          contentJson: draft.contentJson as Prisma.InputJsonValue,
        },
      });

      await tx.procedure.update({
        where: { id: procedure.id },
        data: {
          status: ProcedureStatus.PUBLISHED,
          title: published.title,
          currentPublishedVersionId: published.id,
          currentDraftVersionId: newDraft.id,
          updatedAt: new Date(),
        },
      });

      return { published, newDraft };
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.status_changed',
      resourceType: 'procedure',
      resourceId: procedure.id,
      oldValue: { status: procedure.status },
      newValue: { status: ProcedureStatus.PUBLISHED },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'procedure.version.published',
      resourceType: 'procedure',
      resourceId: procedure.id,
      newValue: {
        versionId: result.published.id,
        versionLabel: formatProcedureVersionLabel(
          result.published.versionMajor,
          result.published.versionMinor,
        ),
        versionMajor: result.published.versionMajor,
        versionMinor: result.published.versionMinor,
        bumpType: result.published.bumpType,
        changeSummary: summary,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.getById(clientId, procedure.id);
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

    const categoryId = await this.categories.resolveActiveCategoryId(
      clientId,
      dto.categoryId,
    );

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const procedure = await tx.procedure.create({
          data: {
            clientId,
            code,
            title,
            description: dto.description?.trim() || null,
            categoryId,
            status: ProcedureStatus.DRAFT,
            ownerUserId: dto.ownerUserId || null,
            createdByUserId: actorUserId ?? null,
          },
        });

        const version = await tx.procedureVersion.create({
          data: {
            clientId,
            procedureId: procedure.id,
            versionMajor: null,
            versionMinor: null,
            bumpType: null,
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
          categoryId: created.categoryId,
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
        : existing.statusBeforeArchive === ProcedureStatus.IN_REVIEW
          ? ProcedureStatus.IN_REVIEW
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

  private async assertCanPublish(
    clientId: string,
    actorUserId: string,
  ): Promise<void> {
    const settings = await this.settings.getOrCreate(clientId);
    if (settings.usePilotageCycle) {
      const codes =
        await this.effectivePermissions.resolvePermissionCodesForRequest({
          userId: actorUserId,
          clientId,
        });
      if (!satisfiesPermission(codes, 'procedures.publish')) {
        throw new ForbiddenException('Permission procedures.publish requise');
      }
      return;
    }

    if (settings.validators.some((v) => v.userId === actorUserId)) {
      return;
    }

    const membership = await this.prisma.clientUser.findFirst({
      where: {
        clientId,
        userId: actorUserId,
        status: ClientUserStatus.ACTIVE,
      },
      select: { role: true },
    });
    if (membership?.role === ClientUserRole.CLIENT_ADMIN) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { platformRole: true },
    });
    if (user?.platformRole === PlatformRole.PLATFORM_ADMIN) {
      return;
    }

    throw new ForbiddenException(
      'Seul un validateur configuré (ou un administrateur) peut approuver la publication',
    );
  }

  private ownerLabel(owner: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null): string | null {
    if (!owner) return null;
    return personDisplayLabel(owner);
  }

  private toListItem(
    row: {
      id: string;
      code: string;
      title: string;
      description: string | null;
      category: CategoryRef;
      status: ProcedureStatus;
      ownerUserId: string | null;
      currentDraftVersionId: string | null;
      currentPublishedVersionId: string | null;
      updatedAt: Date;
    },
    ownerMap: Map<
      string,
      {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
      }
    >,
    publishedMap: Map<
      string,
      {
        id: string;
        versionMajor: number | null;
        versionMinor: number | null;
        bumpType: ProcedureVersionBumpType | null;
        publishedAt: Date | null;
        contentJson: Prisma.JsonValue;
      }
    >,
    draftMap: Map<string, { id: string; contentJson: Prisma.JsonValue }>,
  ) {
    const owner = row.ownerUserId
      ? ownerMap.get(row.ownerUserId) ?? null
      : null;
    const published = row.currentPublishedVersionId
      ? publishedMap.get(row.currentPublishedVersionId) ?? null
      : null;
    const draft = row.currentDraftVersionId
      ? draftMap.get(row.currentDraftVersionId) ?? null
      : null;
    const publishedVersionLabel = formatProcedureVersionLabel(
      published?.versionMajor,
      published?.versionMinor,
    );
    /** Carte catalogue : contenu publié si dispo (sinon brouillon) — aligné mock nb blocs. */
    const contentForCount = published?.contentJson ?? draft?.contentJson;
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      categoryId: row.category.id,
      category: row.category,
      status: row.status,
      ownerLabel: this.ownerLabel(owner),
      publishedVersionLabel,
      publishedVersionMajor: published?.versionMajor ?? null,
      publishedVersionMinor: published?.versionMinor ?? null,
      blockCount: countProcedureBlocks(contentForCount),
      publishedAt: published?.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublishedVersionSummary(
    published: {
      id: string;
      versionMajor: number | null;
      versionMinor: number | null;
      bumpType: ProcedureVersionBumpType | null;
      changeSummary: string | null;
      publishedAt: Date | null;
      title: string;
    },
    currentPublishedVersionId: string | null,
  ) {
    return {
      id: published.id,
      versionLabel: formatProcedureVersionLabel(
        published.versionMajor,
        published.versionMinor,
      ),
      versionMajor: published.versionMajor,
      versionMinor: published.versionMinor,
      bumpType: published.bumpType,
      isMajor: published.bumpType === ProcedureVersionBumpType.MAJOR,
      isCurrent: published.id === currentPublishedVersionId,
      changeSummary: published.changeSummary,
      publishedAt: published.publishedAt?.toISOString() ?? null,
      title: published.title,
    };
  }

  private toDetail(
    row: {
      id: string;
      code: string;
      title: string;
      description: string | null;
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
    category: CategoryRef,
  ) {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      categoryId: category.id,
      category,
      status: row.status,
      ownerLabel: this.ownerLabel(owner),
      currentDraftVersionId: row.currentDraftVersionId,
      currentPublishedVersionId: row.currentPublishedVersionId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
