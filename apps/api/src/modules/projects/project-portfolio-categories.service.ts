import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectPortfolioCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import { CreateProjectPortfolioCategoryDto } from './dto/create-project-portfolio-category.dto';
import { ReorderProjectPortfolioCategoriesDto } from './dto/reorder-project-portfolio-categories.dto';
import { UpdateProjectPortfolioCategoryDto } from './dto/update-project-portfolio-category.dto';

export type CategoryNodeDto = {
  id: string;
  clientId: string;
  parentId: string | null;
  name: string;
  slug: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string } | null;
  children?: CategoryNodeDto[];
};

@Injectable()
export class ProjectPortfolioCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private toNode(
    item: ProjectPortfolioCategory & {
      parent?: { id: string; name: string } | null;
      children?: ProjectPortfolioCategory[];
    },
  ): CategoryNodeDto {
    return {
      id: item.id,
      clientId: item.clientId,
      parentId: item.parentId,
      name: item.name,
      slug: item.slug,
      color: item.color,
      icon: item.icon,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      parent: item.parent ?? undefined,
      children: item.children?.map((child) => this.toNode(child as any)),
    };
  }

  private async findScopedOrThrow(clientId: string, id: string) {
    const row = await this.prisma.projectPortfolioCategory.findFirst({
      where: { id, clientId },
    });
    if (!row) {
      throw new NotFoundException('Project portfolio category not found');
    }
    return row;
  }

  private async assertUniqueName(
    clientId: string,
    parentId: string | null,
    name: string,
    ignoreId?: string,
  ) {
    const normalizedName = this.normalizeName(name);
    const conflict = await this.prisma.projectPortfolioCategory.findFirst({
      where: {
        clientId,
        parentId,
        normalizedName,
        id: ignoreId ? { not: ignoreId } : undefined,
      },
    });
    if (conflict) {
      throw new ConflictException(
        'A category with the same name already exists under this parent',
      );
    }
  }

  private async validateParentScope(
    clientId: string,
    parentId: string | null | undefined,
    currentId?: string,
  ): Promise<ProjectPortfolioCategory | null> {
    if (!parentId) return null;
    if (currentId && currentId === parentId) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    const parent = await this.prisma.projectPortfolioCategory.findFirst({
      where: { id: parentId, clientId },
    });
    if (!parent) {
      throw new BadRequestException('Parent category not found in active client');
    }
    if (parent.parentId) {
      throw new BadRequestException('Only root categories can be selected as parent');
    }
    return parent;
  }

  async list(clientId: string): Promise<CategoryNodeDto[]> {
    const roots = await this.prisma.projectPortfolioCategory.findMany({
      where: { clientId, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });
    return roots.map((root) => this.toNode(root));
  }

  async getById(clientId: string, id: string): Promise<CategoryNodeDto> {
    const row = await this.prisma.projectPortfolioCategory.findFirst({
      where: { id, clientId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      },
    });
    if (!row) {
      throw new NotFoundException('Project portfolio category not found');
    }
    return this.toNode(row as any);
  }

  async create(
    clientId: string,
    dto: CreateProjectPortfolioCategoryDto,
    context?: AuditContext,
  ): Promise<CategoryNodeDto> {
    const name = dto.name.trim();
    const parent = await this.validateParentScope(clientId, dto.parentId ?? null);
    await this.assertUniqueName(clientId, parent?.id ?? null, name);
    const lastSibling = await this.prisma.projectPortfolioCategory.findFirst({
      where: { clientId, parentId: parent?.id ?? null },
      orderBy: [{ sortOrder: 'desc' }],
      select: { sortOrder: true },
    });
    const nextSortOrder = (lastSibling?.sortOrder ?? -1) + 1;

    const created = await this.prisma.projectPortfolioCategory.create({
      data: {
        clientId,
        parentId: parent?.id ?? null,
        name,
        normalizedName: this.normalizeName(name),
        slug: dto.slug?.trim() || null,
        color: dto.color?.trim() || null,
        icon: dto.icon?.trim() || null,
        sortOrder: dto.sortOrder ?? nextSortOrder,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_PORTFOLIO_CATEGORY,
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        parentId: created.parentId,
        isActive: created.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, created.id);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateProjectPortfolioCategoryDto,
    context?: AuditContext,
  ): Promise<CategoryNodeDto> {
    const existing = await this.findScopedOrThrow(clientId, id);
    const nextParentId = dto.parentId === undefined ? existing.parentId : dto.parentId;
    const nextParent = await this.validateParentScope(clientId, nextParentId, id);
    const nextName = dto.name?.trim() ?? existing.name;

    // If node has children, it is a root. Moving it under a parent would create depth 3.
    const childCount = await this.prisma.projectPortfolioCategory.count({
      where: { clientId, parentId: id },
    });
    if (childCount > 0 && nextParent) {
      throw new BadRequestException(
        'Cannot move a root category with children under another parent',
      );
    }

    await this.assertUniqueName(clientId, nextParent?.id ?? null, nextName, id);

    const updated = await this.prisma.projectPortfolioCategory.update({
      where: { id },
      data: {
        parentId: nextParent?.id ?? null,
        name: nextName,
        normalizedName: this.normalizeName(nextName),
        slug: dto.slug !== undefined ? dto.slug?.trim() || null : undefined,
        color: dto.color !== undefined ? dto.color?.trim() || null : undefined,
        icon: dto.icon !== undefined ? dto.icon?.trim() || null : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_PORTFOLIO_CATEGORY,
      resourceId: updated.id,
      oldValue: {
        name: existing.name,
        parentId: existing.parentId,
        isActive: existing.isActive,
      },
      newValue: {
        name: updated.name,
        parentId: updated.parentId,
        isActive: updated.isActive,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  async reorder(
    clientId: string,
    dto: ReorderProjectPortfolioCategoriesDto,
    context?: AuditContext,
  ): Promise<CategoryNodeDto[]> {
    const parentId = dto.parentId ?? null;
    if (parentId) {
      await this.validateParentScope(clientId, parentId);
    }
    const ids = dto.items.map((item) => item.id);
    const rows = await this.prisma.projectPortfolioCategory.findMany({
      where: { clientId, id: { in: ids } },
      select: { id: true, parentId: true },
    });
    if (rows.length !== ids.length) {
      throw new BadRequestException('One or more categories are out of active client scope');
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate category ids are not allowed');
    }
    if (rows.some((row) => row.parentId !== parentId)) {
      throw new BadRequestException(
        'Reorder is only allowed for categories with the same parent',
      );
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.projectPortfolioCategory.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_REORDERED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_PORTFOLIO_CATEGORY,
      newValue: { parentId, items: dto.items },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    const updatedRows = await this.prisma.projectPortfolioCategory.findMany({
      where: { clientId, parentId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return updatedRows.map((row) => this.toNode(row));
  }

  async remove(clientId: string, id: string, context?: AuditContext): Promise<void> {
    const existing = await this.findScopedOrThrow(clientId, id);
    const [childrenCount, projectsCount] = await Promise.all([
      this.prisma.projectPortfolioCategory.count({
        where: { clientId, parentId: id },
      }),
      this.prisma.project.count({
        where: { clientId, portfolioCategoryId: id },
      }),
    ]);
    if (childrenCount > 0) {
      throw new BadRequestException(
        'Cannot delete a category that still has children. Disable it instead.',
      );
    }
    if (projectsCount > 0) {
      throw new BadRequestException(
        'Cannot delete a category that is still linked to projects. Disable it instead.',
      );
    }

    await this.prisma.projectPortfolioCategory.delete({ where: { id } });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_PORTFOLIO_CATEGORY,
      resourceId: id,
      oldValue: {
        name: existing.name,
        parentId: existing.parentId,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
