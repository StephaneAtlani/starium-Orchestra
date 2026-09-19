import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProcedureTemplateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  type CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import {
  CreateProcedureTemplateDto,
  TransitionProcedureTemplateDto,
  UpdateProcedureTemplateDto,
} from './dto/procedure-template.dto';
import {
  normalizeProcedureTemplateOutline,
  outlineHasH1,
  type ProcedureTemplateOutlineItem,
} from './lib/procedure-template-outline.util';

export type ProcedureTemplateResponse = {
  id: string;
  name: string;
  status: ProcedureTemplateStatus;
  categoryId: string | null;
  category: { id: string; code: string; label: string } | null;
  outline: ProcedureTemplateOutlineItem[];
  hierarchyWarnings: string[];
  updatedAt: string;
  createdAt: string;
};

export type ProcedureTemplateDeleteResult = {
  deleted: boolean;
  archived: boolean;
  message: string;
};

type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

const categorySelect = {
  id: true,
  code: true,
  label: true,
} as const;

@Injectable()
export class ProcedureTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    opts?: { status?: ProcedureTemplateStatus },
  ): Promise<ProcedureTemplateResponse[]> {
    const rows = await this.prisma.procedureTemplate.findMany({
      where: {
        clientId,
        ...(opts?.status ? { status: opts.status } : {}),
      },
      include: { category: { select: categorySelect } },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toResponse);
  }

  async listActive(clientId: string): Promise<ProcedureTemplateResponse[]> {
    return this.list(clientId, { status: ProcedureTemplateStatus.ACTIVE });
  }

  async get(
    clientId: string,
    templateId: string,
  ): Promise<ProcedureTemplateResponse> {
    const row = await this.findOrThrow(clientId, templateId);
    return toResponse(row);
  }

  async create(
    clientId: string,
    dto: CreateProcedureTemplateDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<ProcedureTemplateResponse> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nom obligatoire');

    const { items, hierarchyWarnings } = normalizeProcedureTemplateOutline(
      dto.outline ?? [],
    );
    const categoryId = await this.resolveOptionalCategoryId(
      clientId,
      dto.categoryId,
    );

    const row = await this.prisma.procedureTemplate.create({
      data: {
        clientId,
        name,
        categoryId,
        status: ProcedureTemplateStatus.DRAFT,
        outlineJson: items as unknown as Prisma.InputJsonValue,
        createdByUserId: actorUserId,
      },
      include: { category: { select: categorySelect } },
    });

    await this.audit({
      clientId,
      userId: actorUserId,
      action: 'procedure.template.created',
      resourceId: row.id,
      newValue: { name: row.name, status: row.status },
      meta,
    });

    return { ...toResponse(row), hierarchyWarnings };
  }

  async update(
    clientId: string,
    templateId: string,
    dto: UpdateProcedureTemplateDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<ProcedureTemplateResponse> {
    const existing = await this.findOrThrow(clientId, templateId);

    if (existing.status === ProcedureTemplateStatus.ARCHIVED) {
      throw new BadRequestException(
        'Un modèle archivé ne peut pas être modifié — réactivez-le d’abord',
      );
    }

    const data: Prisma.ProcedureTemplateUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Nom obligatoire');
      data.name = name;
    }

    let hierarchyWarnings: string[] = [];
    if (dto.outline !== undefined) {
      const normalized = normalizeProcedureTemplateOutline(dto.outline);
      hierarchyWarnings = normalized.hierarchyWarnings;
      data.outlineJson = normalized.items as unknown as Prisma.InputJsonValue;
    }

    if (dto.categoryId !== undefined) {
      const categoryId = await this.resolveOptionalCategoryId(
        clientId,
        dto.categoryId,
      );
      data.category =
        categoryId == null
          ? { disconnect: true }
          : { connect: { id: categoryId } };
    }

    const row = await this.prisma.procedureTemplate.update({
      where: { id: existing.id },
      data,
      include: { category: { select: categorySelect } },
    });

    await this.audit({
      clientId,
      userId: actorUserId,
      action: 'procedure.template.updated',
      resourceId: row.id,
      oldValue: { name: existing.name },
      newValue: { name: row.name },
      meta,
    });

    const base = toResponse(row);
    if (dto.outline === undefined) {
      hierarchyWarnings = normalizeProcedureTemplateOutline(
        row.outlineJson,
      ).hierarchyWarnings;
    }
    return { ...base, hierarchyWarnings };
  }

  async transition(
    clientId: string,
    templateId: string,
    dto: TransitionProcedureTemplateDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<ProcedureTemplateResponse> {
    const existing = await this.findOrThrow(clientId, templateId);
    const target = dto.status as ProcedureTemplateStatus;

    if (existing.status === target) {
      return toResponse(existing);
    }

    if (target === ProcedureTemplateStatus.ACTIVE) {
      const name = existing.name.trim();
      const { items } = normalizeProcedureTemplateOutline(existing.outlineJson);
      if (!name) {
        throw new BadRequestException('Nom obligatoire pour activer le modèle');
      }
      if (!outlineHasH1(items)) {
        throw new BadRequestException(
          'Au moins un titre H1 est requis pour activer le modèle',
        );
      }
    }

    const row = await this.prisma.procedureTemplate.update({
      where: { id: existing.id },
      data: { status: target },
      include: { category: { select: categorySelect } },
    });

    await this.audit({
      clientId,
      userId: actorUserId,
      action: 'procedure.template.transitioned',
      resourceId: row.id,
      oldValue: { status: existing.status },
      newValue: { status: row.status },
      meta,
    });

    return toResponse(row);
  }

  async remove(
    clientId: string,
    templateId: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<ProcedureTemplateDeleteResult> {
    const existing = await this.findOrThrow(clientId, templateId);
    const refs = await this.prisma.procedure.count({
      where: { clientId, sourceTemplateId: templateId },
    });

    if (refs > 0) {
      if (existing.status !== ProcedureTemplateStatus.ARCHIVED) {
        await this.prisma.procedureTemplate.update({
          where: { id: existing.id },
          data: { status: ProcedureTemplateStatus.ARCHIVED },
        });
        await this.audit({
          clientId,
          userId: actorUserId,
          action: 'procedure.template.archived_on_delete',
          resourceId: existing.id,
          oldValue: { status: existing.status },
          newValue: { status: ProcedureTemplateStatus.ARCHIVED, refs },
          meta,
        });
      }
      return {
        deleted: false,
        archived: true,
        message:
          'Des procédures référencent ce modèle — archivage imposé à la place de la suppression',
      };
    }

    await this.prisma.procedureTemplate.delete({ where: { id: existing.id } });
    await this.audit({
      clientId,
      userId: actorUserId,
      action: 'procedure.template.deleted',
      resourceId: existing.id,
      oldValue: { name: existing.name, status: existing.status },
      meta,
    });
    return {
      deleted: true,
      archived: false,
      message: 'Modèle supprimé',
    };
  }

  private async findOrThrow(clientId: string, templateId: string) {
    const row = await this.prisma.procedureTemplate.findFirst({
      where: { id: templateId, clientId },
      include: { category: { select: categorySelect } },
    });
    if (!row) throw new NotFoundException('Modèle de procédure introuvable');
    return row;
  }

  private async resolveOptionalCategoryId(
    clientId: string,
    categoryId: string | null | undefined,
  ): Promise<string | null> {
    if (categoryId === undefined) return null;
    if (categoryId === null || categoryId === '') return null;
    const row = await this.prisma.procedureCategory.findFirst({
      where: { id: categoryId, clientId, isActive: true },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        'Catégorie introuvable ou inactive pour ce client',
      );
    }
    return row.id;
  }

  private async audit(input: {
    clientId: string;
    userId?: string;
    action: string;
    resourceId: string;
    oldValue?: CreateAuditLogInput['oldValue'];
    newValue?: CreateAuditLogInput['newValue'];
    meta?: AuditMeta;
  }) {
    await this.auditLogs.create({
      clientId: input.clientId,
      userId: input.userId,
      action: input.action,
      resourceType: 'procedure_template',
      resourceId: input.resourceId,
      oldValue: input.oldValue,
      newValue: input.newValue,
      ipAddress: input.meta?.ipAddress,
      userAgent: input.meta?.userAgent,
      requestId: input.meta?.requestId,
    });
  }
}

type TemplateRow = {
  id: string;
  name: string;
  status: ProcedureTemplateStatus;
  categoryId: string | null;
  outlineJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; code: string; label: string } | null;
};

function toResponse(row: TemplateRow): ProcedureTemplateResponse {
  const { items, hierarchyWarnings } = normalizeProcedureTemplateOutline(
    row.outlineJson,
  );
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    categoryId: row.categoryId,
    category: row.category,
    outline: items,
    hierarchyWarnings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
