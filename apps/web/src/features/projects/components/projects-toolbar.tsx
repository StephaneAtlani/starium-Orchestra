'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { Expand, Minimize } from 'lucide-react';

export interface ProjectsToolbarProps {
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  onReset: () => void;
  embedded?: boolean;
}

export function ProjectsToolbar({
  filters,
  setFilters,
  onReset,
  embedded = false,
}: ProjectsToolbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  };

  const content = (
    <>
      <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">Filtrer et trier</CardTitle>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            type="button"
            variant={filters.myProjectsOnly ? 'default' : 'outline'}
            size="sm"
            className="shrink-0"
            onClick={() => setFilters({ myProjectsOnly: !filters.myProjectsOnly })}
            title="Afficher uniquement les projets où vous avez un rôle"
          >
            Mes projets
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
          >
            {isFullscreen ? <Minimize className="size-3.5" /> : <Expand className="size-3.5" />}
            {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onReset}
            data-testid="projects-filters-reset"
          >
            Réinitialiser
          </Button>
        </div>
      </CardHeader>
    </>
  );

  if (embedded) {
    return (
      <div role="search" aria-label="Filtrer et trier la liste des projets">
        {content}
      </div>
    );
  }

  return (
    <Card
      size="sm"
      className="shadow-sm"
      role="search"
      aria-label="Filtrer et trier la liste des projets"
    >
      {content}
    </Card>
  );
}
