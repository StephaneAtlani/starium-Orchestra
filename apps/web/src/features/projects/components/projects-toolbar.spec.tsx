import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectsToolbar } from './projects-toolbar';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { PROJECTS_DEFAULT_LIMIT, PROJECTS_DEFAULT_PAGE } from '../hooks/use-projects-list-filters';

const baseFilters: ProjectsListFilters = {
  page: PROJECTS_DEFAULT_PAGE,
  limit: PROJECTS_DEFAULT_LIMIT,
  sortBy: 'name',
  sortOrder: 'asc',
  lateOnly: false,
  atRiskOnly: false,
  myProjectsOnly: false,
  rootOnly: false,
};

describe('ProjectsToolbar', () => {
  it('expose la barre mockup (onglets, chips, recherche, filtres)', () => {
    const { container } = render(
      <ProjectsToolbar
        filters={baseFilters}
        setFilters={vi.fn()}
        onReset={vi.fn()}
        embedded
        viewMode="table"
        onViewModeChange={vi.fn()}
        onColumnDensityChange={vi.fn()}
      />,
    );

    expect(container.querySelector('.starium-filter-bar-left')).toBeTruthy();
    expect(container.querySelector('.starium-filter-bar-right')).toBeTruthy();
    expect(container.querySelector('.starium-filter-bar-view')).toBeTruthy();
    expect(container.querySelector('.starium-filter-bar-chips')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Tableau/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /En retard/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Colonnes/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /Rechercher un projet/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Filtres/i })).toBeTruthy();
    expect(screen.queryByText('Filtrer et trier')).toBeNull();
  });

  it('bascule la densité de colonnes', () => {
    const onColumnDensityChange = vi.fn();
    render(
      <ProjectsToolbar
        filters={baseFilters}
        setFilters={vi.fn()}
        onReset={vi.fn()}
        embedded
        viewMode="table"
        onViewModeChange={vi.fn()}
        columnDensity="basic"
        onColumnDensityChange={onColumnDensityChange}
      />,
    );

    screen.getByRole('button', { name: /Colonnes/i }).click();
    expect(onColumnDensityChange).toHaveBeenCalledWith('extended');
  });
});
