import { describe, expect, it } from 'vitest';
import { resolveOrionPersonality } from './orion-assets';

const base = {
  tab: 'home' as const,
  status: 'idle' as const,
};

describe('resolveOrionPersonality', () => {
  it('retourne normal pour le lanceur sans non-lus', () => {
    expect(
      resolveOrionPersonality({ ...base, launcher: true, hasUnread: false }),
    ).toBe('normal');
  });

  it('retourne message pour le lanceur avec non-lus', () => {
    expect(
      resolveOrionPersonality({ ...base, launcher: true, hasUnread: true }),
    ).toBe('message');
  });

  it('retourne attention en cas d erreur ou client manquant', () => {
    expect(resolveOrionPersonality({ ...base, status: 'error' })).toBe('attention');
    expect(resolveOrionPersonality({ ...base, status: 'unauthorized' })).toBe(
      'attention',
    );
  });

  it('retourne thinking pendant le chargement', () => {
    expect(resolveOrionPersonality({ ...base, status: 'loading' })).toBe('thinking');
    expect(
      resolveOrionPersonality({ ...base, status: 'idle', remoteArticleLoading: true }),
    ).toBe('thinking');
  });

  it('retourne message sur accueil avec conversation récente', () => {
    expect(
      resolveOrionPersonality({ ...base, hasRecentConversation: true }),
    ).toBe('message');
  });

  it('retourne message sur l onglet conversations', () => {
    expect(
      resolveOrionPersonality({ ...base, tab: 'conversations' }),
    ).toBe('message');
  });
});
