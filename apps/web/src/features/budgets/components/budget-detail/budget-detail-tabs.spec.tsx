import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BudgetDetailTabs } from './budget-detail-tabs';
import {
  budgetDetailTabToExplorerMode,
  isBudgetDetailTabId,
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

  it('marque un seul onglet sélectionné et le rend focusable', () => {
    render(<BudgetDetailTabs tab="suivi" onTabChange={() => undefined} />);

    const selected = screen.getAllByRole('tab', { selected: true });
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toBe('Suivi');
    expect(selected[0]!.getAttribute('tabindex')).toBe('0');
    expect(
      screen.getByRole('tab', { name: 'Historique' }).getAttribute('tabindex'),
    ).toBe('-1');
  });

  it('notifie le changement d’onglet au clic', () => {
    const onTabChange = vi.fn();
    render(<BudgetDetailTabs tab="overview" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Réaffectations' }));
    expect(onTabChange).toHaveBeenCalledWith('reallocations');
  });

  it('navigue au clavier avec les flèches', () => {
    const onTabChange = vi.fn();
    render(<BudgetDetailTabs tab="overview" onTabChange={onTabChange} />);

    fireEvent.keyDown(screen.getByRole('tab', { selected: true }), {
      key: 'ArrowRight',
    });
    expect(onTabChange).toHaveBeenCalledWith('previsionnel');

    fireEvent.keyDown(screen.getByRole('tab', { selected: true }), {
      key: 'ArrowLeft',
    });
    expect(onTabChange).toHaveBeenLastCalledWith('historique');
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
  });
});
