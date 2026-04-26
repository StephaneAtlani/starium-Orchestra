import { ConfigService } from '@nestjs/config';
import {
  ChatbotKnowledgeEntryType,
  ChatbotKnowledgeScope,
} from '@prisma/client';
import { ChatbotMatchingService } from './chatbot-matching.service';
import type { ChatbotEntryWithCategory } from './chatbot-entry-filter.service';

function entry(partial: Partial<ChatbotEntryWithCategory>): ChatbotEntryWithCategory {
  return {
    id: partial.id ?? 'e1',
    slug: partial.slug ?? 's',
    title: partial.title ?? 'T',
    question: partial.question ?? 'Q',
    answer: partial.answer ?? 'A',
    keywords: partial.keywords ?? [],
    tags: partial.tags ?? [],
    moduleCode: partial.moduleCode ?? null,
    targetRole: partial.targetRole ?? null,
    requiredPermission: partial.requiredPermission ?? null,
    categoryId: partial.categoryId ?? null,
    type: partial.type ?? ChatbotKnowledgeEntryType.FAQ,
    scope: partial.scope ?? ChatbotKnowledgeScope.GLOBAL,
    clientId: partial.clientId ?? null,
    isActive: partial.isActive ?? true,
    archivedAt: partial.archivedAt ?? null,
    priority: partial.priority ?? 0,
    isFeatured: partial.isFeatured ?? false,
    isPopular: partial.isPopular ?? false,
    icon: partial.icon ?? null,
    content: partial.content ?? null,
    searchText: partial.searchText ?? null,
    indexedAt: partial.indexedAt ?? null,
    structuredLinks: partial.structuredLinks ?? null,
    relatedEntryIds: partial.relatedEntryIds ?? [],
    createdByUserId: partial.createdByUserId ?? 'u1',
    updatedByUserId: partial.updatedByUserId ?? 'u1',
    createdAt: partial.createdAt ?? new Date(),
    updatedAt: partial.updatedAt ?? new Date(),
    category: partial.category ?? null,
  };
}

describe('ChatbotMatchingService', () => {
  const config = {
    get: (_k: string) => undefined,
  } as unknown as ConfigService;

  it('choisit la question exacte normalisée', () => {
    const svc = new ChatbotMatchingService(config);
    const best = svc.matchBest('Budget annuel', [
      entry({ id: '1', question: 'Autre sujet', priority: 10 }),
      entry({ id: '2', question: 'Budget annuel', priority: 0 }),
    ]);
    expect(best?.entry.id).toBe('2');
  });

  it('matche un ARTICLE quand un mot significatif de la question apparaît dans le titre', () => {
    const svc = new ChatbotMatchingService(config);
    const best = svc.matchBest('comment créer un projet', [
      entry({
        type: ChatbotKnowledgeEntryType.ARTICLE,
        id: 'art2',
        title: 'Guide des projets — Starium',
        question: 'Sommaire',
        keywords: [],
        tags: [],
        priority: 0,
      }),
    ]);
    expect(best?.entry.id).toBe('art2');
  });

  it('matche un ARTICLE lorsque la question utilisateur contient le titre', () => {
    const svc = new ChatbotMatchingService(config);
    const best = svc.matchBest('comment créer un projet sur la plateforme', [
      entry({
        type: ChatbotKnowledgeEntryType.ARTICLE,
        id: 'art1',
        title: 'Créer un projet',
        question: 'Introduction',
        keywords: [],
        tags: [],
        priority: 2,
      }),
    ]);
    expect(best?.entry.id).toBe('art1');
  });

  it('retourne null si aucune FAQ ni ARTICLE pertinente', () => {
    const svc = new ChatbotMatchingService(config);
    const best = svc.matchBest('hello xyz inconnu', [
      entry({
        type: ChatbotKnowledgeEntryType.ARTICLE,
        question: 'x',
        title: 'y',
        keywords: [],
        tags: [],
      }),
    ]);
    expect(best).toBeNull();
  });
});
