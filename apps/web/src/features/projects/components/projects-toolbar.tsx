'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import {
  PROJECT_CRITICALITY_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';

const SORT_LABEL: Record<string, string> = {
  name: 'Nom',
  targetEndDate: 'Échéance cible',
  status: 'Statut',
  priority: 'Priorité',
  criticality: 'Criticité',
  computedHealth: 'Santé',
  progressPercent: 'Avancement',
};

export interface ProjectsToolbarProps {
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
}

export function ProjectsToolbar({ filters, setFilters }: ProjectsToolbarProps) {
  const statusKey = filters.status ?? '__all__';
  const priorityKey = filters.priority ?? '__all__';
  const criticalityKey = filters.criticality ?? '__all__';

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
        <div className="flex min-w-[min(100%,12rem)] max-w-xs flex-1 flex-col gap-1 sm:flex-none">
          <Label htmlFor="projects-search" className="text-xs text-muted-foreground">
            Recherche
          </Label>
          <Input
            id="projects-search"
            placeholder="Nom, code…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            data-testid="projects-search"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Statut</span>
          <Select
            value={statusKey}
            onValueChange={(v) =>
              setFilters({ status: v === '__all__' || !v ? undefined : v })
            }
          >
            <SelectTrigger size="sm" className="min-w-[9.5rem] w-[9.5rem]">
              <SelectValue>
                {statusKey === '__all__' ? 'Tous' : PROJECT_STATUS_LABEL[statusKey] ?? statusKey}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Priorité</span>
          <Select
            value={priorityKey}
            onValueChange={(v) =>
              setFilters({ priority: v === '__all__' || !v ? undefined : v })
            }
          >
            <SelectTrigger size="sm" className="min-w-[8.5rem] w-[8.5rem]">
              <SelectValue>
                {priorityKey === '__all__'
                  ? 'Toutes'
                  : PROJECT_PRIORITY_LABEL[priorityKey] ?? priorityKey}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              {Object.entries(PROJECT_PRIORITY_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Criticité</span>
          <Select
            value={criticalityKey}
            onValueChange={(v) =>
              setFilters({ criticality: v === '__all__' || !v ? undefined : v })
            }
          >
            <SelectTrigger size="sm" className="min-w-[8.5rem] w-[8.5rem]">
              <SelectValue>
                {criticalityKey === '__all__'
                  ? 'Toutes'
                  : PROJECT_CRITICALITY_LABEL[criticalityKey] ?? criticalityKey}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              {Object.entries(PROJECT_CRITICALITY_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Trier par</span>
          <Select
            value={filters.sortBy}
            onValueChange={(v) =>
              setFilters({ sortBy: v as ProjectsListFilters['sortBy'] })
            }
          >
            <SelectTrigger size="sm" className="min-w-[10rem] w-[10rem]">
              <SelectValue>{SORT_LABEL[filters.sortBy] ?? filters.sortBy}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Ordre</span>
          <Select
            value={filters.sortOrder}
            onValueChange={(v) => setFilters({ sortOrder: v as 'asc' | 'desc' })}
          >
            <SelectTrigger size="sm" className="w-[7rem]">
              <SelectValue>{filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Croissant</SelectItem>
              <SelectItem value="desc">Décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <input
            type="checkbox"
            id="at-risk-only"
            className="size-4 rounded border-input"
            checked={filters.atRiskOnly}
            onChange={(e) => setFilters({ atRiskOnly: e.target.checked })}
          />
          <Label htmlFor="at-risk-only" className="cursor-pointer font-normal">
            À risque seulement
          </Label>
        </div>
      </div>
    </div>
  );
}
