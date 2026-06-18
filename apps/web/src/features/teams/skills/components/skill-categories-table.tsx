'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import type { SkillCategoryListItem } from '../types/skill.types';

type SkillCategoriesTableProps = {
  items: SkillCategoryListItem[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (cat: SkillCategoryListItem) => void;
  onDelete: (cat: SkillCategoryListItem) => void;
};

export function SkillCategoriesTable({
  items,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: SkillCategoriesTableProps) {
  const columns = useMemo<DataTableColumn<SkillCategoryListItem>[]>(
    () => [
      {
        key: 'name',
        header: 'Nom',
        mobilePriority: 'primary',
        cell: (row) => (
          <div>
            <div>{row.name}</div>
            {row.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'sortOrder',
        header: 'Ordre',
        mobilePriority: 'secondary',
        cell: (row) => row.sortOrder,
      },
      {
        key: 'skillCount',
        header: 'Compétences',
        mobilePriority: 'secondary',
        cell: (row) => row.skillCount,
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            {canUpdate ? (
              <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => onEdit(row)}>
                Modifier
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 text-destructive border-destructive/40"
                onClick={() => onDelete(row)}
              >
                Supprimer
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, onDelete, onEdit],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      mobileCardsAriaLabel="Liste des catégories de compétences"
      emptyTitle="Aucune catégorie"
      emptyDescription="Aucune catégorie de compétence."
    />
  );
}
