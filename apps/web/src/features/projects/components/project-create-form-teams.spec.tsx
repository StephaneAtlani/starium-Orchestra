import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateProject } from '../hooks/use-create-project';

const createProject = vi.fn();
const replaceProjectTags = vi.fn();
const createRetroplanMacro = vi.fn();
const push = vi.fn();

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../api/projects.api', () => ({
  createProject: (...args: unknown[]) => createProject(...args),
  replaceProjectTags: (...args: unknown[]) => replaceProjectTags(...args),
  createRetroplanMacro: (...args: unknown[]) => createRetroplanMacro(...args),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createProject.mockResolvedValue({ id: 'new-proj-1' });
  });

  it('body API sans redirectToMicrosoftOptions', async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await result.current.mutateAsync({
      payload: {
        body: { name: 'Test', provisionMicrosoftTeams: true },
      },
      redirectToMicrosoftOptions: true,
    });

    expect(createProject).toHaveBeenCalledWith(expect.anything(), {
      name: 'Test',
      provisionMicrosoftTeams: true,
    });
    expect(createProject.mock.calls[0]?.[1]).not.toHaveProperty('redirectToMicrosoftOptions');
    expect(push).toHaveBeenCalledWith('/projects/new-proj-1/options?tab=microsoft');
  });
});
