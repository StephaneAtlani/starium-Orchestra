'use client';

import { useEffect, useMemo, useState, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import type { ProjectsTableColumnDensity } from '../lib/projects-table-column-density';
import type { ProjectListItem } from '../types/project.types';
import {
  getWorkspaceFullscreenTarget,
  toggleWorkspaceFullscreen,
} from '@/lib/workspace-fullscreen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProjectsPortfolioFiltersBar } from './projects-portfolio-filters-bar';
import {
  ChevronDown,
  Clock,
  Columns3,
  Kanban,
  LayoutGrid,
  Maximize2,
  Minimize,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
} from 'lucide-react';

function countActivePortfolioFilters(filters: ProjectsListFilters): number {
  let count = 0;
  if (filters.portfolioCategoryId) count += 1;
  if (filters.kind) count += 1;
  if (filters.status) count += 1;
  if (filters.computedHealth) count += 1;
  if (filters.myRole) count += 1;
  if (filters.ownerUserId) count += 1;
  if (filters.lateOnly) count += 1;
  if (filters.atRiskOnly) count += 1;
  if (filters.myProjectsOnly) count += 1;
  if ((filters.tagIds?.length ?? 0) > 0) count += 1;
  if (filters.sortBy !== 'name' || filters.sortOrder !== 'asc') count += 1;
  return count;
}

type ToolbarChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tip: string;
};

function ToolbarChip({ tip, className, children, ...props }: ToolbarChipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button type="button" className={cn('starium-filter-chip', className)} {...props} />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-center">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export interface ProjectsToolbarProps {
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  onReset: () => void;
  embedded?: boolean;
  viewMode?: 'table' | 'kanban';
  onViewModeChange?: (mode: 'table' | 'kanban') => void;
  columnDensity?: ProjectsTableColumnDensity;
  onColumnDensityChange?: (density: ProjectsTableColumnDensity) => void;
  /** Lignes chargées — options « Mon rôle » dans le panneau Filtres. */
  portfolioItems?: ProjectListItem[];
  ownerOptions?: { id: string; label: string }[];
}

export function ProjectsToolbar({
  filters,
  setFilters,
  onReset,
  embedded = false,
  viewMode = 'table',
  onViewModeChange,
  columnDensity = 'basic',
  onColumnDensityChange,
  portfolioItems = [],
  ownerOptions = [],
}: ProjectsToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const myRoleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          portfolioItems
            .flatMap((item) => item.myRoles ?? (item.myRole ? [item.myRole] : []))
            .map((role) => role.trim())
            .filter((value): value is string => Boolean(value && value.length > 0)),
        ),
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [portfolioItems],
  );

  const activeFilterCount = useMemo(() => countActivePortfolioFilters(filters), [filters]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const target = getWorkspaceFullscreenTarget();
      setIsFullscreen(!!target && document.fullscreenElement === target);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const filterBar = (
    <TooltipProvider delay={250}>
    <div className="starium-filter-bar">
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
                Tableau
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
            <ToolbarChip
              tip="Projets dont la date cible est dépassée (signal retard)"
              className={cn(
                filters.lateOnly && 'starium-filter-chip--active starium-filter-chip--danger',
              )}
              aria-pressed={filters.lateOnly}
              aria-label="En retard"
              onClick={() => setFilters({ lateOnly: !filters.lateOnly, atRiskOnly: false })}
            >
              <Clock aria-hidden />
              <span className="hidden xl:inline">En retard</span>
            </ToolbarChip>
            <ToolbarChip
              tip="Afficher uniquement les projets où vous avez un rôle"
              className={cn(filters.myProjectsOnly && 'starium-filter-chip--active')}
              aria-pressed={filters.myProjectsOnly}
              aria-label="Mes projets"
              onClick={() => setFilters({ myProjectsOnly: !filters.myProjectsOnly })}
            >
              <User aria-hidden />
              <span className="hidden xl:inline">Mes projets</span>
            </ToolbarChip>
            <ToolbarChip
              tip={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              onClick={() => void toggleWorkspaceFullscreen()}
            >
              {isFullscreen ? <Minimize aria-hidden /> : <Maximize2 aria-hidden />}
              <span className="hidden xl:inline">
                {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              </span>
            </ToolbarChip>
            {onColumnDensityChange && viewMode === 'table' ? (
              <ToolbarChip
                tip={
                  columnDensity === 'extended'
                    ? 'Revenir aux colonnes essentielles'
                    : 'Afficher toutes les colonnes du tableau'
                }
                className={cn(columnDensity === 'extended' && 'starium-filter-chip--active')}
                aria-pressed={columnDensity === 'extended'}
                aria-label={
                  columnDensity === 'extended' ? 'Colonnes de base' : 'Colonnes du tableau'
                }
                onClick={() =>
                  onColumnDensityChange(columnDensity === 'extended' ? 'basic' : 'extended')
                }
              >
                <Columns3 aria-hidden />
                <span className="hidden xl:inline">
                  {columnDensity === 'extended' ? 'Colonnes de base' : 'Toutes les colonnes'}
                </span>
              </ToolbarChip>
            ) : null}
            <ToolbarChip
              tip="Réinitialiser les filtres et le tri"
              className="starium-filter-chip--reset hidden xl:inline-flex"
              onClick={onReset}
              data-testid="projects-filters-reset"
              aria-label="Réinitialiser"
            >
              <RotateCcw aria-hidden />
              <span className="hidden lg:inline">Réinitialiser</span>
            </ToolbarChip>
        </div>
      </div>

      <div className="starium-filter-bar-right">
        <div className="starium-filter-bar-search">
          <Search className="starium-filter-bar-search-icon" aria-hidden />
          <Input
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            placeholder="Rechercher…"
            aria-label="Rechercher un projet"
            className="starium-filter-bar-search-input !pl-9 !pr-2.5"
          />
        </div>
        <button
          type="button"
          className="starium-filter-chip"
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal aria-hidden />
          Filtres
          <ChevronDown className="starium-filter-chip-chevron" aria-hidden />
          {activeFilterCount > 0 ? (
            <span className="starium-filter-chip-badge">{activeFilterCount}</span>
          ) : null}
        </button>
      </div>
    </div>
    </TooltipProvider>
  );

  const filtersDialog = (
    <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
      <DialogContent size="lg" className="max-h-[min(85vh,720px)] gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Filtres et tri</DialogTitle>
        </DialogHeader>
        <DialogBody className="overflow-y-auto px-5 py-4">
          <ProjectsPortfolioFiltersBar
            embedded
            hideSearch
            filters={filters}
            setFilters={setFilters}
            myRoleOptions={myRoleOptions}
            ownerOptions={ownerOptions}
          />
        </DialogBody>
        <DialogFooter className="border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onReset();
              setFiltersOpen(false);
            }}
          >
            Réinitialiser
          </Button>
          <Button type="button" onClick={() => setFiltersOpen(false)}>
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (embedded) {
    return (
      <>
        <div
          role="search"
          className="w-full min-w-0 overflow-hidden"
          aria-label="Filtrer et trier la liste des projets"
        >
          {filterBar}
        </div>
        {filtersDialog}
      </>
    );
  }

  return (
    <>
      <div
        className="starium-panel rounded-[var(--ds-card-radius)] border border-border bg-card shadow-[var(--ds-card-shadow-elevated)]"
        role="search"
        aria-label="Filtrer et trier la liste des projets"
      >
        {filterBar}
      </div>
      {filtersDialog}
    </>
  );
}
