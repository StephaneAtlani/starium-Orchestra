'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { cn } from '@/lib/utils';
import type {
  CollaboratorSource,
  CollaboratorStatus,
  CollaboratorsListParams,
} from '../types/collaborator.types';
import {
  collaboratorSourceLabel,
  collaboratorStatusLabel,
} from '../lib/collaborator-label-mappers';

type Props = {
  filters: CollaboratorsListParams;
  setFilters: (next: CollaboratorsListParams) => void;
  managerOptions: { id: string; displayName: string }[];
};

const STATUSES: CollaboratorStatus[] = ['ACTIVE', 'INACTIVE', 'DISABLED_SYNC'];
const SOURCES: CollaboratorSource[] = ['MANUAL', 'DIRECTORY_SYNC'];

function toggleInArray<T extends string>(arr: T[] | undefined, value: T): T[] {
  const set = new Set(arr ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

export function CollaboratorFiltersBar({ filters, setFilters, managerOptions }: Props) {
  const managerLabel =
    !filters.managerId
      ? 'Tous'
      : managerOptions.find((m) => m.id === filters.managerId)?.displayName ?? 'Manager';

  return (
    <div className="space-y-4">
      <FilterBar aria-label="Filtres collaborateurs" asSearch desktopColumns={3}>
        <FilterBarField id="collaborators-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              className="w-full"
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, offset: 0 })}
              placeholder="Nom, email, département..."
            />
          )}
        </FilterBarField>
        <FilterBarField id="collaborators-manager" label="Manager">
          {({ controlId, labelId }) => (
            <Select
              value={filters.managerId ?? '__all__'}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  managerId: v === '__all__' || !v ? undefined : v,
                  offset: 0,
                })
              }
            >
              <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                <SelectValue>{managerLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                {managerOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="collaborators-tags" label="Tags (CSV)">
          {({ controlId }) => (
            <Input
              id={controlId}
              className="w-full"
              value={(filters.tag ?? []).join(', ')}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tag: e.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                  offset: 0,
                })
              }
              placeholder="run, critical"
            />
          )}
        </FilterBarField>
      </FilterBar>

      <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3 sm:p-4">
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Statuts</span>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => {
              const active = (filters.status ?? []).includes(status);
              return (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className={cn('min-h-11 capitalize')}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      status: toggleInArray(filters.status, status),
                      offset: 0,
                    })
                  }
                >
                  {collaboratorStatusLabel(status)}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Sources</span>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((source) => {
              const active = (filters.source ?? []).includes(source);
              return (
                <Button
                  key={source}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="min-h-11"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      source: toggleInArray(filters.source, source),
                      offset: 0,
                    })
                  }
                >
                  {collaboratorSourceLabel(source)}
                </Button>
              );
            })}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11"
              onClick={() => setFilters({ offset: 0, limit: filters.limit ?? 20 })}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
