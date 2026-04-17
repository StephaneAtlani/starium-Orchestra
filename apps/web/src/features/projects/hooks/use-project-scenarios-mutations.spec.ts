import { describe, expect, it, vi } from 'vitest';
import { selectProjectScenario } from '../api/projects.api';
import type { AuthFetch } from '@/features/budgets/api/budget-management.api';

function createAuthFetchSpy() {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: 'sc-1', status: 'SELECTED' }),
  })) as unknown as AuthFetch & ReturnType<typeof vi.fn>;
}

describe('selectProjectScenario API routing', () => {
  it('appelle /select sans payload de transition', async () => {
    const authFetch = createAuthFetchSpy();
    await selectProjectScenario(authFetch, 'proj-1', 'sc-1');

    const [url, init] = (authFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/projects/proj-1/scenarios/sc-1/select');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('appelle /select-and-transition quand targetProjectStatus est fourni', async () => {
    const authFetch = createAuthFetchSpy();
    await selectProjectScenario(authFetch, 'proj-1', 'sc-1', {
      targetProjectStatus: 'IN_PROGRESS',
      decisionNote: 'Go',
    });

    const [url, init] = (authFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/projects/proj-1/scenarios/sc-1/select-and-transition');
    expect((init as RequestInit).method).toBe('POST');
  });
});
