'use client';

import { Columns2, List, RotateCcw, Search } from 'lucide-react';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import {
  PROJECT_TASK_PRIORITIES,
  PROJECT_TASK_STATUSES,
} from '@/lib/ui/badge-registry';
import { cn } from '@/lib/utils';

type UserOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

export type ActionPlanTasksToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  projectId: string;
  onProjectIdChange: (value: string) => void;
  riskId: string;
  onRiskIdChange: (value: string) => void;
  ownerUserId: string;
  onOwnerUserIdChange: (value: string) => void;
  projectOptions: { id: string; label: string }[];
  riskOptions: { id: string; label: string }[];
  users: UserOption[];
  onReset: () => void;
  hasActiveFilters: boolean;
  viewMode?: 'table' | 'kanban';
  onViewModeChange?: (mode: 'table' | 'kanban') => void;
  className?: string;
};

export function ActionPlanTasksToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  projectId,
  onProjectIdChange,
  riskId,
  onRiskIdChange,
  ownerUserId,
  onOwnerUserIdChange,
  projectOptions,
  riskOptions,
  users,
  onReset,
  hasActiveFilters,
  viewMode = 'kanban',
  onViewModeChange,
  className,
}: ActionPlanTasksToolbarProps) {
  const { merged } = useClientUiBadgeConfig();

  return (
    <div
      className={cn('starium-toolbar', className)}
      role="search"
      aria-label="Filtrer et afficher les actions du plan"
    >
      {onViewModeChange ? (
        <div
          className="starium-seg-toggle min-h-11 shrink-0 md:min-h-[38px]"
          role="tablist"
          aria-label="Mode d'affichage"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'kanban'}
            className={cn(
              'starium-seg-btn min-h-9 min-w-[44px]',
              viewMode === 'kanban' && 'starium-seg-btn--active',
            )}
            onClick={() => onViewModeChange('kanban')}
          >
            <Columns2 strokeWidth={1.75} width={14} height={14} aria-hidden />
            Kanban
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'table'}
            className={cn(
              'starium-seg-btn min-h-9 min-w-[44px]',
              viewMode === 'table' && 'starium-seg-btn--active',
            )}
            onClick={() => onViewModeChange('table')}
          >
            <List strokeWidth={1.75} width={14} height={14} aria-hidden />
            Liste
          </button>
        </div>
      ) : null}

      <select
        className="starium-nselect starium-nselect--sm min-h-11 w-full sm:w-auto md:min-h-[38px]"
        value={status || 'all'}
        onChange={(e) => onStatusChange(e.target.value === 'all' ? '' : e.target.value)}
        aria-label="Filtrer par statut"
      >
        <option value="all">Tous les statuts</option>
        {PROJECT_TASK_STATUSES.map((k) => (
          <option key={k} value={k}>
            {merged.projectTaskStatus[k].label}
          </option>
        ))}
      </select>

      <select
        className="starium-nselect starium-nselect--md min-h-11 w-full sm:w-auto md:min-h-[38px]"
        value={ownerUserId || 'all'}
        onChange={(e) =>
          onOwnerUserIdChange(e.target.value === 'all' ? '' : e.target.value)
        }
        aria-label="Filtrer par responsable"
      >
        <option value="all">Responsable · tous</option>
        {users.map((u) => {
          const name =
            [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
          return (
            <option key={u.id} value={u.id}>
              {name}
            </option>
          );
        })}
      </select>

      <select
        className="starium-nselect starium-nselect--sm min-h-11 w-full sm:w-auto md:min-h-[38px]"
        value={priority || 'all'}
        onChange={(e) => onPriorityChange(e.target.value === 'all' ? '' : e.target.value)}
        aria-label="Filtrer par priorité"
      >
        <option value="all">Toutes les priorités</option>
        {PROJECT_TASK_PRIORITIES.map((k) => (
          <option key={k} value={k}>
            {merged.projectTaskPriority[k].label}
          </option>
        ))}
      </select>

      <select
        className="starium-nselect starium-nselect--md min-h-11 w-full sm:w-auto md:min-h-[38px]"
        value={projectId || 'all'}
        onChange={(e) => onProjectIdChange(e.target.value === 'all' ? '' : e.target.value)}
        aria-label="Filtrer par projet"
      >
        <option value="all">Tous les projets</option>
        {projectOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        className="starium-nselect starium-nselect--md min-h-11 w-full sm:w-auto md:min-h-[38px]"
        value={riskId || 'all'}
        onChange={(e) => onRiskIdChange(e.target.value === 'all' ? '' : e.target.value)}
        aria-label="Filtrer par risque"
      >
        <option value="all">Tous les risques</option>
        {riskOptions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="starium-toolbar-reset"
        disabled={!hasActiveFilters}
        onClick={onReset}
        aria-label="Réinitialiser les filtres"
      >
        <RotateCcw aria-hidden />
        <span className="hidden sm:inline">Réinitialiser</span>
      </button>

      <div className="starium-toolbar-spacer" aria-hidden />

      <div className="starium-search-input min-h-11 w-full md:min-h-[38px] md:ml-0 md:w-auto">
        <Search aria-hidden />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher une action…"
          aria-label="Rechercher une action"
        />
      </div>
    </div>
  );
}
