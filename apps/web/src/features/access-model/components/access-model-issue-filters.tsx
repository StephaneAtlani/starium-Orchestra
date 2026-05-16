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
import { moduleLabel } from '../lib/labels';

const MODULE_OPTIONS = [
  'projects',
  'budgets',
  'contracts',
  'procurement',
  'strategic_vision',
  'organization',
] as const;

export function AccessModelIssueFilters({
  moduleFilter,
  search,
  onModuleChange,
  onSearchChange,
}: {
  moduleFilter: string;
  search: string;
  onModuleChange: (v: string) => void;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1">
        <Label htmlFor="access-model-search">Recherche</Label>
        <Input
          id="access-model-search"
          placeholder="Filtrer par libellé…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="w-full space-y-1 sm:w-48">
        <Label>Module</Label>
        <Select
          value={moduleFilter || 'all'}
          onValueChange={(v) => onModuleChange(v === 'all' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tous les modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modules</SelectItem>
            {MODULE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {moduleLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
