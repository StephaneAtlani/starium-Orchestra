import { buildChatbotKnowledgeSearchText } from './search-text-build.util';

describe('buildChatbotKnowledgeSearchText', () => {
  it('inclut content dans searchText pour matcher un mot uniquement dans content', () => {
    const st = buildChatbotKnowledgeSearchText({
      title: 'Titre',
      question: 'Q',
      answer: 'A',
      content: 'motsecretunique',
      keywords: [],
      tags: [],
      slug: 'slug',
    });
    expect(st).toContain('motsecretunique');
  });
});
