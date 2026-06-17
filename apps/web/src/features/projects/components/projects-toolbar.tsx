'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { STARIUM_APP_WORKSPACE_DOM_ID } from '@/components/shell/app-shell';
import { Clock, Maximize2, Minimize, User } from 'lucide-react';

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
}

export function ProjectsToolbar({
  filters,
  setFilters,
  onReset,
  embedded = false,
  viewMode = 'table',
  onViewModeChange,
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
      <span className="starium-filter-bar-title">Filtrer et trier</span>
      <div className="starium-filter-bar-actions">
        {onViewModeChange ? (
          <div className="starium-tab-group" role="tablist" aria-label="Mode d'affichage">
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
        ) : null}
        <button
          type="button"
          className={cn(
            'starium-filter-chip',
            filters.lateOnly && 'starium-filter-chip--active',
          )}
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
          onClick={() => setFilters({ myProjectsOnly: !filters.myProjectsOnly })}
          title="Afficher uniquement les projets où vous avez un rôle"
        >
          <User aria-hidden />
          Mes projets
        </button>
        <button
          type="button"
          className="starium-filter-chip"
          onClick={() => void toggleFullscreen()}
          title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
        >
          {isFullscreen ? <Minimize aria-hidden /> : <Maximize2 aria-hidden />}
          {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
        </button>
        <button
          type="button"
          className="starium-filter-chip starium-filter-chip--muted"
          onClick={onReset}
          data-testid="projects-filters-reset"
        >
          Réinitialiser
        </button>
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
