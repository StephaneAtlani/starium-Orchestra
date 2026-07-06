import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { Input } from '@/components/ui/input';

describe('FilterBar', () => {
  it('rend section avec aria-label par défaut', () => {
    render(
      <FilterBar>
        <FilterBarField id="q" label="Recherche">
          {({ controlId }) => <Input id={controlId} />}
        </FilterBarField>
      </FilterBar>,
    );

    const section = screen.getByRole('region', { name: 'Filtres' });
    expect(section.className).toContain('grid-cols-1');
    expect(section.className).toContain('lg:grid-cols-3');
  });

  it('role search optionnel via asSearch', () => {
    render(
      <FilterBar asSearch aria-label="Recherche contrats">
        <FilterBarField id="q" label="Recherche">
          {({ controlId }) => <Input id={controlId} />}
        </FilterBarField>
      </FilterBar>,
    );

    expect(screen.getByRole('search', { name: 'Recherche contrats' })).toBeTruthy();
  });

  it('4 champs — desktopColumns auto', () => {
    const { container } = render(
      <FilterBar desktopColumns="auto">
        {['a', 'b', 'c', 'd'].map((id) => (
          <FilterBarField key={id} id={id} label={id}>
            {({ controlId }) => <Input id={controlId} />}
          </FilterBarField>
        ))}
      </FilterBar>,
    );

    const section = container.querySelector('section');
    expect(section?.className).toContain(
      'xl:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]',
    );
  });
});

describe('FilterBarField', () => {
  it('input natif — label htmlFor pointe vers controlId', () => {
    render(
      <FilterBarField id="contracts-search" label="Recherche">
        {({ controlId }) => (
          <Input id={controlId} data-testid="search-input" className="w-full" />
        )}
      </FilterBarField>,
    );

    const label = screen.getByText('Recherche');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', 'contracts-search');
    expect(label).toHaveAttribute('id', 'contracts-search-label');

    const input = screen.getByTestId('search-input');
    expect(input).toHaveAttribute('id', 'contracts-search');
    expect(input.className).toContain('w-full');

    const wrapper = input.parentElement;
    expect(wrapper?.className).toContain('w-full');
    expect(wrapper?.className).toContain('min-w-0');
  });

  it('Select-like trigger — aria-labelledby vers labelId', () => {
    render(
      <FilterBarField id="status" label="Statut">
        {({ controlId, labelId, descriptionId }) => (
          <button
            type="button"
            id={controlId}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            data-testid="status-trigger"
          >
            Tous statuts
          </button>
        )}
      </FilterBarField>,
    );

    const trigger = screen.getByTestId('status-trigger');
    expect(trigger).toHaveAttribute('aria-labelledby', 'status-label');
  });

  it('description — aria-describedby vers descriptionId', () => {
    render(
      <FilterBarField
        id="expires"
        label="Expire au plus tard le"
        description="Filtre les contrats dont la fin d'effet est antérieure."
      >
        {({ controlId, descriptionId }) => (
          <Input
            id={controlId}
            type="date"
            aria-describedby={descriptionId}
            data-testid="date-input"
          />
        )}
      </FilterBarField>,
    );

    const input = screen.getByTestId('date-input');
    expect(input).toHaveAttribute('aria-describedby', 'expires-description');
    expect(document.getElementById('expires-description')).toBeTruthy();
  });
});
