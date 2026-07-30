import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useBudgetsListFilters } from './use-budget-list-filters';

let search = '';
const replaceState = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/budgets',
}));

describe('useBudgetsListFilters', () => {
  beforeEach(() => {
    search = '';
    replaceState.mockReset();
    vi.stubGlobal('history', {
      ...window.history,
      replaceState,
      state: {},
    });
  });

  it('parse exerciseId et view depuis l’URL', () => {
    search = 'exerciseId=ex-2026&view=cards&page=2';

    const { result } = renderHook(() => useBudgetsListFilters());

    expect(result.current.filters.exerciseId).toBe('ex-2026');
    expect(result.current.filters.view).toBe('cards');
    expect(result.current.filters.page).toBe(2);
  });

  it('default view à table si absent ou inconnu', () => {
    search = '';

    const { result } = renderHook(() => useBudgetsListFilters());

    expect(result.current.filters.view).toBe('table');
  });

  it('view inconnu retombe sur table', () => {
    search = 'view=weird';

    const { result } = renderHook(() => useBudgetsListFilters());

    expect(result.current.filters.view).toBe('table');
  });

  it('met à jour l’état local et l’URL sans router.replace', () => {
    const { result } = renderHook(() => useBudgetsListFilters());

    act(() => {
      result.current.setFilters({ exerciseId: 'ex-2027', view: 'cards' });
    });

    expect(result.current.filters.exerciseId).toBe('ex-2027');
    expect(result.current.filters.view).toBe('cards');
    expect(replaceState).toHaveBeenCalledWith(
      {},
      '',
      '/budgets?exerciseId=ex-2027&view=cards',
    );
  });

  it('omet view quand la vue table (défaut) est sélectionnée', () => {
    search = 'exerciseId=ex-2026&view=cards&page=3';
    const { result } = renderHook(() => useBudgetsListFilters());

    act(() => {
      result.current.setFilters({ view: 'table' });
    });

    expect(result.current.filters.view).toBe('table');
    expect(replaceState).toHaveBeenCalledWith({}, '', '/budgets?exerciseId=ex-2026&page=3');
  });
});
