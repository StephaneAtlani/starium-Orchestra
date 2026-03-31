'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL } from '../constants/project-enum-labels';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectPortfolioCategories } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

const SORT_LABEL: Record<ProjectsListFilters['sortBy'], string> = {
  name: 'Nom',
  targetEndDate: 'Échéance',
  status: 'Statut',
  priority: 'Priorité',
  criticality: 'Criticité',
  computedHealth: 'Santé',
  progressPercent: 'Avancement',
};

export interface ProjectsPortfolioFiltersBarProps {
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  /** Rôles dérivés des lignes chargées (Gantt / liste). */
  myRoleOptions: string[];
  /** Gantt portefeuille : pilotage du zoom temps (UI dans la barre de filtres). */
  portfolioGanttZoom?: {
    value: number;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onReset: () => void;
  };
  /** Gantt portefeuille : case « Infobulles » sur la ligne des options rapides. */
  portfolioGanttTooltips?: {
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
  };
}

export function ProjectsPortfolioFiltersBar({
  filters,
  setFilters,
  myRoleOptions,
  portfolioGanttZoom,
  portfolioGanttTooltips,
}: ProjectsPortfolioFiltersBarProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const categoriesQuery = useQuery({
    queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    queryFn: () => listProjectPortfolioCategories(authFetch),
    enabled: Boolean(clientId),
  });

  const categoryGroups = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((root) => ({
        rootId: root.id,
        rootName: root.name,
        children: (root.children ?? []).map((child) => ({
          id: child.id,
          label: child.name,
          fullLabel: `${root.name} / ${child.name}`,
        })),
      })),
    [categoriesQuery.data],
  );

  const categoryOptions = useMemo(
    () =>
      categoryGroups.flatMap((group) =>
        group.children.map((child) => ({ id: child.id, label: child.fullLabel })),
      ),
    [categoryGroups],
  );

  const categoryKey = filters.portfolioCategoryId ?? '__all__';
  const kindKey = filters.kind ?? '__all__';
  const statusKey = filters.status ?? '__all__';
  const healthKey = filters.computedHealth ?? '__all__';
  const myRoleKey = filters.myRole ?? '__all__';

  return (
    <div
      className="border-border/60 bg-muted/20 space-y-3 border-b px-3 py-3 sm:px-4"
      role="search"
      aria-label="Filtres portefeuille projets"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="pf-search" className="text-xs">
            Recherche
          </Label>
          <Input
            id="pf-search"
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            placeholder="Nom ou code…"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Catégorie portefeuille</Label>
          <Select
            value={categoryKey}
            onValueChange={(v) =>
              setFilters({ portfolioCategoryId: !v || v === '__all__' ? undefined : v })
            }
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
              <SelectValue>
                {categoryKey === '__all__'
                  ? 'Toutes'
                  : categoryOptions.find((o) => o.id === categoryKey)?.label ?? 'Catégorie'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les catégories</SelectItem>
              <SelectSeparator />
              {categoryGroups.map((group) => (
                <SelectGroup key={group.rootId}>
                  <SelectLabel>{group.rootName}</SelectLabel>
                  {group.children.length === 0 ? (
                    <SelectItem value={`__empty__${group.rootId}`} disabled>
                      Aucune sous-catégorie
                    </SelectItem>
                  ) : (
                    group.children.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nature</Label>
          <Select
            value={kindKey}
            onValueChange={(v) => setFilters({ kind: !v || v === '__all__' ? undefined : v })}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
              <SelectValue>
                {kindKey === '__all__' ? 'Toutes' : PROJECT_KIND_LABEL[kindKey] ?? kindKey}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              <SelectItem value="PROJECT">{PROJECT_KIND_LABEL.PROJECT}</SelectItem>
              <SelectItem value="ACTIVITY">{PROJECT_KIND_LABEL.ACTIVITY}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Santé</Label>
          <Select
            value={healthKey}
            onValueChange={(v) =>
              setFilters({
                computedHealth: !v || v === '__all__' ? undefined : (v as 'GREEN' | 'ORANGE' | 'RED'),
              })
            }
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
              <SelectValue>
                {healthKey === '__all__'
                  ? 'Toutes'
                  : healthKey === 'GREEN'
                    ? 'Bon'
                    : healthKey === 'ORANGE'
                      ? 'Attention'
                      : 'Critique'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes</SelectItem>
              <SelectItem value="GREEN">Bon</SelectItem>
              <SelectItem value="ORANGE">Attention</SelectItem>
              <SelectItem value="RED">Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Statut</Label>
          <Select
            value={statusKey}
            onValueChange={(v) => setFilters({ status: !v || v === '__all__' ? undefined : v })}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
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

        <div className="space-y-1.5">
          <Label className="text-xs">Mon rôle</Label>
          <Select
            value={myRoleKey}
            onValueChange={(v) => setFilters({ myRole: !v || v === '__all__' ? undefined : v })}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
              <SelectValue>{myRoleKey === '__all__' ? 'Tous' : myRoleKey}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les rôles</SelectItem>
              {myRoleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Trier par</Label>
          <Select
            value={filters.sortBy}
            onValueChange={(v) =>
              setFilters({
                sortBy: v as ProjectsListFilters['sortBy'],
              })
            }
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
              <SelectValue>{SORT_LABEL[filters.sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as ProjectsListFilters['sortBy'][]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Ordre</Label>
          <Select
            value={filters.sortOrder}
            onValueChange={(v) =>
              setFilters({ sortOrder: v === 'desc' ? 'desc' : 'asc' })
            }
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs">
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
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-0.5">
        {portfolioGanttZoom ? (
          <div
            className="flex items-center gap-1.5"
            title="Ctrl + molette sur la frise pour zoomer"
          >
            <span className="text-muted-foreground shrink-0 text-xs">Zoom temps</span>
            <div className="bg-background/80 inline-flex items-center rounded-md border shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0 rounded-r-none"
                onClick={portfolioGanttZoom.onZoomOut}
                aria-label="Zoom arrière sur la frise"
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="text-muted-foreground min-w-[2.75rem] px-1 text-center text-[11px] tabular-nums">
                {Math.round(portfolioGanttZoom.value * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0 rounded-none border-x border-border/60"
                onClick={portfolioGanttZoom.onZoomIn}
                aria-label="Zoom avant sur la frise"
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0 rounded-l-none"
                onClick={portfolioGanttZoom.onReset}
                aria-label="Réinitialiser le zoom temps"
                title="100 %"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="border-input text-primary focus-visible:ring-ring size-4 shrink-0 rounded border shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2"
            checked={filters.atRiskOnly}
            onChange={(e) => setFilters({ atRiskOnly: e.target.checked })}
          />
          <span>À risque (santé ≠ bon ou bloqué / retard)</span>
        </label>
        {portfolioGanttTooltips ? (
          <label
            className="flex cursor-pointer items-center gap-2 text-xs"
            title="Décocher pour masquer les infobulles sur la liste et la frise"
          >
            <input
              type="checkbox"
              className="border-input text-primary focus-visible:ring-ring size-4 shrink-0 rounded border shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2"
              checked={portfolioGanttTooltips.enabled}
              onChange={(e) => portfolioGanttTooltips.onEnabledChange(e.target.checked)}
            />
            <span>Infobulles</span>
          </label>
        ) : null}
      </div>
    </div>
  );
}
