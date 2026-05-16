import { describe, expect, it, vi } from 'vitest';
import { getAccessModelHealth, listAccessModelIssues } from './access-model.api';

describe('access-model.api', () => {
  it('getAccessModelHealth cible /api/access-model/health', async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rollout: [],
        kpis: {
          resourcesMissingOwner: { total: 0, byModule: {} },
          membersMissingHumanWithScopedPerms: { total: 0 },
          atypicalAclShares: { total: 0 },
          policyReviewHints: { total: 0 },
        },
      }),
    });
    await getAccessModelHealth(authFetch);
    expect(authFetch).toHaveBeenCalledWith('/api/access-model/health');
  });

  it('listAccessModelIssues encode category et filtres', async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        page: 1,
        limit: 25,
        total: 0,
        truncated: false,
      }),
    });
    await listAccessModelIssues(authFetch, {
      category: 'missing_human',
      page: 2,
      module: 'budgets',
      search: 'dupont',
    });
    const url = String(authFetch.mock.calls[0][0]);
    expect(url).toContain('/api/access-model/issues?');
    expect(url).toContain('category=missing_human');
    expect(url).toContain('page=2');
    expect(url).toContain('module=budgets');
    expect(url).toContain('search=dupont');
  });
});
