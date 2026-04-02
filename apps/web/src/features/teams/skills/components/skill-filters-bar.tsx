'use client';

import { Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SkillCategoryOption } from '../types/skill.types';
import type { SkillReferenceLevel, SkillStatus, SkillsListParams } from '../types/skill.types';
import { skillReferenceLevelLabel } from '../lib/skill-label-mappers';

const STATUSES: SkillStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];
const LEVELS: SkillReferenceLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

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
  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="skill-search">Recherche</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="skill-search"
              className="pl-9"
              placeholder="Nom ou description…"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined, offset: 0 })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
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
            <SelectTrigger>
              <SelectValue placeholder="Toutes" />
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
        </div>
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select
            value={filters.status?.[0] ?? '__all__'}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                status: v === '__all__' ? undefined : [v as SkillStatus],
                offset: 0,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'ACTIVE' ? 'Actif' : s === 'DRAFT' ? 'Brouillon' : 'Archivé'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Niveau de référence</Label>
          <Select
            value={filters.referenceLevel?.[0] ?? '__all__'}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                referenceLevel: v === '__all__' ? undefined : [v as SkillReferenceLevel],
                offset: 0,
              })
            }
          >
            <SelectTrigger className="w-[min(100%,220px)]">
              <SelectValue placeholder="Tous" />
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
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <Switch
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
      </div>
    </div>
  );
}
