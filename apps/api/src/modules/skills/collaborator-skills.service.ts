import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollaboratorSkillSource,
  CollaboratorStatus,
  Prisma,
  SkillReferenceLevel,
  SkillStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BulkCreateCollaboratorSkillsDto } from './dto/bulk-create-collaborator-skills.dto';
import { CreateCollaboratorSkillDto } from './dto/create-collaborator-skill.dto';
import {
  CollaboratorSkillListSortBy,
  CollaboratorSkillSortOrder,
  ListCollaboratorSkillsQueryDto,
} from './dto/list-collaborator-skills.query.dto';
import {
  ListSkillCollaboratorsQueryDto,
  SkillCollaboratorsListSortBy,
  SkillCollaboratorsSortOrder,
} from './dto/list-skill-collaborators.query.dto';
import { UpdateCollaboratorSkillDto } from './dto/update-collaborator-skill.dto';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

const COLLAB_SKILLS_INCLUDE = {
  skill: {
    include: {
      category: { select: { id: true, name: true } },
    },
  },
  validatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.CollaboratorSkillInclude;

type Row = Prisma.CollaboratorSkillGetPayload<{
  include: typeof COLLAB_SKILLS_INCLUDE;
}>;

const COLLAB_SKILLS_INCLUDE_INVERSE = {
  collaborator: true,
  validatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.CollaboratorSkillInclude;

type RowInverse = Prisma.CollaboratorSkillGetPayload<{
  include: typeof COLLAB_SKILLS_INCLUDE_INVERSE;
}>;

@Injectable()
export class CollaboratorSkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listByCollaborator(
    clientId: string,
    collaboratorId: string,
    query: ListCollaboratorSkillsQueryDto,
  ) {
    const collab = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorId, clientId },
    });
    if (!collab) throw new NotFoundException('Collaborator not found');

    const includeArchived = query.includeArchived === true;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const where = this.buildWhereCollaboratorList(
      clientId,
      collaboratorId,
      query,
      includeArchived,
    );
    const orderBy = this.buildOrderByCollaboratorList(
      query.sortBy ?? CollaboratorSkillListSortBy.CREATED_AT,
      query.sortOrder ?? CollaboratorSkillSortOrder.DESC,
    );

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.collaboratorSkill.count({ where }),
      this.prisma.collaboratorSkill.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy,
        include: COLLAB_SKILLS_INCLUDE,
      }),
    ]);

    return {
      items: rows.map((r) => this.toCollaboratorListItem(r)),
      total,
      limit,
      offset,
    };
  }

  async listBySkill(
    clientId: string,
    skillId: string,
    query: ListSkillCollaboratorsQueryDto,
  ) {
    const includeArchived = query.includeArchived === true;
    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, clientId },
    });
    if (!skill) throw new NotFoundException('Skill not found');
    if (skill.status === SkillStatus.ARCHIVED && !includeArchived) {
      throw new NotFoundException('Skill not found');
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const where = this.buildWhereSkillInverse(clientId, skillId, query);
    const orderBy = this.buildOrderBySkillInverse(
      query.sortBy ?? SkillCollaboratorsListSortBy.COLLABORATOR_NAME,
      query.sortOrder ?? SkillCollaboratorsSortOrder.ASC,
    );

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.collaboratorSkill.count({ where }),
      this.prisma.collaboratorSkill.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy,
        include: COLLAB_SKILLS_INCLUDE_INVERSE,
      }),
    ]);

    return {
      items: rows.map((r) => this.toSkillInverseItem(r)),
      total,
      limit,
      offset,
    };
  }

  async create(
    clientId: string,
    collaboratorId: string,
    dto: CreateCollaboratorSkillDto,
    actorUserId: string | undefined,
    meta: AuditMeta | undefined,
  ) {
    await this.assertCollaboratorWritable(clientId, collaboratorId);
    await this.assertSkillAssignable(clientId, dto.skillId);

    const existing = await this.prisma.collaboratorSkill.findFirst({
      where: { collaboratorId, skillId: dto.skillId },
    });
    if (existing) {
      throw new ConflictException('Collaborator skill already exists');
    }

    let row: Row;
    try {
      row = await this.prisma.collaboratorSkill.create({
        data: {
          clientId,
          collaboratorId,
          skillId: dto.skillId,
          level: dto.level ?? SkillReferenceLevel.BEGINNER,
          source: dto.source ?? CollaboratorSkillSource.SELF_DECLARED,
          comment: dto.comment?.trim() || null,
          reviewedAt: dto.reviewedAt ? new Date(dto.reviewedAt) : null,
        },
        include: COLLAB_SKILLS_INCLUDE,
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Collaborator skill already exists');
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator_skill.created',
      resourceType: 'collaborator_skill',
      resourceId: row.id,
      newValue: {
        collaboratorId,
        skillId: dto.skillId,
        level: row.level,
        source: row.source,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toCollaboratorListItem(row);
  }

  async bulkCreate(
    clientId: string,
    collaboratorId: string,
    dto: BulkCreateCollaboratorSkillsDto,
    actorUserId: string | undefined,
    meta: AuditMeta | undefined,
  ) {
    const totalRequested = dto.items.length;
    const skillIds = dto.items.map((i) => i.skillId);
    const unique = new Set(skillIds);
    if (unique.size !== skillIds.length) {
      throw new BadRequestException('Duplicate skill in bulk payload');
    }

    const collaborator = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorId, clientId },
    });
    if (!collaborator) throw new NotFoundException('Collaborator not found');
    if (collaborator.status !== CollaboratorStatus.ACTIVE) {
      throw new BadRequestException('Collaborator is not active');
    }

    const skills = await this.prisma.skill.findMany({
      where: { id: { in: skillIds }, clientId },
    });
    if (skills.length !== skillIds.length) {
      throw new BadRequestException('One or more skills are invalid for this client');
    }
    for (const s of skills) {
      if (s.status === SkillStatus.ARCHIVED) {
        throw new BadRequestException('One or more skills are archived');
      }
    }

    const existingRows = await this.prisma.collaboratorSkill.findMany({
      where: { collaboratorId, skillId: { in: skillIds } },
      select: { skillId: true },
    });
    const existingSet = new Set(existingRows.map((e) => e.skillId));

    const skipped: { skillId: string; reason: 'already_associated' }[] = [];
    const toCreate: CreateCollaboratorSkillDto[] = [];
    for (const item of dto.items) {
      if (existingSet.has(item.skillId)) {
        skipped.push({ skillId: item.skillId, reason: 'already_associated' });
      } else {
        toCreate.push(item);
      }
    }

    const createdPayloads: ReturnType<
      CollaboratorSkillsService['toCollaboratorListItem']
    >[] = [];

    if (toCreate.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of toCreate) {
          const created = await tx.collaboratorSkill.create({
            data: {
              clientId,
              collaboratorId,
              skillId: item.skillId,
              level: item.level ?? SkillReferenceLevel.BEGINNER,
              source: item.source ?? CollaboratorSkillSource.SELF_DECLARED,
              comment: item.comment?.trim() || null,
              reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : null,
            },
            include: COLLAB_SKILLS_INCLUDE,
          });
          createdPayloads.push(this.toCollaboratorListItem(created));
        }
      });
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator_skill.bulk_created',
      resourceType: 'collaborator_skill',
      resourceId: collaboratorId,
      newValue: {
        totalRequested,
        createdCount: createdPayloads.length,
        skipped,
        createdIds: createdPayloads.map((p) => p.id),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return {
      created: createdPayloads,
      skipped,
      totalRequested,
    };
  }

  async update(
    clientId: string,
    collaboratorId: string,
    id: string,
    dto: UpdateCollaboratorSkillDto,
    actorUserId: string | undefined,
    meta: AuditMeta | undefined,
  ) {
    const row = await this.findScopedOrThrow(clientId, collaboratorId, id);
    await this.assertCollaboratorWritable(clientId, collaboratorId);

    const data: Prisma.CollaboratorSkillUpdateInput = {};
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.comment !== undefined) data.comment = dto.comment?.trim() || null;
    if (dto.reviewedAt !== undefined) {
      data.reviewedAt = dto.reviewedAt ? new Date(dto.reviewedAt) : null;
    }

    const updated = await this.prisma.collaboratorSkill.update({
      where: { id: row.id },
      data,
      include: COLLAB_SKILLS_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator_skill.updated',
      resourceType: 'collaborator_skill',
      resourceId: id,
      oldValue: { level: row.level, source: row.source },
      newValue: { level: updated.level, source: updated.source },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toCollaboratorListItem(updated);
  }

  async remove(
    clientId: string,
    collaboratorId: string,
    id: string,
    actorUserId: string | undefined,
    meta: AuditMeta | undefined,
  ) {
    const row = await this.findScopedOrThrow(clientId, collaboratorId, id);
    await this.prisma.collaboratorSkill.delete({ where: { id: row.id } });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator_skill.deleted',
      resourceType: 'collaborator_skill',
      resourceId: id,
      oldValue: { collaboratorId, skillId: row.skillId },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
  }

  async validate(
    clientId: string,
    collaboratorId: string,
    id: string,
    actorUserId: string,
    meta: AuditMeta | undefined,
  ) {
    const row = await this.findScopedOrThrow(clientId, collaboratorId, id);
    const now = new Date();
    const updated = await this.prisma.collaboratorSkill.update({
      where: { id: row.id },
      data: {
        validatedByUserId: actorUserId,
        validatedAt: now,
      },
      include: COLLAB_SKILLS_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator_skill.validated',
      resourceType: 'collaborator_skill',
      resourceId: id,
      newValue: { validatedAt: now.toISOString() },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toCollaboratorListItem(updated);
  }

  async invalidate(
    clientId: string,
    collaboratorId: string,
    id: string,
    actorUserId: string | undefined,
    meta: AuditMeta | undefined,
  ) {
    await this.findScopedOrThrow(clientId, collaboratorId, id);
    const updated = await this.prisma.collaboratorSkill.update({
      where: { id },
      data: {
        validatedByUserId: null,
        validatedAt: null,
      },
      include: COLLAB_SKILLS_INCLUDE,
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator_skill.invalidated',
      resourceType: 'collaborator_skill',
      resourceId: id,
      newValue: {},
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toCollaboratorListItem(updated);
  }

  private async findScopedOrThrow(
    clientId: string,
    collaboratorId: string,
    id: string,
  ) {
    const row = await this.prisma.collaboratorSkill.findFirst({
      where: { id, clientId, collaboratorId },
    });
    if (!row) throw new NotFoundException('Collaborator skill not found');
    return row;
  }

  private async assertCollaboratorWritable(
    clientId: string,
    collaboratorId: string,
  ) {
    const collab = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorId, clientId },
    });
    if (!collab) throw new NotFoundException('Collaborator not found');
    if (collab.status !== CollaboratorStatus.ACTIVE) {
      throw new BadRequestException('Collaborator is not active');
    }
  }

  private async assertSkillAssignable(clientId: string, skillId: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, clientId },
    });
    if (!skill) throw new NotFoundException('Skill not found');
    if (skill.status === SkillStatus.ARCHIVED) {
      throw new BadRequestException('Skill is archived');
    }
  }

  private buildWhereCollaboratorList(
    clientId: string,
    collaboratorId: string,
    query: ListCollaboratorSkillsQueryDto,
    includeArchived: boolean,
  ): Prisma.CollaboratorSkillWhereInput {
    const where: Prisma.CollaboratorSkillWhereInput = {
      clientId,
      collaboratorId,
      skill: {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search?.trim()
          ? {
              name: {
                contains: query.search.trim(),
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
        ...(!includeArchived ? { status: { not: SkillStatus.ARCHIVED } } : {}),
      },
    };

    if (query.level?.length) {
      where.level = { in: query.level };
    }
    if (query.source?.length) {
      where.source = { in: query.source };
    }
    if (query.validated === true) {
      where.validatedAt = { not: null };
      where.validatedByUserId = { not: null };
    } else if (query.validated === false) {
      where.OR = [{ validatedAt: null }, { validatedByUserId: null }];
    }

    return where;
  }

  private buildWhereSkillInverse(
    clientId: string,
    skillId: string,
    query: ListSkillCollaboratorsQueryDto,
  ): Prisma.CollaboratorSkillWhereInput {
    const where: Prisma.CollaboratorSkillWhereInput = {
      clientId,
      skillId,
      ...(query.search?.trim()
        ? {
            collaborator: {
              displayName: {
                contains: query.search.trim(),
                mode: Prisma.QueryMode.insensitive,
              },
            },
          }
        : {}),
    };

    if (query.level?.length) {
      where.level = { in: query.level };
    }
    if (query.validated === true) {
      where.validatedAt = { not: null };
      where.validatedByUserId = { not: null };
    } else if (query.validated === false) {
      where.OR = [{ validatedAt: null }, { validatedByUserId: null }];
    }

    return where;
  }

  private buildOrderByCollaboratorList(
    sortBy: CollaboratorSkillListSortBy,
    sortOrder: CollaboratorSkillSortOrder,
  ): Prisma.CollaboratorSkillOrderByWithRelationInput {
    const dir = sortOrder === CollaboratorSkillSortOrder.ASC ? 'asc' : 'desc';
    switch (sortBy) {
      case CollaboratorSkillListSortBy.SKILL_NAME:
        return { skill: { name: dir } };
      case CollaboratorSkillListSortBy.LEVEL:
        return { level: dir };
      case CollaboratorSkillListSortBy.REVIEWED_AT:
        return { reviewedAt: dir };
      case CollaboratorSkillListSortBy.VALIDATED_AT:
        return { validatedAt: dir };
      case CollaboratorSkillListSortBy.CREATED_AT:
      default:
        return { createdAt: dir };
    }
  }

  private buildOrderBySkillInverse(
    sortBy: SkillCollaboratorsListSortBy,
    sortOrder: SkillCollaboratorsSortOrder,
  ): Prisma.CollaboratorSkillOrderByWithRelationInput {
    const dir = sortOrder === SkillCollaboratorsSortOrder.ASC ? 'asc' : 'desc';
    switch (sortBy) {
      case SkillCollaboratorsListSortBy.LEVEL:
        return { level: dir };
      case SkillCollaboratorsListSortBy.VALIDATED_AT:
        return { validatedAt: dir };
      case SkillCollaboratorsListSortBy.COLLABORATOR_NAME:
      default:
        return { collaborator: { displayName: dir } };
    }
  }

  private toCollaboratorListItem(row: Row) {
    const skillArchived = row.skill.status === SkillStatus.ARCHIVED;
    return {
      id: row.id,
      collaboratorId: row.collaboratorId,
      skillId: row.skillId,
      skillName: row.skill.name,
      skillCategoryId: row.skill.categoryId,
      skillCategoryName: row.skill.category.name,
      skillReferenceLevel: row.skill.referenceLevel,
      level: row.level,
      source: row.source,
      comment: row.comment,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      validatedByUserId: row.validatedByUserId,
      validatedByName: formatUserDisplayName(row.validatedBy),
      validatedAt: row.validatedAt?.toISOString() ?? null,
      skillArchived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toSkillInverseItem(row: RowInverse) {
    return {
      id: row.id,
      collaboratorId: row.collaboratorId,
      collaboratorDisplayName: row.collaborator.displayName,
      collaboratorJobTitle: row.collaborator.jobTitle,
      collaboratorStatus: row.collaborator.status,
      level: row.level,
      source: row.source,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      validatedAt: row.validatedAt?.toISOString() ?? null,
      validatedByName: formatUserDisplayName(row.validatedBy),
    };
  }
}

function formatUserDisplayName(
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null,
): string | null {
  if (!user) return null;
  const parts = [user.firstName, user.lastName].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(' ').trim();
  return user.email ?? null;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
