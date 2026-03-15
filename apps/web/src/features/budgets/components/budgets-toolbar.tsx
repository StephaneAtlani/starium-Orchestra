'use client';

import React, { useEffect, useState } from 'react';
import { TableToolbar } from '@/components/layout/table-toolbar';
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
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher (nom, code)…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
          data-testid="budgets-search"
        />
        <Select
          value={filters.exerciseId ?? '__all__'}
          onValueChange={handleExerciseChange}
        >
          <SelectTrigger size="sm" className="w-[180px]" data-testid="budgets-exercise">
            <SelectValue placeholder="Exercice" />
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
        <Select value={filters.status ?? 'ALL'} onValueChange={handleStatusChange}>
          <SelectTrigger size="sm" className="w-[140px]" data-testid="budgets-status">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {BUDGET_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(filters.limit ?? 20)} onValueChange={handleLimitChange}>
          <SelectTrigger size="sm" className="w-[100px]" data-testid="budgets-limit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={reset} data-testid="budgets-reset">
          <RotateCcw className="size-4" />
          Réinitialiser
        </Button>
      </div>
    </TableToolbar>
  );
}
