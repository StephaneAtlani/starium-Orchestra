import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AlertSeverity,
  AlertType,
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
  ChatbotMessageRole,
  NotificationStatus,
  NotificationType,
  Prisma,
  PlatformRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { ChatbotStructuredLink } from './chatbot-structured-links.validator';
import { parseAndValidateStructuredLinks } from './chatbot-structured-links.validator';
import {
  ChatbotEntryFilterService,
  type ChatbotEntryWithCategory,
} from './chatbot-entry-filter.service';
import { ChatbotMatchingService } from './chatbot-matching.service';
import { UserClientAccessService } from './user-client-access.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AlertsService } from '../alerts/alerts.service';
import type { PostChatbotFeedbackDto } from './dto/post-chatbot-feedback.dto';
import type { RequestMeta } from '../../common/decorators/request-meta.decorator';

const FALLBACK_DEFAULT =
  "Je n'ai pas encore de réponse configurée pour cette question.";

export type PublicCategory = {
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isFeatured: boolean;
  order: number;
};

export type PublicArticleCard = {
  title: string;
  slug: string;
  icon: string | null;
  type: ChatbotKnowledgeEntryType;
};

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entryFilter: ChatbotEntryFilterService,
    private readonly matching: ChatbotMatchingService,
    private readonly access: UserClientAccessService,
    private readonly auditLogs: AuditLogsService,
    private readonly alerts: AlertsService,
  ) {}

  private scopeWhere(clientId: string): Prisma.ChatbotKnowledgeEntryWhereInput {
    return {
      OR: [
        { scope: ChatbotKnowledgeScope.GLOBAL },
        {
          scope: ChatbotKnowledgeScope.CLIENT,
          clientId,
        },
      ],
    };
  }

  private categoryScopeWhere(clientId: string): Prisma.ChatbotCategoryWhereInput {
    return {
      OR: [
        { scope: ChatbotKnowledgeScope.GLOBAL },
        {
          scope: ChatbotKnowledgeScope.CLIENT,
          clientId,
        },
      ],
    };
  }

  async loadVisibleEntries(
    userId: string,
    clientId: string,
    extra?: Prisma.ChatbotKnowledgeEntryWhereInput,
  ): Promise<ChatbotEntryWithCategory[]> {
    const rows = await this.prisma.chatbotKnowledgeEntry.findMany({
      where: {
        AND: [this.scopeWhere(clientId), extra ?? {}],
      },
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
    });
    return this.entryFilter.filterVisibleEntries(userId, clientId, rows);
  }

  private async resolveStructuredLinks(
    raw: Prisma.JsonValue | null,
  ): Promise<ChatbotStructuredLink[]> {
    if (raw == null) return [];
    try {
      const parsed = await parseAndValidateStructuredLinks(this.prisma, raw);
      return parsed ?? [];
    } catch {
      return [];
    }
  }

  private async relatedPublic(
    userId: string,
    clientId: string,
    ids: string[],
  ): Promise<PublicArticleCard[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.chatbotKnowledgeEntry.findMany({
      where: { id: { in: ids } },
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
    });
    const visible = await this.entryFilter.filterVisibleEntries(
      userId,
      clientId,
      rows,
    );
    const byId = new Map(visible.map((e) => [e.id, e]));
    const out: PublicArticleCard[] = [];
    for (const id of ids) {
      const e = byId.get(id);
      if (e) {
        out.push({
          title: e.title,
          slug: e.slug,
          icon: e.icon,
          type: e.type,
        });
      }
    }
    return out;
  }

  async postMessage(
    userId: string,
    clientId: string,
    text: string,
    conversationId: string | undefined,
    _activeModuleCode: string | undefined,
  ) {
    const visible = await this.loadVisibleEntries(userId, clientId, {
      isActive: true,
      archivedAt: null,
    });

    const match = this.matching.matchBest(text, visible);

    let convId = conversationId;
    if (!convId) {
      const c = await this.prisma.chatbotConversation.create({
        data: {
          clientId,
          userId,
          title: text.slice(0, 80) || null,
        },
      });
      convId = c.id;
    } else {
      const owned = await this.prisma.chatbotConversation.findFirst({
        where: { id: convId, clientId, userId },
      });
      if (!owned) throw new NotFoundException('Conversation introuvable');
    }

    await this.prisma.chatbotMessage.create({
      data: {
        conversationId: convId,
        clientId,
        userId,
        role: ChatbotMessageRole.USER,
        content: text,
        matchedEntryId: null,
        noAnswerFallbackUsed: false,
      },
    });

    const permissionCodes = await this.access.resolvePermissionCodes(
      userId,
      clientId,
    );
    const clientUserRole = await this.access.getClientUserRole(
      userId,
      clientId,
    );
    const moduleCodes = new Set(
      visible.map((e) => e.moduleCode).filter(Boolean) as string[],
    );
    const moduleOk = new Map<string, boolean>();
    for (const code of moduleCodes) {
      moduleOk.set(
        code,
        await this.access.isModuleEnabledForClient(clientId, code),
      );
    }

    const ctx = { clientId, permissionCodes, clientUserRole, moduleOk };
    const featuredCats = await this.listCategoriesPublic(userId, clientId);
    const featured = featuredCats.filter((c) => c.isFeatured);
    const popularEntries = visible.filter((e) => e.isPopular);
    const popularArticles: PublicArticleCard[] = popularEntries
      .filter((e) => this.entryFilter.isEntryVisibleSync(e, ctx))
      .slice(0, 12)
      .map((e) => ({
        title: e.title,
        slug: e.slug,
        icon: e.icon,
        type: e.type,
      }));

    if (!match) {
      const fb = await this.resolveFallbackMessage(clientId);
      await this.prisma.chatbotMessage.create({
        data: {
          conversationId: convId,
          clientId,
          userId,
          role: ChatbotMessageRole.ASSISTANT,
          content: fb,
          matchedEntryId: null,
          noAnswerFallbackUsed: true,
        },
      });
      await this.prisma.chatbotConversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });
      return {
        conversationId: convId,
        answer: fb,
        entryId: null,
        slug: null,
        hasFullContent: false,
        structuredLinks: [],
        relatedArticles: [],
        score: null,
        fallbackMessage: fb,
        noAnswerFallbackUsed: true,
        recommendedCategories: featured,
        popularArticles,
      };
    }

    const e = match.entry;
    const structuredLinks = await this.resolveStructuredLinks(
      e.structuredLinks as Prisma.JsonValue,
    );
    const relatedArticles = await this.relatedPublic(
      userId,
      clientId,
      e.relatedEntryIds,
    );

    await this.prisma.chatbotMessage.create({
      data: {
        conversationId: convId,
        clientId,
        userId,
        role: ChatbotMessageRole.ASSISTANT,
        content: e.answer,
        matchedEntryId: e.id,
        noAnswerFallbackUsed: false,
      },
    });
    await this.prisma.chatbotConversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: convId,
      answer: e.answer,
      entryId: e.id,
      slug: e.slug,
      entryTitle: e.title,
      entryType: e.type,
      hasFullContent: !!(e.content && e.content.trim().length > 0),
      structuredLinks,
      relatedArticles,
      score: match.score,
      fallbackMessage: null,
      noAnswerFallbackUsed: false,
      recommendedCategories: featured,
      popularArticles,
    };
  }

  private async resolveFallbackMessage(clientId: string): Promise<string> {
    const rows = await this.prisma.chatbotKnowledgeEntry.findMany({
      where: {
        AND: [
          this.scopeWhere(clientId),
          { slug: 'system-fallback', isActive: true, archivedAt: null },
        ],
      },
      take: 1,
    });
    const e = rows[0];
    if (e?.answer?.trim()) return e.answer.trim();
    return FALLBACK_DEFAULT;
  }

  async listConversations(userId: string, clientId: string) {
    return this.prisma.chatbotConversation.findMany({
      where: { userId, clientId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }

  async listMessages(
    userId: string,
    clientId: string,
    conversationId: string,
  ) {
    const conv = await this.prisma.chatbotConversation.findFirst({
      where: { id: conversationId, userId, clientId },
    });
    if (!conv) throw new NotFoundException();
    const msgs = await this.prisma.chatbotMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        noAnswerFallbackUsed: true,
        createdAt: true,
        matchedEntryId: true,
      },
    });

    const ids = [
      ...new Set(
        msgs.map((m) => m.matchedEntryId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const entries =
      ids.length === 0
        ? []
        : await this.prisma.chatbotKnowledgeEntry.findMany({
            where: { id: { in: ids } },
            select: { id: true, slug: true, title: true, type: true },
          });
    const byId = new Map(entries.map((e) => [e.id, e]));

    return msgs.map((m) => {
      const ent = m.matchedEntryId ? byId.get(m.matchedEntryId) : undefined;
      return {
        role: m.role,
        content: m.content,
        noAnswerFallbackUsed: m.noAnswerFallbackUsed,
        createdAt: m.createdAt,
        matchedEntry:
          m.role === ChatbotMessageRole.ASSISTANT && ent
            ? { slug: ent.slug, title: ent.title, type: ent.type }
            : null,
      };
    });
  }

  async listCategoriesPublic(
    userId: string,
    clientId: string,
  ): Promise<PublicCategory[]> {
    const cats = await this.prisma.chatbotCategory.findMany({
      where: {
        AND: [
          this.categoryScopeWhere(clientId),
          { isActive: true, archivedAt: null },
        ],
      },
      orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { name: 'asc' }],
    });
    return cats.map((c) => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      isFeatured: c.isFeatured,
      order: c.order,
    }));
  }

  async listCategoryEntries(
    userId: string,
    clientId: string,
    categorySlug: string,
  ): Promise<PublicArticleCard[]> {
    const cat = await this.prisma.chatbotCategory.findFirst({
      where: {
        AND: [
          this.categoryScopeWhere(clientId),
          { slug: categorySlug, isActive: true, archivedAt: null },
        ],
      },
    });
    if (!cat) throw new NotFoundException();

    const rows = await this.prisma.chatbotKnowledgeEntry.findMany({
      where: {
        AND: [
          this.scopeWhere(clientId),
          { categoryId: cat.id, isActive: true, archivedAt: null },
        ],
      },
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
    });
    const visible = await this.entryFilter.filterVisibleEntries(
      userId,
      clientId,
      rows,
    );
    return visible.map((e) => ({
      title: e.title,
      slug: e.slug,
      icon: e.icon,
      type: e.type,
    }));
  }

  async getEntryPublicBySlug(userId: string, clientId: string, slug: string) {
    const rows = await this.prisma.chatbotKnowledgeEntry.findMany({
      where: {
        AND: [this.scopeWhere(clientId), { slug, isActive: true, archivedAt: null }],
      },
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
    });
    const visible = await this.entryFilter.filterVisibleEntries(
      userId,
      clientId,
      rows,
    );
    const e = visible[0];
    if (!e) throw new NotFoundException();

    const structuredLinks = await this.resolveStructuredLinks(
      e.structuredLinks as Prisma.JsonValue,
    );
    const relatedArticles = await this.relatedPublic(
      userId,
      clientId,
      e.relatedEntryIds,
    );

    return {
      title: e.title,
      slug: e.slug,
      answer: e.answer,
      content: e.content,
      structuredLinks,
      relatedArticles,
      category: e.category
        ? {
            name: e.category.name,
            slug: e.category.slug,
            icon: e.category.icon,
          }
        : null,
    };
  }

  async explore(userId: string, clientId: string, q?: string) {
    const categoriesAll = await this.listCategoriesPublic(userId, clientId);
    const visible = await this.loadVisibleEntries(userId, clientId, {
      isActive: true,
      archivedAt: null,
    });

    const categorySlugsWithArticles = new Set<string>();
    for (const e of visible) {
      if (
        e.type === ChatbotKnowledgeEntryType.ARTICLE &&
        e.category?.slug
      ) {
        categorySlugsWithArticles.add(e.category.slug);
      }
    }
    const categories = categoriesAll.filter((c) =>
      categorySlugsWithArticles.has(c.slug),
    );

    let articles = visible.filter((e) => e.type === ChatbotKnowledgeEntryType.ARTICLE);
    const qn = (q ?? '').trim().toLowerCase();
    if (qn.length >= 2) {
      articles = articles.filter(
        (e) =>
          e.title.toLowerCase().includes(qn) ||
          e.question.toLowerCase().includes(qn) ||
          e.slug.toLowerCase().includes(qn),
      );
    }

    return {
      categories,
      featuredCategories: categories.filter((c) => c.isFeatured),
      popularArticles: visible
        .filter((e) => e.isPopular)
        .slice(0, 12)
        .map((e) => ({
          title: e.title,
          slug: e.slug,
          icon: e.icon,
          type: e.type,
        })),
      articles: articles.slice(0, 50).map((e) => ({
        title: e.title,
        slug: e.slug,
        icon: e.icon,
        type: e.type,
      })),
    };
  }

  /**
   * Retour utilisateur vers l’équipe Starium — persistance via journal plateforme (consultation admin / exports).
   */
  async submitFeedback(
    userId: string,
    clientId: string,
    dto: PostChatbotFeedbackDto,
    meta: RequestMeta,
  ): Promise<{ ok: true }> {
    const message = dto.message.trim();
    const pagePath = dto.pagePath?.trim() || null;
    const category = dto.category;

    await this.auditLogs.createPlatform({
      userId,
      action: 'USER_FEEDBACK_STARIUM',
      resourceType: 'PRODUCT_FEEDBACK',
      resourceId: clientId,
      newValue: {
        category,
        message,
        pagePath,
        source: 'cursor_starium_chat_widget',
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    // Assistance générale + retours « Assistance Cursor Starium » (code CHATBOT) :
    // alerte client + notifs admins plateforme + visibilité onglet Support admin.
    if (category === 'ASSISTANCE' || category === 'CHATBOT') {
      const entityId = randomUUID();
      const preview =
        message.length > 280 ? `${message.slice(0, 280)}…` : message;
      const ruleCode =
        category === 'CHATBOT'
          ? 'chatbot.feedback.cursor_starium'
          : 'chatbot.feedback.assistance';
      const entityLabel =
        category === 'CHATBOT'
          ? 'Assistance Cursor Starium (widget)'
          : 'Demande assistance (widget Starium)';
      const title =
        category === 'CHATBOT'
          ? 'Assistance Cursor Starium — incident / demande'
          : 'Demande d’assistance (Cursor Starium)';
      const alert = await this.alerts.upsertAlert({
        clientId,
        actorUserId: userId,
        type: AlertType.GENERIC,
        severity: AlertSeverity.WARNING,
        ruleCode,
        entityType: 'chatbot.feedback',
        entityId,
        entityLabel,
        title,
        message: preview,
        metadata: { pagePath, feedbackUserId: userId, feedbackCategory: category },
        meta: {
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
      });

      const platformAdmins = await this.prisma.user.findMany({
        where: { platformRole: PlatformRole.PLATFORM_ADMIN },
        select: { id: true },
      });
      for (const admin of platformAdmins) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            clientId,
            userId: admin.id,
            alertId: alert.id,
          },
        });
        if (existing) continue;
        await this.prisma.notification.create({
          data: {
            clientId,
            userId: admin.id,
            alertId: alert.id,
            type: NotificationType.ALERT,
            title,
            message: preview,
            status: NotificationStatus.UNREAD,
            entityType: 'chatbot.feedback',
            entityId,
            entityLabel,
            alertSeverity: AlertSeverity.WARNING,
          },
        });
      }
    }

    return { ok: true };
  }
}
