import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SkillReferenceLevel,
  SkillStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSkillCategoryDto } from './dto/create-skill-category.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import {
  ListSkillCategoriesQueryDto,
  SkillCategorySortBy,
} from './dto/list-skill-categories.query.dto';
import { ListSkillCategoryOptionsQueryDto } from './dto/list-skill-category-options.query.dto';
import {
  ListSkillsQueryDto,
  SkillSortBy,
  SortOrder,
} from './dto/list-skills.query.dto';
import { ListSkillOptionsQueryDto } from './dto/list-skill-options.query.dto';
import { UpdateSkillCategoryDto } from './dto/update-skill-category.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

type SkillWithCategory = Prisma.SkillGetPayload<{
  include: { category: { select: { name: true } } };
}>;

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listSkills(clientId: string, query: ListSkillsQueryDto) {
    const where: Prisma.SkillWhereInput = {
      clientId,
      ...(query.search?.trim()
        ? {
            OR: [
              {
                name: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                description: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.referenceLevel?.length
        ? { referenceLevel: { in: query.referenceLevel } }
        : {}),
    };

    if (!query.includeArchived && !query.status?.length) {
      where.status = { in: [SkillStatus.ACTIVE, SkillStatus.DRAFT] };
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.skill.count({ where }),
      this.prisma.skill.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: this.buildSkillOrderBy(query.sortBy, query.sortOrder),
        include: { category: { select: { name: true } } },
      }),
    ]);
    return {
      items: items.map((item) => this.toSkillOutput(item)),
      total,
      limit,
      offset,
    };
  }

  async listSkillOptions(clientId: string, query: ListSkillOptionsQueryDto) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const where: Prisma.SkillWhereInput = {
      clientId,
      status: { in: [SkillStatus.ACTIVE, SkillStatus.DRAFT] },
      ...(query.search?.trim()
        ? {
            OR: [
              {
                name: {
                  contains: query.search.trim(),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                category: {
                  name: {
                    contains: query.search.trim(),
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.skill.count({ where }),
      this.prisma.skill.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ name: 'asc' }],
        include: { category: { select: { name: true } } },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        categoryName: row.category.name,
      })),
      total,
      limit,
      offset,
    };
  }

  async getSkillById(clientId: string, id: string) {
    const row = await this.prisma.skill.findFirst({
      where: { id, clientId },
      include: { category: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Skill not found');
    return this.toSkillOutput(row);
  }

  async createSkill(
    clientId: string,
    dto: CreateSkillDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const normalizedName = normalizeName(dto.name);
    const name = normalizeDisplayName(dto.name);
    const status = dto.status ?? SkillStatus.DRAFT;
    if (status === SkillStatus.ARCHIVED) {
      throw new BadRequestException('Initial status ARCHIVED is not allowed');
    }
    await this.ensureCategoryInClient(clientId, dto.categoryId);
    await this.ensureSkillNameUnique(clientId, normalizedName);

    let created: SkillWithCategory;
    try {
      created = await this.prisma.skill.create({
        data: {
          clientId,
          categoryId: dto.categoryId,
          name,
          normalizedName,
          description: dto.description?.trim() || null,
          referenceLevel: dto.referenceLevel ?? SkillReferenceLevel.INTERMEDIATE,
          status,
          archivedAt: null,
        },
        include: { category: { select: { name: true } } },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Skill name already exists');
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill.created',
      resourceType: 'skill',
      resourceId: created.id,
      newValue: {
        name: created.name,
        status: created.status,
        referenceLevel: created.referenceLevel,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toSkillOutput(created);
  }

  async updateSkill(
    clientId: string,
    id: string,
    dto: UpdateSkillDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.skill.findFirst({
      where: { id, clientId },
      include: { category: { select: { name: true } } },
    });
    if (!existing) throw new NotFoundException('Skill not found');

    const data: Prisma.SkillUpdateInput = {};
    if (dto.name !== undefined) {
      const normalizedName = normalizeName(dto.name);
      await this.ensureSkillNameUnique(clientId, normalizedName, id);
      data.name = normalizeDisplayName(dto.name);
      data.normalizedName = normalizedName;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.referenceLevel !== undefined) data.referenceLevel = dto.referenceLevel;
    if (dto.categoryId !== undefined) {
      await this.ensureCategoryInClient(clientId, dto.categoryId);
      data.category = { connect: { id: dto.categoryId } };
    }

    let updated: SkillWithCategory;
    try {
      updated = await this.prisma.skill.update({
        where: { id },
        data,
        include: { category: { select: { name: true } } },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Skill name already exists');
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill.updated',
      resourceType: 'skill',
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        categoryId: existing.categoryId,
        referenceLevel: existing.referenceLevel,
      },
      newValue: {
        name: updated.name,
        categoryId: updated.categoryId,
        referenceLevel: updated.referenceLevel,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toSkillOutput(updated);
  }

  async archiveSkill(clientId: string, id: string, actorUserId?: string, meta?: AuditMeta) {
    const existing = await this.prisma.skill.findFirst({
      where: { id, clientId },
      include: { category: { select: { name: true } } },
    });
    if (!existing) throw new NotFoundException('Skill not found');
    if (existing.status === SkillStatus.ARCHIVED) return this.toSkillOutput(existing);

    const updated = await this.prisma.skill.update({
      where: { id },
      data: {
        status: SkillStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: { category: { select: { name: true } } },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill.archived',
      resourceType: 'skill',
      resourceId: updated.id,
      oldValue: { status: existing.status, archivedAt: existing.archivedAt },
      newValue: { status: updated.status, archivedAt: updated.archivedAt },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toSkillOutput(updated);
  }

  async restoreSkill(clientId: string, id: string, actorUserId?: string, meta?: AuditMeta) {
    const existing = await this.prisma.skill.findFirst({
      where: { id, clientId },
      include: { category: { select: { name: true } } },
    });
    if (!existing) throw new NotFoundException('Skill not found');
    if (existing.status !== SkillStatus.ARCHIVED) return this.toSkillOutput(existing);

    const updated = await this.prisma.skill.update({
      where: { id },
      data: { status: SkillStatus.ACTIVE, archivedAt: null },
      include: { category: { select: { name: true } } },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill.restored',
      resourceType: 'skill',
      resourceId: updated.id,
      oldValue: { status: existing.status, archivedAt: existing.archivedAt },
      newValue: { status: updated.status, archivedAt: updated.archivedAt },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toSkillOutput(updated);
  }

  async listSkillCategories(clientId: string, query: ListSkillCategoriesQueryDto) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const where: Prisma.SkillCategoryWhereInput = {
      clientId,
      ...(query.search?.trim()
        ? {
            name: {
              contains: query.search.trim(),
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.skillCategory.count({ where }),
      this.prisma.skillCategory.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: this.buildCategoryOrderBy(query.sortBy, query.sortOrder),
        include: {
          _count: {
            select: {
              skills: true,
            },
          },
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        clientId: row.clientId,
        name: row.name,
        description: row.description,
        sortOrder: row.sortOrder,
        skillCount: row._count.skills,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
      limit,
      offset,
    };
  }

  async listSkillCategoryOptions(clientId: string, query: ListSkillCategoryOptionsQueryDto) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const where: Prisma.SkillCategoryWhereInput = {
      clientId,
      ...(query.search?.trim()
        ? {
            name: {
              contains: query.search.trim(),
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.skillCategory.count({ where }),
      this.prisma.skillCategory.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
      }),
    ]);
    return { items: rows, total, limit, offset };
  }

  async getSkillCategoryById(clientId: string, id: string) {
    const row = await this.prisma.skillCategory.findFirst({
      where: { id, clientId },
      include: { _count: { select: { skills: true } } },
    });
    if (!row) throw new NotFoundException('Skill category not found');
    return {
      id: row.id,
      clientId: row.clientId,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      skillCount: row._count.skills,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createSkillCategory(
    clientId: string,
    dto: CreateSkillCategoryDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const name = normalizeDisplayName(dto.name);
    const normalizedName = normalizeName(dto.name);
    await this.ensureCategoryNameUnique(clientId, normalizedName);

    let created;
    try {
      created = await this.prisma.skillCategory.create({
        data: {
          clientId,
          name,
          normalizedName,
          description: dto.description?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Skill category name already exists');
      }
      throw error;
    }

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill_category.created',
      resourceType: 'skill_category',
      resourceId: created.id,
      newValue: { name: created.name, sortOrder: created.sortOrder },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return {
      id: created.id,
      clientId: created.clientId,
      name: created.name,
      description: created.description,
      sortOrder: created.sortOrder,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateSkillCategory(
    clientId: string,
    id: string,
    dto: UpdateSkillCategoryDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.skillCategory.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Skill category not found');

    const data: Prisma.SkillCategoryUpdateInput = {};
    if (dto.name !== undefined) {
      const normalizedName = normalizeName(dto.name);
      await this.ensureCategoryNameUnique(clientId, normalizedName, id);
      data.name = normalizeDisplayName(dto.name);
      data.normalizedName = normalizedName;
    }
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    let updated;
    try {
      updated = await this.prisma.skillCategory.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Skill category name already exists');
      }
      throw error;
    }
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill_category.updated',
      resourceType: 'skill_category',
      resourceId: updated.id,
      oldValue: { name: existing.name, sortOrder: existing.sortOrder },
      newValue: { name: updated.name, sortOrder: updated.sortOrder },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return {
      id: updated.id,
      clientId: updated.clientId,
      name: updated.name,
      description: updated.description,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteSkillCategory(clientId: string, id: string, actorUserId?: string, meta?: AuditMeta) {
    const existing = await this.prisma.skillCategory.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Skill category not found');

    const skillCount = await this.prisma.skill.count({
      where: { clientId, categoryId: id },
    });
    if (skillCount > 0) {
      throw new ConflictException('Skill category cannot be deleted while skills are attached');
    }

    await this.prisma.skillCategory.delete({ where: { id } });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'skill_category.deleted',
      resourceType: 'skill_category',
      resourceId: id,
      oldValue: { name: existing.name, sortOrder: existing.sortOrder },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return { success: true };
  }

  private toSkillOutput(item: SkillWithCategory) {
    return {
      id: item.id,
      clientId: item.clientId,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      name: item.name,
      description: item.description,
      status: item.status,
      referenceLevel: item.referenceLevel,
      archivedAt: item.archivedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private buildSkillOrderBy(
    sortBy: SkillSortBy = SkillSortBy.NAME,
    sortOrder: SortOrder = SortOrder.ASC,
  ): Prisma.SkillOrderByWithRelationInput[] {
    switch (sortBy) {
      case SkillSortBy.CREATED_AT:
        return [{ createdAt: sortOrder }];
      case SkillSortBy.UPDATED_AT:
        return [{ updatedAt: sortOrder }];
      case SkillSortBy.REFERENCE_LEVEL:
        return [{ referenceLevel: sortOrder }, { name: 'asc' }];
      case SkillSortBy.NAME:
      default:
        return [{ name: sortOrder }];
    }
  }

  private buildCategoryOrderBy(
    sortBy: SkillCategorySortBy = SkillCategorySortBy.SORT_ORDER,
    sortOrder: SortOrder = SortOrder.ASC,
  ): Prisma.SkillCategoryOrderByWithRelationInput[] {
    switch (sortBy) {
      case SkillCategorySortBy.NAME:
        return [{ name: sortOrder }];
      case SkillCategorySortBy.CREATED_AT:
        return [{ createdAt: sortOrder }];
      case SkillCategorySortBy.UPDATED_AT:
        return [{ updatedAt: sortOrder }];
      case SkillCategorySortBy.SORT_ORDER:
      default:
        return [{ sortOrder: sortOrder }, { name: 'asc' }];
    }
  }

  private async ensureCategoryInClient(clientId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.skillCategory.findFirst({
      where: { id: categoryId, clientId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Skill category not found');
  }

  private async ensureSkillNameUnique(
    clientId: string,
    normalizedName: string,
    exceptSkillId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.skill.findFirst({
      where: {
        clientId,
        normalizedName,
        ...(exceptSkillId ? { id: { not: exceptSkillId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) throw new ConflictException('Skill name already exists');
  }

  private async ensureCategoryNameUnique(
    clientId: string,
    normalizedName: string,
    exceptCategoryId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.skillCategory.findFirst({
      where: {
        clientId,
        normalizedName,
        ...(exceptCategoryId ? { id: { not: exceptCategoryId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) throw new ConflictException('Skill category name already exists');
  }
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeName(value: string): string {
  return normalizeDisplayName(value).toLowerCase();
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
