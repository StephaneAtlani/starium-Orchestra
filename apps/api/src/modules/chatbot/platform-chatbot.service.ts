import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatbotKnowledgeScope,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { parseAndValidateStructuredLinks } from './chatbot-structured-links.validator';
import {
  CreateChatbotCategoryDto,
  UpdateChatbotCategoryDto,
} from './dto/create-chatbot-category.dto';
import {
  CreateChatbotEntryDto,
  UpdateChatbotEntryDto,
} from './dto/create-chatbot-entry.dto';

function assertScopeClientConsistency(
  scope: ChatbotKnowledgeScope,
  clientId: string | null | undefined,
): void {
  if (scope === ChatbotKnowledgeScope.CLIENT && !clientId) {
    throw new BadRequestException('scope=CLIENT impose clientId');
  }
  if (scope === ChatbotKnowledgeScope.GLOBAL && clientId) {
    throw new BadRequestException('scope=GLOBAL interdit avec clientId');
  }
}

@Injectable()
export class PlatformChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  private assertSlug(slug: string) {
    if (!this.slugPattern.test(slug)) {
      throw new BadRequestException(
        'slug : format URL-safe requis (minuscules, chiffres, tirets)',
      );
    }
  }

  async listEntries() {
    return this.prisma.chatbotKnowledgeEntry.findMany({
      orderBy: [{ scope: 'asc' }, { clientId: 'asc' }, { priority: 'desc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async getEntry(id: string) {
    const e = await this.prisma.chatbotKnowledgeEntry.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!e) throw new NotFoundException();
    return e;
  }

  async createEntry(dto: CreateChatbotEntryDto, actorUserId: string) {
    assertScopeClientConsistency(dto.scope, dto.clientId ?? null);
    this.assertSlug(dto.slug);
    const links = await parseAndValidateStructuredLinks(
      this.prisma,
      dto.structuredLinks,
    );
    await this.assertCategoryCoherent(
      dto.categoryId ?? null,
      dto.scope,
      dto.clientId ?? null,
    );

    return this.prisma.chatbotKnowledgeEntry.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        question: dto.question,
        answer: dto.answer,
        keywords: dto.keywords ?? [],
        tags: dto.tags ?? [],
        moduleCode: dto.moduleCode ?? null,
        targetRole: dto.targetRole ?? null,
        requiredPermission: dto.requiredPermission ?? null,
        categoryId: dto.categoryId ?? null,
        type: dto.type,
        scope: dto.scope,
        clientId: dto.clientId ?? null,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
        isFeatured: dto.isFeatured ?? false,
        isPopular: dto.isPopular ?? false,
        icon: dto.icon ?? null,
        content: dto.content ?? null,
        structuredLinks: links
          ? (links as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        relatedEntryIds: dto.relatedEntryIds ?? [],
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      include: { category: true },
    });
  }

  async updateEntry(id: string, dto: UpdateChatbotEntryDto, actorUserId: string) {
    const existing = await this.getEntry(id);
    const scope = dto.scope ?? existing.scope;
    const clientId =
      dto.clientId !== undefined ? dto.clientId : existing.clientId;
    assertScopeClientConsistency(scope, clientId);
    if (dto.slug) this.assertSlug(dto.slug);

    let structuredLinksUpdate:
      | Prisma.InputJsonValue
      | typeof Prisma.JsonNull
      | undefined = undefined;
    if (dto.structuredLinks !== undefined) {
      const parsed = await parseAndValidateStructuredLinks(
        this.prisma,
        dto.structuredLinks,
      );
      structuredLinksUpdate =
        parsed != null
          ? (parsed as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }

    const categoryId =
      dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
    await this.assertCategoryCoherent(categoryId, scope, clientId);

    return this.prisma.chatbotKnowledgeEntry.update({
      where: { id },
      data: {
        ...(dto.slug != null && { slug: dto.slug }),
        ...(dto.title != null && { title: dto.title }),
        ...(dto.question != null && { question: dto.question }),
        ...(dto.answer != null && { answer: dto.answer }),
        ...(dto.keywords != null && { keywords: dto.keywords }),
        ...(dto.tags != null && { tags: dto.tags }),
        ...(dto.moduleCode !== undefined && { moduleCode: dto.moduleCode }),
        ...(dto.targetRole !== undefined && { targetRole: dto.targetRole }),
        ...(dto.requiredPermission !== undefined && {
          requiredPermission: dto.requiredPermission,
        }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.scope != null && { scope: dto.scope }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.isActive != null && { isActive: dto.isActive }),
        ...(dto.priority != null && { priority: dto.priority }),
        ...(dto.isFeatured != null && { isFeatured: dto.isFeatured }),
        ...(dto.isPopular != null && { isPopular: dto.isPopular }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(structuredLinksUpdate !== undefined && {
          structuredLinks: structuredLinksUpdate,
        }),
        ...(dto.relatedEntryIds != null && {
          relatedEntryIds: dto.relatedEntryIds,
        }),
        updatedByUserId: actorUserId,
      },
      include: { category: true },
    });
  }

  async archiveEntry(
    id: string,
    actorUserId: string,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const e = await this.getEntry(id);
    const now = new Date();
    await this.prisma.chatbotKnowledgeEntry.update({
      where: { id },
      data: { isActive: false, archivedAt: now, updatedByUserId: actorUserId },
    });

    const payload = {
      resourceId: id,
      userId: actorUserId,
      action: 'chatbot.entry.archived',
      resourceType: 'chatbot.entry',
      oldValue: { isActive: e.isActive },
      newValue: { isActive: false, archivedAt: now.toISOString() },
      ...meta,
    };

    if (e.scope === ChatbotKnowledgeScope.GLOBAL) {
      await this.auditLogs.createPlatform(payload);
    } else if (e.clientId) {
      await this.auditLogs.create({
        clientId: e.clientId,
        ...payload,
      });
    }
  }

  private async assertCategoryCoherent(
    categoryId: string | null,
    scope: ChatbotKnowledgeScope,
    clientId: string | null,
  ) {
    if (!categoryId) return;
    const cat = await this.prisma.chatbotCategory.findUnique({
      where: { id: categoryId },
    });
    if (!cat) throw new BadRequestException('Catégorie introuvable');
    if (cat.scope !== scope || cat.clientId !== clientId) {
      throw new BadRequestException(
        'L’entrée et la catégorie doivent partager le même scope et clientId',
      );
    }
  }

  async listCategories() {
    return this.prisma.chatbotCategory.findMany({
      orderBy: [{ scope: 'asc' }, { order: 'asc' }],
    });
  }

  async createCategory(dto: CreateChatbotCategoryDto) {
    assertScopeClientConsistency(dto.scope, dto.clientId ?? null);
    this.assertSlug(dto.slug);
    return this.prisma.chatbotCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        isFeatured: dto.isFeatured ?? false,
        scope: dto.scope,
        clientId: dto.clientId ?? null,
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateChatbotCategoryDto) {
    const existing = await this.prisma.chatbotCategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    const scope = dto.scope ?? existing.scope;
    const clientId =
      dto.clientId !== undefined ? dto.clientId : existing.clientId;
    assertScopeClientConsistency(scope, clientId);
    if (dto.slug) this.assertSlug(dto.slug);

    return this.prisma.chatbotCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.slug != null && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isFeatured != null && { isFeatured: dto.isFeatured }),
        ...(dto.scope != null && { scope: dto.scope }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.isActive != null && { isActive: dto.isActive }),
        ...(dto.order != null && { order: dto.order }),
      },
    });
  }

  async archiveCategory(
    id: string,
    actorUserId: string,
    meta: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const c = await this.prisma.chatbotCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    const now = new Date();
    await this.prisma.chatbotCategory.update({
      where: { id },
      data: { isActive: false, archivedAt: now },
    });

    const payload = {
      resourceId: id,
      userId: actorUserId,
      action: 'chatbot.category.archived',
      resourceType: 'chatbot.category',
      oldValue: { isActive: c.isActive },
      newValue: { isActive: false, archivedAt: now.toISOString() },
      ...meta,
    };

    if (c.scope === ChatbotKnowledgeScope.GLOBAL) {
      await this.auditLogs.createPlatform(payload);
    } else if (c.clientId) {
      await this.auditLogs.create({
        clientId: c.clientId,
        ...payload,
      });
    }
  }
}
