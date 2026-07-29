import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useBudgetsListFilters } from './use-budget-list-filters';

let search = '';
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace }),
  usePathname: () => '/budgets',
}));

describe('useBudgetsListFilters', () => {
  beforeEach(() => {
    search = '';
    replace.mockReset();
  });

  it('parse exerciseId et view depuis l’URL', () => {
    search = 'exerciseId=ex-2026&view=table&page=2';

    const { result } = renderHook(() => useBudgetsListFilters());

    expect(result.current.filters.exerciseId).toBe('ex-2026');
    expect(result.current.filters.view).toBe('table');
    expect(result.current.filters.page).toBe(2);
  });

  it('default view à cards si absent ou inconnu', () => {
    search = 'view=weird';

    const { result } = renderHook(() => useBudgetsListFilters());

    expect(result.current.filters.view).toBe('cards');
  });

  it('écrit exerciseId et view=table dans l’URL', () => {
    const { result } = renderHook(() => useBudgetsListFilters());

    act(() => {
      result.current.setFilters({ exerciseId: 'ex-2027', view: 'table' });
    });

    expect(replace).toHaveBeenCalledWith('/budgets?exerciseId=ex-2027&view=table');
  });

  it('omet view quand la vue cards est sélectionnée', () => {
    search = 'exerciseId=ex-2026&view=table&page=3';
    const { result } = renderHook(() => useBudgetsListFilters());

    act(() => {
      result.current.setFilters({ view: 'cards' });
    });

    expect(replace).toHaveBeenCalledWith('/budgets?exerciseId=ex-2026&page=3');
  });
});
