'use client';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LaunchImportBudgetModal } from './launch-import-budget-modal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../hooks/use-budgets-query', () => ({
  useBudgetsQuery: () => ({
    data: {
      items: [
        { id: 'b1', name: 'Budget RUN', code: 'RUN-26' },
        { id: 'b2', name: 'Budget BUILD', code: 'BLD-26' },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('LaunchImportBudgetModal', () => {
  it('renders budget options with business labels', () => {
    render(
      <LaunchImportBudgetModal
        open
        onOpenChange={vi.fn()}
        profileId="p1"
        profileName="Compta Sage"
      />,
    );
    expect(screen.getByText(/Profil « Compta Sage »/)).toBeTruthy();
    expect(screen.getByLabelText('Budget cible')).toBeTruthy();
  });
});
