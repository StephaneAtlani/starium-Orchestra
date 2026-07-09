'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import type { ProjectListItem } from '../types/project.types';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import { ProjectsPortfolioFiltersBar } from './projects-portfolio-filters-bar';
import { ProjectsListProjectCard } from './projects-list-project-card';

export interface ProjectsListMobileViewProps {
  items: ProjectListItem[];
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  onReset: () => void;
  myRoleOptions: string[];
  ownerOptions: { id: string; label: string }[];
  badgeMerged: MergedUiBadges;
}

function MobileFilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'starium-filter-chip min-h-11 px-3.5 text-sm',
        active && 'starium-filter-chip--active',
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ProjectsListMobileView({
  items,
  filters,
  setFilters,
  onReset,
  myRoleOptions,
  ownerOptions,
  badgeMerged,
}: ProjectsListMobileViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
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
    if (filters.parentProjectId) count += 1;
    if (filters.rootOnly) count += 1;
    if ((filters.tagIds?.length ?? 0) > 0) count += 1;
    if (filters.sortBy !== 'name' || filters.sortOrder !== 'asc') count += 1;
    return count;
  }, [filters]);

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            placeholder="Rechercher un projet…"
            aria-label="Rechercher un projet"
            className="h-12 rounded-xl pl-10 pr-3 text-base"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 shrink-0 gap-2 rounded-xl px-3.5 text-base"
          onClick={() => setFiltersOpen(true)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtrer
          {activeFilterCount > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <StariumModal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtres et tri"
        icon={SlidersHorizontal}
        size="full"
        contentClassName="gap-0 bg-card p-0 pb-0 shadow-xl ring-0 backdrop-blur-none max-h-[min(92dvh,calc(100dvh-1rem))]"
        bodyClassName="px-4 py-4"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => {
                onReset();
                setFiltersOpen(false);
              }}
            >
              Réinitialiser
            </Button>
            <Button
              type="button"
              className="h-11 flex-1"
              onClick={() => setFiltersOpen(false)}
            >
              Appliquer
            </Button>
          </>
        }
      >
        <div
          className="mb-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtres rapides"
        >
          <MobileFilterChip
            label="Mes projets"
            active={filters.myProjectsOnly}
            onClick={() => setFilters({ myProjectsOnly: !filters.myProjectsOnly })}
          />
          <MobileFilterChip
            label="En retard"
            active={filters.lateOnly}
            onClick={() =>
              setFilters({
                lateOnly: !filters.lateOnly,
                atRiskOnly: false,
              })
            }
          />
          <MobileFilterChip
            label="À risque"
            active={filters.atRiskOnly}
            onClick={() =>
              setFilters({
                atRiskOnly: !filters.atRiskOnly,
                lateOnly: false,
              })
            }
          />
        </div>

        <ProjectsPortfolioFiltersBar
          embedded
          mobileSheet
          hideSearch
          filters={filters}
          setFilters={setFilters}
          myRoleOptions={myRoleOptions}
          ownerOptions={ownerOptions}
        />
      </StariumModal>

      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Aucun projet ne correspond à ce périmètre. Élargissez les filtres ou créez un nouveau
          projet.
        </p>
      ) : (
        <ul role="list" aria-label="Liste des projets" className="space-y-2.5 p-3">
          {items.map((project) => (
            <ProjectsListProjectCard
              key={project.id}
              project={project}
              badgeMerged={badgeMerged}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
