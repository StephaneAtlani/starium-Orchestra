import { ChatbotKnowledgeEntry } from '@prisma/client';
import { normalizeSearchParts, normalizeSearchText } from './search-normalize.util';

export function buildProjectSearchText(input: {
  name: string;
  code: string;
  description?: string | null;
}): string {
  return normalizeSearchParts([input.name, input.code, input.description]);
}

export function buildBudgetSearchText(input: {
  name: string;
  code: string;
  description?: string | null;
}): string {
  return normalizeSearchParts([input.name, input.code, input.description]);
}

export function buildChatbotKnowledgeSearchText(
  e: Pick<
    ChatbotKnowledgeEntry,
    'title' | 'question' | 'answer' | 'content' | 'keywords' | 'tags' | 'slug'
  >,
): string {
  const kw = (e.keywords ?? []).join(' ');
  const tags = (e.tags ?? []).join(' ');
  return normalizeSearchParts([
    e.title,
    e.question,
    e.answer,
    e.content,
    kw,
    tags,
    e.slug,
  ]);
}

/** Pour requête utilisateur : même normalisation que l’index. */
export function normalizeQueryForSearch(q: string): string {
  return normalizeSearchText(q);
}
