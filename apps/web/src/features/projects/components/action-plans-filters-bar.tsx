'use client';

import type { ReactNode } from 'react';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
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
  actionPlanPriorityLabel,
  actionPlanStatusLabel,
} from '../lib/action-plan-display';
import { cn } from '@/lib/utils';

export type ActionPlansListFilters = {
  search: string;
  status: string;
  priority: string;
  owner: string;
};

function FilterSelectChip({
  value,
  onValueChange,
  label,
  active,
  children,
  'aria-label': ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  active?: boolean;
  children: ReactNode;
  'aria-label'?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? 'all')}>
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel ?? label}
        className={cn(
          'starium-filter-chip h-auto min-h-[44px] w-full shadow-none focus-visible:ring-0 data-[size=sm]:h-auto md:min-h-0 md:w-auto',
          active && 'starium-filter-chip--active',
        )}
      >
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

const OWNER_FILTER_LABELS: Record<string, string> = {
  all: 'Responsable : tous',
  ASSIGNED: 'Assigné',
  UNASSIGNED: 'Non assigné',
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
  const statusLabel =
    filters.status === 'all' ? 'Tous les statuts' : actionPlanStatusLabel(filters.status);
  const priorityLabel =
    filters.priority === 'all'
      ? 'Toutes les priorités'
      : actionPlanPriorityLabel(filters.priority);
  const ownerLabel = OWNER_FILTER_LABELS[filters.owner] ?? OWNER_FILTER_LABELS.all;

  const canReset = hasActiveFilters || filters.search.trim().length > 0;

  return (
    <div
      className="starium-panel overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card"
      role="search"
      aria-label="Filtrer la liste des plans d'action"
    >
      <div className="starium-filter-bar">
        <div className="starium-filter-bar-left">
          <div className="starium-filter-bar-chips">
            <FilterSelectChip
              value={filters.status}
              onValueChange={(v) => onFiltersChange({ status: v })}
              label={statusLabel}
              active={filters.status !== 'all'}
              aria-label="Filtrer par statut"
            >
              <SelectItem value="all">Tous les statuts</SelectItem>
              {ACTION_PLAN_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </FilterSelectChip>

            <FilterSelectChip
              value={filters.priority}
              onValueChange={(v) => onFiltersChange({ priority: v })}
              label={priorityLabel}
              active={filters.priority !== 'all'}
              aria-label="Filtrer par priorité"
            >
              <SelectItem value="all">Toutes les priorités</SelectItem>
              {ACTION_PLAN_PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </FilterSelectChip>

            <FilterSelectChip
              value={filters.owner}
              onValueChange={(v) => onFiltersChange({ owner: v })}
              label={ownerLabel}
              active={filters.owner !== 'all'}
              aria-label="Filtrer par responsable"
            >
              <SelectItem value="all">Responsable : tous</SelectItem>
              <SelectItem value="ASSIGNED">Assigné</SelectItem>
              <SelectItem value="UNASSIGNED">Non assigné</SelectItem>
            </FilterSelectChip>

            <button
              type="button"
              className="starium-filter-chip starium-filter-chip--reset starium-filter-chip--wide"
              disabled={!canReset}
              onClick={onReset}
              aria-label="Réinitialiser les filtres"
            >
              <RotateCcw aria-hidden />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        <div className="starium-filter-bar-right">
          <div className="starium-filter-bar-search">
            <Search className="starium-filter-bar-search-icon" aria-hidden />
            <Input
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Titre ou code…"
              aria-label="Rechercher un plan d'action"
              className="starium-filter-bar-search-input !pl-9 !pr-2.5"
            />
          </div>
          <button
            type="button"
            className="starium-filter-chip min-h-[44px] md:min-h-0"
            disabled={isRefreshing}
            onClick={onRefresh}
            aria-label={isRefreshing ? 'Actualisation en cours' : 'Actualiser la liste'}
            aria-busy={isRefreshing}
          >
            <RefreshCw className={cn(isRefreshing && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">
              {isRefreshing ? 'Actualisation…' : 'Actualiser'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
