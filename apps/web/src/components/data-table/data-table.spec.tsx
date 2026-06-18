import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table.types';
import { resolveMobilePriority } from '@/components/data-table/data-table.types';

type TestRow = {
  id: string;
  name: string;
  status: string;
  internalId: string;
};

const baseRows: TestRow[] = [
  {
    id: 'uuid-1',
    name: 'Contrat Alpha',
    status: 'Actif',
    internalId: 'hidden-ref',
  },
];

function buildColumns(
  overrides?: Partial<DataTableColumn<TestRow>>[],
): DataTableColumn<TestRow>[] {
  const defaults: DataTableColumn<TestRow>[] = [
    {
      key: 'name',
      header: 'Nom',
      mobilePriority: 'primary',
      cell: (row) => <a href={`/items/${row.id}`}>{row.name}</a>,
    },
    {
      key: 'status',
      header: 'Statut',
      mobilePriority: 'secondary',
      cell: (row) => row.status,
    },
    {
      key: 'internalId',
      header: 'Référence interne',
      mobilePriority: 'hidden-mobile',
      cell: (row) => row.internalId,
    },
  ];

  if (!overrides) return defaults;
  return defaults.map((col, i) => ({ ...col, ...overrides[i] }));
}

describe('resolveMobilePriority', () => {
  it('respecte mobilePriority explicite', () => {
    const col: DataTableColumn<TestRow> = {
      key: 'amount',
      header: 'Montant',
      className: 'text-right',
      mobilePriority: 'secondary',
    };
    expect(resolveMobilePriority(col, 2, [col])).toBe('secondary');
  });

  it('détecte actions via key === actions', () => {
    const col: DataTableColumn<TestRow> = { key: 'actions', header: 'Actions' };
    expect(resolveMobilePriority(col, 1, [col])).toBe('actions');
  });

  it('fallback legacy text-right sur dernière colonne uniquement', () => {
    const cols: DataTableColumn<TestRow>[] = [
      { key: 'name', header: 'Nom' },
      { key: 'amount', header: 'Montant', className: 'text-right' },
    ];
    expect(resolveMobilePriority(cols[1], 1, cols)).toBe('actions');
    expect(resolveMobilePriority(cols[0], 0, cols)).toBe('primary');
  });

  it('première colonne → primary par défaut', () => {
    const col: DataTableColumn<TestRow> = { key: 'name', header: 'Nom' };
    expect(resolveMobilePriority(col, 0, [col])).toBe('primary');
  });
});

describe('DataTable mobile structure', () => {
  it('rend ul > li > article avec role=list', () => {
    const { container } = render(
      <DataTable
        columns={buildColumns()}
        data={baseRows}
        getRowId={(row) => row.id}
      />,
    );

    const list = container.querySelector('ul[role="list"]');
    expect(list).toBeTruthy();
    expect(list?.className).toContain('md:hidden');

    const items = list?.querySelectorAll(':scope > li');
    expect(items?.length).toBe(1);

    const article = items?.[0]?.querySelector('article');
    expect(article).toBeTruthy();
    expect(article?.className).toContain('border-border');
  });

  it('affiche primary + secondary et masque hidden-mobile en carte', () => {
    const { container } = render(
      <DataTable
        columns={buildColumns()}
        data={baseRows}
        getRowId={(row) => row.id}
      />,
    );

    const cardList = container.querySelector('ul[role="list"]');
    expect(cardList).toBeTruthy();
    expect(cardList?.textContent).toContain('Contrat Alpha');
    expect(cardList?.textContent).toContain('Statut');
    expect(cardList?.textContent).toContain('Actif');
    expect(cardList?.textContent).not.toContain('Référence interne');
    expect(cardList?.textContent).not.toContain('hidden-ref');
  });

  it('affiche le libellé métier et pas l’UUID brut en carte', () => {
    render(
      <DataTable
        columns={buildColumns()}
        data={baseRows}
        getRowId={(row) => row.id}
      />,
    );

    expect(screen.getAllByRole('link', { name: 'Contrat Alpha' }).length).toBeGreaterThanOrEqual(1);
    const cardList = document.querySelector('ul[role="list"]');
    expect(cardList?.textContent).not.toContain('uuid-1');
  });
});

describe('DataTable forceTableOnMobile', () => {
  it('n’affiche pas la liste cartes', () => {
    const { container } = render(
      <DataTable
        columns={buildColumns()}
        data={baseRows}
        getRowId={(row) => row.id}
        forceTableOnMobile
      />,
    );

    expect(container.querySelector('ul[role="list"]')).toBeNull();
    expect(container.querySelector('ul.md\\:hidden')).toBeNull();
    expect(container.querySelector('table')).toBeTruthy();
  });
});

describe('DataTable desktop non-régression', () => {
  it('conserve la table dans un wrapper hidden md:block', () => {
    const { container } = render(
      <DataTable
        columns={buildColumns()}
        data={baseRows}
        getRowId={(row) => row.id}
      />,
    );

    const wrapper = container.querySelector('.hidden.md\\:block');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.querySelector('table')).toBeTruthy();
  });
});

describe('DataTable états partagés', () => {
  it('empty — un seul EmptyState', () => {
    render(
      <DataTable
        columns={buildColumns()}
        data={[]}
        getRowId={(row) => row.id}
        emptyTitle="Aucun élément"
      />,
    );

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('Aucun élément')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(document.querySelector('table')).toBeNull();
  });

  it('loading — LoadingState sans double rendu', () => {
    render(
      <DataTable
        columns={buildColumns()}
        data={baseRows}
        isLoading
        getRowId={(row) => row.id}
      />,
    );

    expect(screen.getByTestId('loading-state')).toBeTruthy();
    expect(document.querySelector('table')).toBeNull();
    expect(document.querySelector('ul[role="list"]')).toBeNull();
  });
});
