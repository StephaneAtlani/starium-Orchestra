import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessExplainerPopover } from './access-explainer-popover';

const fetchSpy = vi.fn();

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => fetchSpy,
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u-current' } }),
}));

function renderWithQuery(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  fetchSpy.mockReset();
});

describe('AccessExplainerPopover', () => {
  it('ne fetch pas tant que le dialogue est fermé', () => {
    renderWithQuery(
      <AccessExplainerPopover
        resourceType="PROJECT"
        resourceId="caaaaaaaaaaaaaaaaaaaaaaaaa"
        resourceLabel="Projet test"
        intent="READ"
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('appelle effective-rights/me à l’ouverture', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          finalDecision: 'ALLOWED',
          reasonCode: null,
          resourceLabel: 'Projet test',
          controls: [],
          safeMessage: 'OK',
          computedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderWithQuery(
      <AccessExplainerPopover
        resourceType="PROJECT"
        resourceId="caaaaaaaaaaaaaaaaaaaaaaaaa"
        resourceLabel="Projet test"
        intent="READ"
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('access-explainer-trigger'));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = String(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain('/api/access-diagnostics/effective-rights/me');
    expect(url).toContain('intent=READ');
    expect(url).toContain('resourceType=PROJECT');
  });
});
