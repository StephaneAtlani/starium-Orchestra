'use client';

import React, { useEffect, useState } from 'react';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudgetsListFilters } from '../hooks/use-budget-list-filters';
import { useBudgetExerciseOptionsQuery } from '../hooks/use-budget-exercise-options-query';
import { BUDGET_STATUS_OPTIONS } from '../constants/budget-filters';
import type { BudgetsListParams } from '../types/budget-list.types';
import { LayoutGrid, List, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 300;

export function BudgetsToolbar({
  viewMode,
  onViewModeChange,
}: {
  viewMode?: 'cards' | 'table';
  onViewModeChange?: (mode: 'cards' | 'table') => void;
} = {}) {
  const { filters, setFilters, reset } = useBudgetsListFilters();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const { data: exerciseOptions = [] } = useBudgetExerciseOptionsQuery();

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const trimmed = searchInput.trim() || undefined;
    if (trimmed === (filters.search ?? '')) return;
    const t = setTimeout(() => {
      setFilters({ search: trimmed, page: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, filters.search]); // eslint-disable-line react-hooks/exhaustive-deps -- debounce search to URL

  const handleStatusChange = (value: string | null) => {
    setFilters({
      status: (value === 'ALL' || !value ? 'ALL' : value) as BudgetsListParams['status'],
      page: 1,
    });
  };

  const handleExerciseChange = (value: string | null) => {
    setFilters({ exerciseId: value === '__all__' || !value ? undefined : value, page: 1 });
  };

  return (
    <TableToolbar className="block py-2">
      <FilterBar
        aria-label="Filtres budgets"
        className="!grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] !items-end"
        desktopColumns={3}
      >
        <FilterBarField id="budgets-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              placeholder="Rechercher (nom, code)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full min-w-0"
              data-testid="budgets-search"
            />
          )}
        </FilterBarField>
        <FilterBarField id="budgets-exercise" label="Exercice">
          {({ controlId, labelId }) => (
            <Select
              value={filters.exerciseId ?? '__all__'}
              onValueChange={handleExerciseChange}
            >
              <SelectTrigger
                id={controlId}
                aria-labelledby={labelId}
                className="w-full min-w-0"
                data-testid="budgets-exercise"
              >
                <SelectValue placeholder="Exercice">
                  {(v) => {
                    if (v === '__all__' || v == null) return 'Tous les exercices';
                    const ex = exerciseOptions.find((e) => e.id === v);
                    if (!ex) return 'Exercice';
                    return `${ex.name}${ex.code ? ` (${ex.code})` : ''}`.trim();
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les exercices</SelectItem>
                {exerciseOptions.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name} {ex.code ? `(${ex.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="budgets-status" label="Statut">
          {({ controlId, labelId }) => (
            <Select value={filters.status ?? 'ALL'} onValueChange={handleStatusChange}>
              <SelectTrigger
                id={controlId}
                aria-labelledby={labelId}
                className="w-full min-w-0"
                data-testid="budgets-status"
              >
                <SelectValue placeholder="Statut">
                  {BUDGET_STATUS_OPTIONS.find((o) => o.value === (filters.status ?? 'ALL'))
                    ?.label ?? 'Tous statuts'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BUDGET_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <div className="flex shrink-0 items-end gap-2">
          {viewMode && onViewModeChange ? (
            <div
              className="starium-tab-group grid min-h-11 grid-cols-2 sm:min-h-9"
              role="tablist"
              aria-label="Mode d'affichage des budgets"
            >
              <button
                type="button"
                className={cn('starium-tab-btn', viewMode === 'cards' && 'starium-tab-btn--active')}
                aria-pressed={viewMode === 'cards'}
                onClick={() => onViewModeChange('cards')}
              >
                <LayoutGrid className="size-4" aria-hidden />
                Cartes
              </button>
              <button
                type="button"
                className={cn('starium-tab-btn', viewMode === 'table' && 'starium-tab-btn--active')}
                aria-pressed={viewMode === 'table'}
                onClick={() => onViewModeChange('table')}
              >
                <List className="size-4" aria-hidden />
                Tableau
              </button>
            </div>
          ) : null}
          <Button
            variant="outline"
            onClick={reset}
            className="min-h-11 shrink-0 sm:min-h-9"
            data-testid="budgets-reset"
          >
            <RotateCcw className="size-4" />
            Réinitialiser
          </Button>
        </div>
      </FilterBar>
    </TableToolbar>
  );
}
