import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
  ChatbotMessageRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ChatbotStructuredLink } from './chatbot-structured-links.validator';
import { parseAndValidateStructuredLinks } from './chatbot-structured-links.validator';
import {
  ChatbotEntryFilterService,
  type ChatbotEntryWithCategory,
} from './chatbot-entry-filter.service';
import { ChatbotMatchingService } from './chatbot-matching.service';
import { UserClientAccessService } from './user-client-access.service';

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
      hasFullContent: !!(e.content && e.content.trim().length > 0),
      structuredLinks,
      relatedArticles,
      score: match.score,
      fallbackMessage: null,
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
    return this.prisma.chatbotMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        noAnswerFallbackUsed: true,
        createdAt: true,
      },
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
    const categories = await this.listCategoriesPublic(userId, clientId);
    const visible = await this.loadVisibleEntries(userId, clientId, {
      isActive: true,
      archivedAt: null,
    });

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
}
