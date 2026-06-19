'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import type { ProjectsTableColumnDensity } from '../lib/projects-table-column-density';
import { STARIUM_APP_WORKSPACE_DOM_ID } from '@/components/shell/app-shell';
import { Clock, Columns3, Maximize2, Minimize, User } from 'lucide-react';

function getWorkspaceFullscreenTarget(): HTMLElement | null {
  return document.getElementById(STARIUM_APP_WORKSPACE_DOM_ID);
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
}: ProjectsToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      const target = getWorkspaceFullscreenTarget();
      setIsFullscreen(!!target && document.fullscreenElement === target);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const target = getWorkspaceFullscreenTarget();
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (!target?.requestFullscreen) return;
    await target.requestFullscreen();
  };

  const content = (
    <div className="starium-filter-bar">
      <div className="starium-filter-bar-header">
        <span className="starium-filter-bar-title">Filtrer et trier</span>
      </div>

      <div className="starium-filter-bar-body">
        {onViewModeChange ? (
          <div
            className="starium-filter-bar-view"
            role="tablist"
            aria-label="Mode d'affichage"
          >
            <div className="starium-tab-group">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'table'}
                className={cn(
                  'starium-tab-btn',
                  viewMode === 'table' && 'starium-tab-btn--active',
                )}
                onClick={() => onViewModeChange('table')}
              >
                Tableau
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'kanban'}
                className={cn(
                  'starium-tab-btn',
                  viewMode === 'kanban' && 'starium-tab-btn--active',
                )}
                onClick={() => onViewModeChange('kanban')}
              >
                Kanban
              </button>
            </div>
          </div>
        ) : null}

        <div className="starium-filter-bar-chips">
          <button
            type="button"
            className={cn(
              'starium-filter-chip',
              filters.lateOnly && 'starium-filter-chip--active',
            )}
            aria-pressed={filters.lateOnly}
            onClick={() =>
              setFilters({ lateOnly: !filters.lateOnly, atRiskOnly: false })
            }
            title="Date cible dépassée (signal retard)"
          >
            <Clock aria-hidden />
            En retard
          </button>
          <button
            type="button"
            className={cn(
              'starium-filter-chip',
              filters.myProjectsOnly && 'starium-filter-chip--active',
            )}
            aria-pressed={filters.myProjectsOnly}
            onClick={() => setFilters({ myProjectsOnly: !filters.myProjectsOnly })}
            title="Afficher uniquement les projets où vous avez un rôle"
          >
            <User aria-hidden />
            Mes projets
          </button>
          <button
            type="button"
            className="starium-filter-chip starium-filter-chip--wide"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
          >
            {isFullscreen ? <Minimize aria-hidden /> : <Maximize2 aria-hidden />}
            {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          </button>
          {onColumnDensityChange && viewMode === 'table' ? (
            <button
              type="button"
              className={cn(
                'starium-filter-chip starium-filter-chip--wide',
                columnDensity === 'extended' && 'starium-filter-chip--active',
              )}
              aria-pressed={columnDensity === 'extended'}
              onClick={() =>
                onColumnDensityChange(columnDensity === 'extended' ? 'basic' : 'extended')
              }
              title={
                columnDensity === 'extended'
                  ? 'Revenir aux colonnes essentielles'
                  : 'Afficher toutes les colonnes du tableau'
              }
            >
              <Columns3 aria-hidden />
              {columnDensity === 'extended' ? 'Colonnes de base' : 'Toutes les colonnes'}
            </button>
          ) : null}
          <button
            type="button"
            className="starium-filter-chip starium-filter-chip--muted starium-filter-chip--wide"
            onClick={onReset}
            data-testid="projects-filters-reset"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div role="search" aria-label="Filtrer et trier la liste des projets">
        {content}
      </div>
    );
  }

  return (
    <div
      className="starium-panel rounded-[var(--ds-card-radius)] border border-border bg-card shadow-[var(--ds-card-shadow-elevated)]"
      role="search"
      aria-label="Filtrer et trier la liste des projets"
    >
      {content}
    </div>
  );
}
