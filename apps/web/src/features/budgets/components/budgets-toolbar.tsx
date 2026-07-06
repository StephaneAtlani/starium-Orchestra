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
import { BUDGET_STATUS_OPTIONS, LIMIT_OPTIONS } from '../constants/budget-filters';
import type { BudgetsListParams } from '../types/budget-list.types';
import { RotateCcw } from 'lucide-react';

const DEBOUNCE_MS = 300;

export function BudgetsToolbar() {
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

  const handleLimitChange = (value: string | null) => {
    setFilters({ limit: value ? Number(value) : 20, page: 1 });
  };

  return (
    <TableToolbar>
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <FilterBar aria-label="Filtres budgets" className="flex-1" desktopColumns="auto">
          <FilterBarField id="budgets-search" label="Recherche">
            {({ controlId }) => (
              <Input
                id={controlId}
                placeholder="Rechercher (nom, code)…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
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
                  className="w-full"
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
                  className="w-full"
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
          <FilterBarField id="budgets-limit" label="Pagination">
            {({ controlId, labelId }) => (
              <Select value={String(filters.limit ?? 20)} onValueChange={handleLimitChange}>
                <SelectTrigger
                  id={controlId}
                  aria-labelledby={labelId}
                  className="w-full"
                  data-testid="budgets-limit"
                >
                  <SelectValue>{`${filters.limit ?? 20} / page`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FilterBarField>
        </FilterBar>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={reset}
            className="w-full sm:w-auto"
            data-testid="budgets-reset"
          >
            <RotateCcw className="size-4" />
            Réinitialiser
          </Button>
        </div>
      </div>
    </TableToolbar>
  );
}
