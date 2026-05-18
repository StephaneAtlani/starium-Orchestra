import { describe, expect, it, vi } from 'vitest';
import {
  downloadAccessModelIssuesCsv,
  getAccessModelHealth,
  listAccessModelIssues,
} from './access-model.api';

describe('access-model.api', () => {
  it('getAccessModelHealth cible /api/access-model/health', async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generatedAt: '2026-01-01T00:00:00.000Z',
        rollout: [],
        checklist: [],
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

  it('downloadAccessModelIssuesCsv encode export sans page/limit', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:mock'),
        revokeObjectURL: vi.fn(),
      }),
    );
    const anchor = { click: vi.fn(), remove: vi.fn(), href: '', download: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor as unknown as Node);

    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['\uFEFFtest'], { type: 'text/csv' }),
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-disposition'
            ? 'attachment; filename="access-model-issues-acme-2026-05-18.csv"'
            : null,
      },
    });
    await downloadAccessModelIssuesCsv(authFetch, {
      category: 'missing_owner',
      module: 'projects',
      search: 'alpha',
      delimiter: ';',
    });
    const url = String(authFetch.mock.calls[0][0]);
    expect(url).toContain('/api/access-model/issues/export?');
    expect(url).toContain('category=missing_owner');
    expect(url).toContain('module=projects');
    expect(url).toContain('search=alpha');
    expect(url).toContain('delimiter=%3B');
    expect(url).not.toContain('page=');
    expect(url).not.toContain('limit=');
  });
});
