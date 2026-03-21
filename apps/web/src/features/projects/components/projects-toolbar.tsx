'use client';

import type { ComponentType, ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import {
  PROJECT_CRITICALITY_LABEL,
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { ArrowDownWideNarrow, Filter, RotateCcw, Search } from 'lucide-react';

const SORT_LABEL: Record<string, string> = {
  name: 'Nom',
  targetEndDate: 'Échéance cible',
  status: 'Statut',
  priority: 'Priorité',
  criticality: 'Criticité',
  computedHealth: 'Santé',
  progressPercent: 'Avancement',
};

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </div>
  );
}

export interface ProjectsToolbarProps {
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  onReset: () => void;
}

export function ProjectsToolbar({ filters, setFilters, onReset }: ProjectsToolbarProps) {
  const kindKey = filters.kind ?? '__all__';
  const statusKey = filters.status ?? '__all__';
  const priorityKey = filters.priority ?? '__all__';
  const criticalityKey = filters.criticality ?? '__all__';

  const fieldClass = 'flex min-w-0 flex-col gap-1.5';

  return (
    <Card
      size="sm"
      className="shadow-sm"
      role="search"
      aria-label="Filtrer et trier la liste des projets"
    >
      <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">Filtrer et trier</CardTitle>
          <CardDescription>
            Les critères sont synchronisés avec l&apos;URL (partage et rafraîchissement).
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start"
          onClick={onReset}
          data-testid="projects-filters-reset"
        >
          <RotateCcw className="size-3.5" />
          Réinitialiser
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* Recherche */}
        <div className="space-y-2">
          <SectionTitle icon={Search}>Recherche</SectionTitle>
          <div className="relative max-w-lg">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="projects-search"
              placeholder="Nom ou code projet…"
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ search: e.target.value || undefined })}
              className={cn('h-9 pl-9', 'bg-background')}
              data-testid="projects-search"
            />
          </div>
        </div>

        <div className="h-px w-full bg-border/70" />

        {/* Filtres métier */}
        <div className="space-y-3">
          <SectionTitle icon={Filter}>Filtrer par</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={fieldClass}>
              <Label htmlFor="projects-filter-kind" className="text-xs text-muted-foreground">
                Nature
              </Label>
              <Select
                value={kindKey}
                onValueChange={(v) =>
                  setFilters({ kind: v === '__all__' || !v ? undefined : v })
                }
              >
                <SelectTrigger id="projects-filter-kind" size="sm" className="w-full">
                  <SelectValue>
                    {kindKey === '__all__'
                      ? 'Toutes'
                      : PROJECT_KIND_LABEL[kindKey] ?? kindKey}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes</SelectItem>
                  <SelectItem value="PROJECT">{PROJECT_KIND_LABEL.PROJECT}</SelectItem>
                  <SelectItem value="ACTIVITY">{PROJECT_KIND_LABEL.ACTIVITY}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="projects-filter-status" className="text-xs text-muted-foreground">
                Statut
              </Label>
              <Select
                value={statusKey}
                onValueChange={(v) =>
                  setFilters({ status: v === '__all__' || !v ? undefined : v })
                }
              >
                <SelectTrigger id="projects-filter-status" size="sm" className="w-full">
                  <SelectValue>
                    {statusKey === '__all__'
                      ? 'Tous les statuts'
                      : PROJECT_STATUS_LABEL[statusKey] ?? statusKey}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les statuts</SelectItem>
                  {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="projects-filter-priority" className="text-xs text-muted-foreground">
                Priorité
              </Label>
              <Select
                value={priorityKey}
                onValueChange={(v) =>
                  setFilters({ priority: v === '__all__' || !v ? undefined : v })
                }
              >
                <SelectTrigger id="projects-filter-priority" size="sm" className="w-full">
                  <SelectValue>
                    {priorityKey === '__all__'
                      ? 'Toutes les priorités'
                      : PROJECT_PRIORITY_LABEL[priorityKey] ?? priorityKey}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les priorités</SelectItem>
                  {Object.entries(PROJECT_PRIORITY_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <Label htmlFor="projects-filter-criticality" className="text-xs text-muted-foreground">
                Criticité
              </Label>
              <Select
                value={criticalityKey}
                onValueChange={(v) =>
                  setFilters({ criticality: v === '__all__' || !v ? undefined : v })
                }
              >
                <SelectTrigger id="projects-filter-criticality" size="sm" className="w-full">
                  <SelectValue>
                    {criticalityKey === '__all__'
                      ? 'Toutes les criticités'
                      : PROJECT_CRITICALITY_LABEL[criticalityKey] ?? criticalityKey}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes les criticités</SelectItem>
                  {Object.entries(PROJECT_CRITICALITY_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-border/70" />

        {/* Tri + option */}
        <div className="space-y-3">
          <SectionTitle icon={ArrowDownWideNarrow}>Tri</SectionTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className={cn(fieldClass, 'min-w-0 flex-1 lg:max-w-[14rem]')}>
              <Label htmlFor="projects-sort-by" className="text-xs text-muted-foreground">
                Trier par
              </Label>
              <Select
                value={filters.sortBy}
                onValueChange={(v) =>
                  setFilters({ sortBy: v as ProjectsListFilters['sortBy'] })
                }
              >
                <SelectTrigger id="projects-sort-by" size="sm" className="w-full">
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
            <div className={cn(fieldClass, 'w-full min-w-0 sm:w-auto sm:min-w-[8rem]')}>
              <Label htmlFor="projects-sort-order" className="text-xs text-muted-foreground">
                Ordre
              </Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(v) => setFilters({ sortOrder: v as 'asc' | 'desc' })}
              >
                <SelectTrigger id="projects-sort-order" size="sm" className="w-full sm:w-[8.5rem]">
                  <SelectValue>
                    {filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Croissant</SelectItem>
                  <SelectItem value="desc">Décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-h-9 items-center pb-px lg:pb-0">
              <label
                htmlFor="at-risk-only"
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm',
                  'transition-colors hover:bg-muted/40 has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50',
                )}
              >
                <input
                  type="checkbox"
                  id="at-risk-only"
                  className="size-4 shrink-0 rounded border-input accent-primary"
                  checked={filters.atRiskOnly}
                  onChange={(e) => setFilters({ atRiskOnly: e.target.checked })}
                  data-testid="projects-at-risk-only"
                />
                <span className="text-card-foreground leading-snug">
                  À risque <span className="text-muted-foreground">(hors santé verte)</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
