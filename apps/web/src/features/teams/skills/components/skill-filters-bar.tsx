'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import type { SkillCategoryOption } from '../types/skill.types';
import type { SkillReferenceLevel, SkillStatus, SkillsListParams } from '../types/skill.types';
import { skillReferenceLevelLabel } from '../lib/skill-label-mappers';

const STATUSES: SkillStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];
const LEVELS: SkillReferenceLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const STATUS_LABELS: Record<SkillStatus, string> = {
  ACTIVE: 'Actif',
  DRAFT: 'Brouillon',
  ARCHIVED: 'Archivé',
};

type SkillFiltersBarProps = {
  filters: SkillsListParams;
  setFilters: (next: SkillsListParams) => void;
  categoryOptions: SkillCategoryOption[];
};

export function SkillFiltersBar({
  filters,
  setFilters,
  categoryOptions,
}: SkillFiltersBarProps) {
  const categoryLabel =
    !filters.categoryId
      ? 'Toutes les catégories'
      : categoryOptions.find((c) => c.id === filters.categoryId)?.name ?? 'Catégorie';

  const statusKey = filters.status?.[0] ?? '__all__';
  const statusLabel =
    statusKey === '__all__' ? 'Tous les statuts' : STATUS_LABELS[statusKey as SkillStatus] ?? statusKey;

  const levelKey = filters.referenceLevel?.[0] ?? '__all__';
  const levelLabel =
    levelKey === '__all__'
      ? 'Tous les niveaux'
      : skillReferenceLevelLabel(levelKey as SkillReferenceLevel);

  return (
    <FilterBar aria-label="Filtres compétences" asSearch desktopColumns="auto">
      <FilterBarField id="skill-search" label="Recherche">
        {({ controlId }) => (
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              id={controlId}
              className="w-full pl-9"
              placeholder="Nom ou description…"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, offset: 0 })
              }
            />
          </div>
        )}
      </FilterBarField>
      <FilterBarField id="skill-category" label="Catégorie">
        {({ controlId, labelId }) => (
          <Select
            value={filters.categoryId ?? '__all__'}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                categoryId: v === '__all__' || v == null ? undefined : v,
                offset: 0,
              })
            }
          >
            <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
              <SelectValue>{categoryLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les catégories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBarField>
      <FilterBarField id="skill-status" label="Statut">
        {({ controlId, labelId }) => (
          <Select
            value={statusKey}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                status: v === '__all__' ? undefined : [v as SkillStatus],
                offset: 0,
              })
            }
          >
            <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
              <SelectValue>{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBarField>
      <FilterBarField id="skill-level" label="Niveau de référence">
        {({ controlId, labelId }) => (
          <Select
            value={levelKey}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                referenceLevel: v === '__all__' ? undefined : [v as SkillReferenceLevel],
                offset: 0,
              })
            }
          >
            <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
              <SelectValue>{levelLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les niveaux</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {skillReferenceLevelLabel(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBarField>
      <FilterBarField id="skill-include-archived" label="Archivées">
        {({ labelId }) => (
          <div className="flex min-h-11 items-center gap-2">
            <Switch
              aria-labelledby={labelId}
              aria-label="Inclure les compétences archivées"
              checked={filters.includeArchived === true}
              onCheckedChange={(checked) =>
                setFilters({
                  ...filters,
                  includeArchived: checked,
                  offset: 0,
                })
              }
            />
            <span className="text-sm text-muted-foreground">Inclure les compétences archivées</span>
          </div>
        )}
      </FilterBarField>
    </FilterBar>
  );
}
