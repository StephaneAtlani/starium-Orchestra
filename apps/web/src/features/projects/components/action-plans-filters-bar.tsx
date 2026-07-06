'use client';

import { RotateCcw } from 'lucide-react';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACTION_PLAN_PRIORITY_OPTIONS,
  ACTION_PLAN_STATUS_OPTIONS,
} from '../lib/action-plan-display';

export type ActionPlansListFilters = {
  search: string;
  status: string;
  priority: string;
  owner: string;
};

export function ActionPlansFiltersBar({
  filters,
  onFiltersChange,
  onReset,
  onRefresh,
  isRefreshing = false,
  hasActiveFilters,
}: {
  filters: ActionPlansListFilters;
  onFiltersChange: (patch: Partial<ActionPlansListFilters>) => void;
  onReset: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="space-y-3">
      <FilterBar
        aria-label="Filtres plans d'action"
        asSearch
        desktopColumns={4}
        className="space-y-0"
      >
        <FilterBarField id="ap-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              placeholder="Titre ou code…"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="w-full"
            />
          )}
        </FilterBarField>
        <FilterBarField id="ap-status" label="Statut">
          {({ controlId, labelId }) => (
            <Select
              value={filters.status}
              onValueChange={(v) => onFiltersChange({ status: v ?? 'all' })}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {ACTION_PLAN_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="ap-priority" label="Priorité">
          {({ controlId, labelId }) => (
            <Select
              value={filters.priority}
              onValueChange={(v) => onFiltersChange({ priority: v ?? 'all' })}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue placeholder="Toutes les priorités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                {ACTION_PLAN_PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="ap-owner" label="Responsable">
          {({ controlId, labelId }) => (
            <Select
              value={filters.owner}
              onValueChange={(v) => onFiltersChange({ owner: v ?? 'all' })}
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="ASSIGNED">Assigné</SelectItem>
                <SelectItem value="UNASSIGNED">Non assigné</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
      </FilterBar>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-0"
          disabled={!hasActiveFilters}
          onClick={onReset}
        >
          <RotateCcw className="size-4" aria-hidden />
          Réinitialiser les filtres
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11 md:min-h-0"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? 'Actualisation…' : 'Actualiser'}
        </Button>
      </div>
    </div>
  );
}
