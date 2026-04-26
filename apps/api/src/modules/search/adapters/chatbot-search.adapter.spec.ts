import {
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
} from '@prisma/client';
import { ChatbotSearchAdapter } from './chatbot-search.adapter';
import { ChatbotEntryFilterService } from '../../chatbot/chatbot-entry-filter.service';

describe('ChatbotSearchAdapter', () => {
  it('applique filterVisibleEntries après la requête Prisma', async () => {
    const prisma = {
      chatbotKnowledgeEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'e1',
            slug: 'secret',
            title: 'T',
            question: 'Q',
            answer: 'A',
            keywords: [],
            tags: [],
            type: ChatbotKnowledgeEntryType.ARTICLE,
            scope: ChatbotKnowledgeScope.GLOBAL,
            clientId: null,
            isActive: true,
            archivedAt: null,
            priority: 0,
            isFeatured: false,
            isPopular: false,
            searchText: 'xyzuniquecontenttoken',
            content: 'body',
            category: null,
          },
        ]),
      },
    };
    const filter = {
      filterVisibleEntries: jest.fn().mockResolvedValue([]),
    };
    const adapter = new ChatbotSearchAdapter(
      prisma as never,
      filter as unknown as ChatbotEntryFilterService,
    );
    const out = await adapter.search({
      userId: 'u1',
      clientId: 'c1',
      normalizedQuery: 'xyzuniquecontenttoken',
      permissionCodes: new Set(),
    });
    expect(prisma.chatbotKnowledgeEntry.findMany).toHaveBeenCalled();
    expect(filter.filterVisibleEntries).toHaveBeenCalledWith(
      'u1',
      'c1',
      expect.any(Array),
    );
    expect(out).toEqual([]);
  });

  it('retourne des hits quand filterVisibleEntries garde des entrées', async () => {
    const row = {
      id: 'e1',
      slug: 'guide',
      title: 'Guide',
      question: 'Q',
      answer: 'A',
      keywords: [] as string[],
      tags: [] as string[],
      type: ChatbotKnowledgeEntryType.ARTICLE,
      scope: ChatbotKnowledgeScope.GLOBAL,
      clientId: null,
      isActive: true,
      archivedAt: null,
      priority: 0,
      isFeatured: false,
      isPopular: false,
      searchText: 'guide uniqueword',
      content: 'deep',
      category: null,
    };
    const prisma = {
      chatbotKnowledgeEntry: {
        findMany: jest.fn().mockResolvedValue([row]),
      },
    };
    const filter = {
      filterVisibleEntries: jest.fn().mockImplementation(async (_u, _c, rows) => rows),
    };
    const adapter = new ChatbotSearchAdapter(
      prisma as never,
      filter as unknown as ChatbotEntryFilterService,
    );
    const out = await adapter.search({
      userId: 'u1',
      clientId: 'c1',
      normalizedQuery: 'uniqueword',
      permissionCodes: new Set(),
    });
    expect(out).toHaveLength(1);
    expect(out[0].moduleCode).toBe('help');
    expect(out[0].route).toContain('/chatbot/explore/article/');
    expect(out[0].title).toBe('Guide');
  });
});
