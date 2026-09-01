import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BudgetDetailTabs } from './budget-detail-tabs';
import {
  budgetDetailTabToExplorerMode,
  isBudgetDetailTabId,
  isBudgetDetailWorkspaceId,
  BUDGET_DETAIL_TABS,
} from '@/features/budgets/types/budget-detail-tabs.types';

describe('BudgetDetailTabs', () => {
  it('expose les 6 onglets métier dans un tablist', () => {
    render(<BudgetDetailTabs tab="overview" onTabChange={() => undefined} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Vue d’ensemble',
      'Prévisionnel',
      'Suivi',
      'Comparaisons',
      'Réaffectations',
      'Historique',
    ]);
    expect(screen.getByRole('tablist')).toBeTruthy();
  });

  it('marque un seul onglet sélectionné', () => {
    render(<BudgetDetailTabs tab="suivi" onTabChange={() => undefined} />);

    const selected = screen.getAllByRole('tab', { selected: true });
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Suivi');
  });

  it('n’en sélectionne aucun pendant le rituel PA', () => {
    render(<BudgetDetailTabs tab={null} onTabChange={() => undefined} />);

    expect(screen.queryByRole('tab', { selected: true })).toBeNull();
  });

  it('notifie le changement d’onglet au clic', () => {
    const onTabChange = vi.fn();
    render(<BudgetDetailTabs tab="overview" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Réaffectations' }));
    expect(onTabChange).toHaveBeenCalledWith('reallocations');
  });
});

describe('budgetDetailTabToExplorerMode', () => {
  it('mappe chaque onglet sur le mode explorateur attendu', () => {
    expect(budgetDetailTabToExplorerMode('overview', 'synthese')).toBe('dashboard');
    expect(budgetDetailTabToExplorerMode('previsionnel', 'synthese')).toBe('previsionnel');
    expect(budgetDetailTabToExplorerMode('suivi', 'synthese')).toBe('synthese');
    expect(budgetDetailTabToExplorerMode('suivi', 'atterrissage')).toBe('atterrissage');
    expect(budgetDetailTabToExplorerMode('comparaisons', 'synthese')).toBe('comparaison');
    expect(budgetDetailTabToExplorerMode('historique', 'synthese')).toBe('decisions');
    expect(budgetDetailTabToExplorerMode('reallocations', 'synthese')).toBeNull();
  });

  it('rejette les identifiants d’onglet inconnus', () => {
    expect(isBudgetDetailTabId('scenarios')).toBe(false);
    expect(isBudgetDetailTabId(null)).toBe(false);
    expect(isBudgetDetailTabId('suivi')).toBe(true);
    expect(isBudgetDetailTabId('pa')).toBe(false);
  });

  it('accepte onglet=pa comme workspace hors tablist', () => {
    expect(isBudgetDetailWorkspaceId('pa')).toBe(true);
    const tabIds: string[] = BUDGET_DETAIL_TABS.map((tab) => tab.id);
    expect(tabIds).not.toContain('pa');
  });
});
