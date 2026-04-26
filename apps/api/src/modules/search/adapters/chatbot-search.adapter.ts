import { Injectable } from '@nestjs/common';
import { ChatbotKnowledgeScope, ChatbotKnowledgeEntryType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatbotEntryFilterService } from '../../chatbot/chatbot-entry-filter.service';
import type { SearchAdapter, SearchAdapterContext } from '../search.adapter';
import { SEARCH_ADAPTER_DB_TAKE } from '../search.constants';
import type { InternalSearchHit } from '../search.types';

@Injectable()
export class ChatbotSearchAdapter implements SearchAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entryFilter: ChatbotEntryFilterService,
  ) {}

  async search(ctx: SearchAdapterContext): Promise<InternalSearchHit[]> {
    if (!ctx.normalizedQuery) return [];

    const nq = ctx.normalizedQuery;
    const rows = await this.prisma.chatbotKnowledgeEntry.findMany({
      where: {
        AND: [
          {
            OR: [
              { scope: ChatbotKnowledgeScope.GLOBAL },
              {
                scope: ChatbotKnowledgeScope.CLIENT,
                clientId: ctx.clientId,
              },
            ],
          },
          { isActive: true },
          { archivedAt: null },
          {
            OR: [
              { searchText: { contains: nq, mode: 'insensitive' } },
              { title: { contains: nq, mode: 'insensitive' } },
              { slug: { contains: nq, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: SEARCH_ADAPTER_DB_TAKE,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: {
        category: { select: { slug: true, name: true, icon: true } },
      },
    });

    const visible = await this.entryFilter.filterVisibleEntries(
      ctx.userId,
      ctx.clientId,
      rows,
    );

    return visible.map((e) => ({
      moduleCode: 'help',
      moduleLabel: 'Aide / Articles',
      groupType: 'HELP',
      groupIcon: 'FileText',
      title: e.title,
      subtitle: e.type === ChatbotKnowledgeEntryType.FAQ ? 'FAQ' : undefined,
      route: `/chatbot/explore/article/${encodeURIComponent(e.slug)}`,
      hitType: e.type === ChatbotKnowledgeEntryType.FAQ ? 'FAQ' : 'ARTICLE',
      score: scoreEntry(e, nq),
    }));
  }
}

function scoreEntry(
  e: {
    title: string;
    slug: string;
    searchText: string | null;
    priority: number;
    isFeatured: boolean;
    isPopular: boolean;
  },
  nq: string,
): number {
  let s = 0;
  const t = e.title.toLowerCase();
  if (t.includes(nq)) s += 100;
  if (e.slug.toLowerCase().includes(nq)) s += 70;
  if (e.searchText?.toLowerCase().includes(nq)) s += 50;
  s += Math.min(e.priority, 20) * 0.5;
  if (e.isFeatured) s += 5;
  if (e.isPopular) s += 3;
  return s;
}
