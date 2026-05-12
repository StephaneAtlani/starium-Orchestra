import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

const { fetchSpy, useActiveClientMock } = vi.hoisted(() => ({
  fetchSpy: vi.fn(),
  useActiveClientMock: vi.fn(),
}));

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => fetchSpy,
}));

vi.mock('@/hooks/use-active-client', () => ({
  useActiveClient: () => useActiveClientMock(),
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u-current' } }),
}));

vi.mock('@/components/ui/dialog', () => {
  const Dialog = ({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog-mock">{children}</div> : null);
  const Pass = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return {
    Dialog,
    DialogContent: Pass,
    DialogDescription: Pass,
    DialogFooter: Pass,
    DialogHeader: Pass,
    DialogTitle: Pass,
    DialogTrigger: Pass,
    DialogClose: Pass,
  };
});

import { ResourceAclTriggerButton } from './resource-acl-trigger-button';

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchSpy.mockReset();
  useActiveClientMock.mockReset();
});

describe('ResourceAclTriggerButton — visibilité (test imposé n°1)', () => {
  it('CLIENT_ADMIN → bouton visible, aucun fetch ACL avant ouverture', () => {
    useActiveClientMock.mockReturnValue({
      activeClient: { id: 'client-A', role: 'CLIENT_ADMIN' },
      setActiveClient: () => undefined,
      initialized: true,
    });

    renderWithClient(
      <ResourceAclTriggerButton
        resourceType="PROJECT"
        resourceId="cprojabcd000000000000001"
        resourceLabel="Plan Marketing 2026"
      />,
    );

    expect(
      screen.getByTestId('resource-acl-trigger-button'),
    ).toBeInTheDocument();
    expect(screen.getByText('Accès à la ressource')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['CLIENT_USER'],
    ['PLATFORM_ADMIN'],
    ['GUEST'],
    [undefined],
  ])(
    'rôle=%s → null rendu, aucun fetch ACL émis',
    (role) => {
      useActiveClientMock.mockReturnValue({
        activeClient: role ? { id: 'client-A', role } : null,
        setActiveClient: () => undefined,
        initialized: true,
      });

      const { container } = renderWithClient(
        <ResourceAclTriggerButton
          resourceType="PROJECT"
          resourceId="cprojabcd000000000000001"
          resourceLabel="Plan Marketing 2026"
        />,
      );

      expect(
        screen.queryByTestId('resource-acl-trigger-button'),
      ).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('aucun useQuery ACL instancié pour un non-CLIENT_ADMIN (early return avant fetch)', () => {
    useActiveClientMock.mockReturnValue({
      activeClient: { id: 'client-A', role: 'CLIENT_USER' },
      setActiveClient: () => undefined,
      initialized: true,
    });

    renderWithClient(
      <ResourceAclTriggerButton
        resourceType="BUDGET"
        resourceId="cbudgetabcd00000000000001"
        resourceLabel="Budget IT"
      />,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('resource-acl-trigger-button'),
    ).not.toBeInTheDocument();
  });
});
