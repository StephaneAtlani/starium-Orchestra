'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="collaborators-search">Recherche</Label>
          <Input
            id="collaborators-search"
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, offset: 0 })}
            placeholder="Nom, email, département..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collaborators-manager">Manager</Label>
          <select
            id="collaborators-manager"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={filters.managerId ?? ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                managerId: e.target.value || undefined,
                offset: 0,
              })
            }
          >
            <option value="">Tous</option>
            {managerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="collaborators-tags">Tags (CSV)</Label>
          <Input
            id="collaborators-tags"
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
        </div>
      </div>

      <div className="space-y-2">
        <Label>Statuts</Label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => {
            const active = (filters.status ?? []).includes(status);
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn('capitalize')}
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
        <Label>Sources</Label>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((source) => {
            const active = (filters.source ?? []).includes(source);
            return (
              <Button
                key={source}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
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
            onClick={() => setFilters({ offset: 0, limit: filters.limit ?? 20 })}
          >
            Réinitialiser
          </Button>
        </div>
      </div>
    </div>
  );
}

