import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectsToolbar } from './projects-toolbar';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';

const baseFilters: ProjectsListFilters = {
  search: '',
  categoryId: '',
  kind: '',
  health: '',
  status: '',
  role: '',
  sortBy: 'name',
  sortOrder: 'asc',
  lateOnly: false,
  atRiskOnly: false,
  myProjectsOnly: false,
  tagIds: [],
};

describe('ProjectsToolbar mobile structure', () => {
  it('expose la structure mobile-first (header, body, chips)', () => {
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

    expect(container.querySelector('.starium-filter-bar-header')).toBeTruthy();
    expect(container.querySelector('.starium-filter-bar-body')).toBeTruthy();
    expect(container.querySelector('.starium-filter-bar-view')).toBeTruthy();
    expect(container.querySelector('.starium-filter-bar-chips')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Tableau' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /En retard/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Toutes les colonnes/i })).toBeTruthy();
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

    screen.getByRole('button', { name: /Toutes les colonnes/i }).click();
    expect(onColumnDensityChange).toHaveBeenCalledWith('extended');
  });
});
