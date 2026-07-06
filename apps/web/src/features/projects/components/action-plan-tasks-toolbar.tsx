'use client';

import type { ReactNode } from 'react';
import { Kanban, LayoutGrid, RotateCcw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import {
  PROJECT_TASK_PRIORITIES,
  PROJECT_TASK_STATUSES,
  taskPriorityLabel,
  taskStatusLabel,
} from '@/lib/ui/badge-registry';
import { cn } from '@/lib/utils';

type UserOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

function formatUserLabel(
  id: string | null | undefined,
  users: UserOption[],
): string {
  if (!id) return '—';
  const u = users.find((x) => x.id === id);
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

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
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v ?? '')}
    >
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
  viewMode = 'table',
  onViewModeChange,
}: ActionPlanTasksToolbarProps) {
  const { merged } = useClientUiBadgeConfig();

  const statusKey = status || '__all';
  const priorityKey = priority || '__all';
  const projectKey = projectId || '__all';
  const riskKey = riskId || '__all';
  const ownerKey = ownerUserId || '__all';

  const statusLabel =
    statusKey === '__all' ? 'Tous les statuts' : taskStatusLabel(merged, statusKey);
  const priorityLabel =
    priorityKey === '__all' ? 'Toutes les priorités' : taskPriorityLabel(merged, priorityKey);
  const projectLabel =
    projectKey === '__all'
      ? 'Tous les projets'
      : (projectOptions.find((p) => p.id === projectId)?.label ?? '—');
  const riskLabel =
    riskKey === '__all'
      ? 'Tous les risques'
      : (riskOptions.find((r) => r.id === riskId)?.label ?? '—');
  const ownerLabel =
    ownerKey === '__all'
      ? 'Responsable : tous'
      : `Responsable : ${formatUserLabel(ownerUserId, users)}`;

  return (
    <div
      className="starium-filter-bar"
      role="search"
      aria-label="Filtrer et trier les tâches du plan"
    >
      <div className="starium-filter-bar-left">
        {onViewModeChange ? (
          <div className="starium-filter-bar-view" role="tablist" aria-label="Mode d'affichage">
            <div className="starium-tab-group">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'table'}
                className={cn('starium-tab-btn', viewMode === 'table' && 'starium-tab-btn--active')}
                onClick={() => onViewModeChange('table')}
              >
                <LayoutGrid aria-hidden />
                Liste
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'kanban'}
                className={cn('starium-tab-btn', viewMode === 'kanban' && 'starium-tab-btn--active')}
                onClick={() => onViewModeChange('kanban')}
              >
                <Kanban aria-hidden />
                Kanban
              </button>
            </div>
          </div>
        ) : null}
        <div className="starium-filter-bar-chips">
          <FilterSelectChip
            value={statusKey}
            onValueChange={(v) => onStatusChange(!v || v === '__all' ? '' : v)}
            label={statusLabel}
            active={statusKey !== '__all'}
            aria-label="Filtrer par statut"
          >
            <SelectItem value="__all">Tous les statuts</SelectItem>
            {PROJECT_TASK_STATUSES.map((k) => (
              <SelectItem key={k} value={k}>
                {merged.projectTaskStatus[k].label}
              </SelectItem>
            ))}
          </FilterSelectChip>

          <FilterSelectChip
            value={priorityKey}
            onValueChange={(v) => onPriorityChange(!v || v === '__all' ? '' : v)}
            label={priorityLabel}
            active={priorityKey !== '__all'}
            aria-label="Filtrer par priorité"
          >
            <SelectItem value="__all">Toutes les priorités</SelectItem>
            {PROJECT_TASK_PRIORITIES.map((k) => (
              <SelectItem key={k} value={k}>
                {merged.projectTaskPriority[k].label}
              </SelectItem>
            ))}
          </FilterSelectChip>

          <FilterSelectChip
            value={projectKey}
            onValueChange={(v) => onProjectIdChange(!v || v === '__all' ? '' : v)}
            label={projectLabel}
            active={projectKey !== '__all'}
            aria-label="Filtrer par projet"
          >
            <SelectItem value="__all">Tous les projets</SelectItem>
            {projectOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </FilterSelectChip>

          <FilterSelectChip
            value={riskKey}
            onValueChange={(v) => onRiskIdChange(!v || v === '__all' ? '' : v)}
            label={riskLabel}
            active={riskKey !== '__all'}
            aria-label="Filtrer par risque"
          >
            <SelectItem value="__all">Tous les risques</SelectItem>
            {riskOptions.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </FilterSelectChip>

          <FilterSelectChip
            value={ownerKey}
            onValueChange={(v) => onOwnerUserIdChange(!v || v === '__all' ? '' : v)}
            label={ownerLabel}
            active={ownerKey !== '__all'}
            aria-label="Filtrer par responsable"
          >
            <SelectItem value="__all">Responsable : tous</SelectItem>
            {users.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
              return (
                <SelectItem key={u.id} value={u.id}>
                  {name}
                </SelectItem>
              );
            })}
          </FilterSelectChip>

          <button
            type="button"
            className="starium-filter-chip starium-filter-chip--reset starium-filter-chip--wide"
            disabled={!hasActiveFilters}
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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une action…"
            aria-label="Rechercher une action"
            className="starium-filter-bar-search-input !pl-9 !pr-2.5"
          />
        </div>
      </div>
    </div>
  );
}
