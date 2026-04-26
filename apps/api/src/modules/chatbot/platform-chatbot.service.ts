import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatbotKnowledgeScope,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import type { ListPlatformChatbotConversationsQueryDto } from './dto/list-platform-chatbot-conversations.query.dto';
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
import {
  STARIUM_FEEDBACK_CATEGORY_CODES,
  STARIUM_FEEDBACK_CATEGORY_LABELS,
  type StariumFeedbackCategoryCode,
} from './dto/starium-feedback-category';
import { buildChatbotKnowledgeSearchText } from '../search/search-text-build.util';

function feedbackCategoryDisplay(raw: string): string {
  if (
    STARIUM_FEEDBACK_CATEGORY_CODES.includes(
      raw as StariumFeedbackCategoryCode,
    )
  ) {
    return STARIUM_FEEDBACK_CATEGORY_LABELS[raw as StariumFeedbackCategoryCode];
  }
  return raw || '—';
}

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

    const searchText = buildChatbotKnowledgeSearchText({
      slug: dto.slug,
      title: dto.title,
      question: dto.question,
      answer: dto.answer,
      keywords: dto.keywords ?? [],
      tags: dto.tags ?? [],
      content: dto.content ?? null,
    });
    const now = new Date();
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
        searchText,
        indexedAt: now,
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

    const mergedForSearch = {
      slug: dto.slug ?? existing.slug,
      title: dto.title ?? existing.title,
      question: dto.question ?? existing.question,
      answer: dto.answer ?? existing.answer,
      keywords: dto.keywords ?? existing.keywords,
      tags: dto.tags ?? existing.tags,
      content:
        dto.content !== undefined ? dto.content : existing.content,
    };
    const searchText = buildChatbotKnowledgeSearchText(mergedForSearch);

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
        searchText,
        indexedAt: new Date(),
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

  /**
   * Catégories GLOBAL par défaut = une ligne par module actif (slug = code module avec _ → -).
   * Ne réactive pas une catégorie archivée manuellement.
   */
  private async ensureGlobalModuleDefaultCategories(): Promise<void> {
    const modules = await this.prisma.module.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    for (const [order, m] of modules.entries()) {
      const slug = m.code.replace(/_/g, '-');
      if (!this.slugPattern.test(slug)) continue;
      const existing = await this.prisma.chatbotCategory.findFirst({
        where: {
          scope: ChatbotKnowledgeScope.GLOBAL,
          clientId: null,
          slug,
        },
      });
      if (existing?.archivedAt) continue;
      if (existing) {
        await this.prisma.chatbotCategory.update({
          where: { id: existing.id },
          data: {
            name: m.name,
            description: m.description ?? null,
            order,
          },
        });
        continue;
      }
      await this.prisma.chatbotCategory.create({
        data: {
          name: m.name,
          slug,
          description: m.description ?? null,
          scope: ChatbotKnowledgeScope.GLOBAL,
          clientId: null,
          order,
          isActive: true,
          isFeatured: false,
          icon: null,
        },
      });
    }
  }

  async listCategories() {
    await this.ensureGlobalModuleDefaultCategories();
    return this.prisma.chatbotCategory.findMany({
      orderBy: [{ scope: 'asc' }, { order: 'asc' }],
    });
  }

  async listPlatformConversations(query: ListPlatformChatbotConversationsQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const [convs, total] = await Promise.all([
      this.prisma.chatbotConversation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          client: { select: { id: true, name: true, slug: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.chatbotConversation.count(),
    ]);
    const userIds = [...new Set(convs.map((c) => c.userId))];
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          });
    const userById = new Map(users.map((u) => [u.id, u]));
    return {
      total,
      limit,
      offset,
      items: convs.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
        client: c.client,
        user:
          userById.get(c.userId) ?? {
            id: c.userId,
            email: null as string | null,
            firstName: null as string | null,
            lastName: null as string | null,
          },
      })),
    };
  }

  async listPlatformConversationMessages(conversationId: string) {
    const conv = await this.prisma.chatbotConversation.findUnique({
      where: { id: conversationId },
      include: {
        client: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!conv) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({
      where: { id: conv.userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const messages = await this.prisma.chatbotMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        noAnswerFallbackUsed: true,
      },
    });
    return {
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        client: conv.client,
        user: user ?? {
          id: conv.userId,
          email: null,
          firstName: null,
          lastName: null,
        },
      },
      messages,
    };
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

  /** Tous les retours widget Starium (journal plateforme) — assistance, feedback, etc. */
  async listAssistanceSupportRequests() {
    const rows = await this.prisma.platformAuditLog.findMany({
      where: { action: 'USER_FEEDBACK_STARIUM' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { stariumFeedbackReplies: true } },
      },
    });
    const clientIds = [
      ...new Set(
        rows
          .map((r) => r.resourceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const clients =
      clientIds.length === 0
        ? []
        : await this.prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true, slug: true },
          });
    const clientById = new Map(clients.map((c) => [c.id, c]));
    return rows.map((r) => {
      const v = r.newValue as Record<string, unknown> | null;
      const rawCat = typeof v?.category === 'string' ? v.category : '';
      const categoryDisplay = feedbackCategoryDisplay(rawCat);
      const msg = typeof v?.message === 'string' ? v.message : '';
      const pagePath = typeof v?.pagePath === 'string' ? v.pagePath : null;
      const cid = r.resourceId;
      const client = cid ? clientById.get(cid) : undefined;
      const nameFromUser = [r.user?.firstName, r.user?.lastName]
        .filter(Boolean)
        .join(' ');
      const userDisplay =
        r.user?.email?.trim() || nameFromUser || '—';
      return {
        id: r.id,
        createdAt: r.createdAt,
        clientName: client?.name ?? '—',
        clientSlug: client?.slug ?? null,
        userDisplay,
        categoryDisplay,
        pagePath,
        messagePreview: msg.length > 400 ? `${msg.slice(0, 400)}…` : msg,
        replyCount: r._count.stariumFeedbackReplies,
      };
    });
  }

  async getStariumFeedbackThread(auditLogId: string) {
    const log = await this.prisma.platformAuditLog.findUnique({
      where: { id: auditLogId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        stariumFeedbackReplies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!log || log.action !== 'USER_FEEDBACK_STARIUM') {
      throw new NotFoundException();
    }
    const v = log.newValue as Record<string, unknown> | null;
    const rawCat = typeof v?.category === 'string' ? v.category : '';
    const msg = typeof v?.message === 'string' ? v.message : '';
    const pagePath = typeof v?.pagePath === 'string' ? v.pagePath : null;
    const nameFromUser = [log.user?.firstName, log.user?.lastName]
      .filter(Boolean)
      .join(' ');
    const authorDisplay =
      log.user?.email?.trim() || nameFromUser || '—';
    const formatAuthor = (u: {
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    }) => {
      const n = [u.firstName, u.lastName].filter(Boolean).join(' ');
      return u.email?.trim() || n || '—';
    };
    return {
      ticket: {
        id: log.id,
        createdAt: log.createdAt,
        categoryDisplay: feedbackCategoryDisplay(rawCat),
        message: msg,
        pagePath,
        authorDisplay,
      },
      replies: log.stariumFeedbackReplies.map((rep) => ({
        id: rep.id,
        createdAt: rep.createdAt,
        body: rep.body,
        authorDisplay: formatAuthor(rep.author),
      })),
    };
  }

  async postStariumFeedbackReply(
    auditLogId: string,
    authorUserId: string,
    message: string,
  ): Promise<{ id: string; createdAt: Date }> {
    const log = await this.prisma.platformAuditLog.findUnique({
      where: { id: auditLogId },
    });
    if (!log || log.action !== 'USER_FEEDBACK_STARIUM') {
      throw new NotFoundException();
    }
    const clientId = log.resourceId;
    if (!clientId) {
      throw new BadRequestException('Retour sans organisation cible.');
    }
    const body = message.trim();
    const reply = await this.prisma.platformStariumFeedbackReply.create({
      data: {
        platformAuditLogId: auditLogId,
        authorUserId,
        body,
      },
    });
    if (log.userId) {
      const preview =
        body.length > 800 ? `${body.slice(0, 800)}…` : body;
      await this.prisma.notification.create({
        data: {
          clientId,
          userId: log.userId,
          type: NotificationType.INFO,
          title: 'Réponse de l’équipe Starium',
          message: preview,
          status: NotificationStatus.UNREAD,
          entityType: 'platform_starium_feedback',
          entityId: auditLogId,
          entityLabel: 'Retour widget Cursor Starium',
        },
      });
    }
    return { id: reply.id, createdAt: reply.createdAt };
  }
}

