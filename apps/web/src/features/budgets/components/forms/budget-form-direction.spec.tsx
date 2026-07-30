import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BudgetForm } from './budget-form';

vi.mock('@/features/client-rbac/hooks/use-client-members', () => ({
  useClientMembers: () => ({
    data: [
      {
        id: 'user-1',
        email: 'dsi@acme.test',
        firstName: 'Alex',
        lastName: 'Martin',
        status: 'ACTIVE',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ has: () => true, isLoading: false }),
}));

vi.mock('@/features/organization/api/organization-api', () => ({
  fetchOrgUnitsTree: () =>
    Promise.resolve([
      {
        id: 'org-unit-cuid-should-not-appear',
        name: 'Direction des systèmes d’information',
        code: 'DSI',
        status: 'ACTIVE',
        children: [],
      },
    ]),
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BudgetForm
        defaultValues={{ ownerOrgUnitId: 'org-unit-cuid-should-not-appear' }}
        onSubmit={() => undefined}
        cancelHref="/budgets"
        exerciseOptions={[{ id: 'ex-1', name: 'Exercice 2026', code: '2026' }]}
      />
    </QueryClientProvider>,
  );
}

describe('BudgetForm — champ Direction', () => {
  it('expose un champ Direction associé à son label', () => {
    renderForm();
    const label = screen.getByText('Direction');
    expect(label.getAttribute('for')).toBe('ownerOrgUnitId');
    expect(document.getElementById('ownerOrgUnitId')).not.toBeNull();
  });

  it('affiche le libellé de l’unité, jamais son identifiant', async () => {
    renderForm();
    await waitFor(() => {
      expect(
        screen.getByText(/Direction des systèmes d’information \(DSI\)/),
      ).toBeTruthy();
    });
    const trigger = document.getElementById('ownerOrgUnitId');
    expect(trigger?.textContent).not.toContain('org-unit-cuid-should-not-appear');
  });
});
