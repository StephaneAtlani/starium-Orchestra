import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

const fetchSpy = vi.fn();

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => fetchSpy,
}));

vi.mock('@/hooks/use-active-client', () => ({
  useActiveClient: () => ({
    activeClient: { id: 'client-A', role: 'CLIENT_ADMIN' },
    setActiveClient: () => undefined,
    initialized: true,
  }),
}));

const getAccessGroupMembersSpy = vi.fn();

vi.mock('@/features/access-groups/api/access-groups', () => ({
  getAccessGroupMembers: (...args: unknown[]) => getAccessGroupMembersSpy(...args),
}));

import { useGroupMemberships } from './use-group-memberships';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  fetchSpy.mockReset();
  getAccessGroupMembersSpy.mockReset();
});

describe('useGroupMemberships', () => {
  it('charge en parallèle les membres de N groupes', async () => {
    getAccessGroupMembersSpy.mockImplementation(async (_authFetch, groupId: string) => {
      if (groupId === 'g1') return [{ userId: 'u1' }, { userId: 'u2' }];
      if (groupId === 'g2') return [{ userId: 'u3' }];
      return [];
    });

    const { result } = renderHook(() => useGroupMemberships(['g1', 'g2']), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const map = new Map(
      result.current.groupMemberships.map((m) => [m.groupId, m.memberUserIds]),
    );
    expect(map.get('g1')).toEqual(new Set(['u1', 'u2']));
    expect(map.get('g2')).toEqual(new Set(['u3']));
    expect(getAccessGroupMembersSpy).toHaveBeenCalledTimes(2);
  });

  it('dédoublonne groupIds (même groupe 2x → un seul fetch)', async () => {
    getAccessGroupMembersSpy.mockResolvedValue([{ userId: 'u1' }]);

    const { result } = renderHook(
      () => useGroupMemberships(['g1', 'g1', 'g1']),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getAccessGroupMembersSpy).toHaveBeenCalledTimes(1);
    expect(result.current.groupMemberships).toHaveLength(1);
  });

  it('isLoading global = OR des isLoading individuels', async () => {
    let resolveG2: (value: { userId: string }[]) => void = () => undefined;
    const g2Promise = new Promise<{ userId: string }[]>((res) => {
      resolveG2 = res;
    });
    getAccessGroupMembersSpy.mockImplementation(async (_authFetch, groupId: string) => {
      if (groupId === 'g1') return [{ userId: 'u1' }];
      if (groupId === 'g2') return g2Promise;
      return [];
    });

    const { result } = renderHook(() => useGroupMemberships(['g1', 'g2']), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(getAccessGroupMembersSpy).toHaveBeenCalledTimes(2);
    });

    expect(result.current.isLoading).toBe(true);

    resolveG2([{ userId: 'u9' }]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('mémoïsation : changer la référence du tableau sans changer le contenu ne re-fetch pas', async () => {
    getAccessGroupMembersSpy.mockResolvedValue([{ userId: 'u1' }]);

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useGroupMemberships(ids),
      {
        wrapper: makeWrapper(),
        initialProps: { ids: ['g1', 'g2'] },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const before = getAccessGroupMembersSpy.mock.calls.length;
    rerender({ ids: ['g1', 'g2'] });
    rerender({ ids: ['g2', 'g1'] });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const after = getAccessGroupMembersSpy.mock.calls.length;
    expect(after).toBe(before);
  });

  it('ajout d’un groupId déclenche un seul fetch supplémentaire', async () => {
    getAccessGroupMembersSpy.mockResolvedValue([{ userId: 'u1' }]);

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useGroupMemberships(ids),
      {
        wrapper: makeWrapper(),
        initialProps: { ids: ['g1'] },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getAccessGroupMembersSpy).toHaveBeenCalledTimes(1);

    rerender({ ids: ['g1', 'g2'] });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getAccessGroupMembersSpy).toHaveBeenCalledTimes(2);
    expect(result.current.groupMemberships).toHaveLength(2);
  });

  it('suppression d’un groupId n’expose plus la query (memberships rétrécit)', async () => {
    getAccessGroupMembersSpy.mockResolvedValue([{ userId: 'u1' }]);

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useGroupMemberships(ids),
      {
        wrapper: makeWrapper(),
        initialProps: { ids: ['g1', 'g2'] },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupMemberships).toHaveLength(2);

    rerender({ ids: ['g1'] });

    await waitFor(() => {
      expect(result.current.groupMemberships).toHaveLength(1);
    });
    expect(result.current.groupMemberships[0]?.groupId).toBe('g1');
  });
});
