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
import { useBudgetExercisesListFilters } from '../hooks/use-budget-list-filters';
import { BUDGET_EXERCISE_STATUS_OPTIONS, LIMIT_OPTIONS } from '../constants/budget-filters';
import type { BudgetExercisesListParams } from '../types/budget-list.types';
import { RotateCcw } from 'lucide-react';

const DEBOUNCE_MS = 300;

export function BudgetExercisesToolbar() {
  const { filters, setFilters, reset } = useBudgetExercisesListFilters();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

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
      status: (value === 'ALL' || !value ? 'ALL' : value) as BudgetExercisesListParams['status'],
      page: 1,
    });
  };

  const handleLimitChange = (value: string | null) => {
    setFilters({ limit: value ? Number(value) : 20, page: 1 });
  };

  return (
    <TableToolbar>
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <FilterBar aria-label="Filtres exercices budgétaires" className="flex-1" desktopColumns="auto">
          <FilterBarField id="exercises-search" label="Recherche">
            {({ controlId }) => (
              <Input
                id={controlId}
                placeholder="Rechercher (nom, code)…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
                data-testid="exercises-search"
              />
            )}
          </FilterBarField>
          <FilterBarField id="exercises-status" label="Statut">
            {({ controlId, labelId }) => (
              <Select
                value={filters.status ?? 'ALL'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger
                  id={controlId}
                  aria-labelledby={labelId}
                  className="w-full"
                  data-testid="exercises-status"
                >
                  <SelectValue placeholder="Statut">
                    {BUDGET_EXERCISE_STATUS_OPTIONS.find(
                      (o) => o.value === (filters.status ?? 'ALL'),
                    )?.label ?? 'Tous statuts'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_EXERCISE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FilterBarField>
          <FilterBarField id="exercises-limit" label="Pagination">
            {({ controlId, labelId }) => (
              <Select value={String(filters.limit ?? 20)} onValueChange={handleLimitChange}>
                <SelectTrigger
                  id={controlId}
                  aria-labelledby={labelId}
                  className="w-full"
                  data-testid="exercises-limit"
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
            data-testid="exercises-reset"
          >
            <RotateCcw className="size-4" />
            Réinitialiser
          </Button>
        </div>
      </div>
    </TableToolbar>
  );
}
