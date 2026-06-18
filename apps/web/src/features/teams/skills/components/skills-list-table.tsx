'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import type { SkillListItem } from '../types/skill.types';
import { SkillReferenceLevelBadge } from './skill-reference-level-badge';
import { SkillStatusBadge } from './skill-status-badge';

type SkillsListTableProps = {
  items: SkillListItem[];
  canUpdate: boolean;
  onEdit: (skill: SkillListItem) => void;
  onArchive: (skill: SkillListItem) => void;
  onRestore: (skill: SkillListItem) => void;
  onOpenCollaborators: (skill: SkillListItem) => void;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function SkillsListTable({
  items,
  canUpdate,
  onEdit,
  onArchive,
  onRestore,
  onOpenCollaborators,
}: SkillsListTableProps) {
  const columns = useMemo<DataTableColumn<SkillListItem>[]>(
    () => [
      {
        key: 'name',
        header: 'Compétence',
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
        key: 'category',
        header: 'Catégorie',
        mobilePriority: 'secondary',
        cell: (row) => row.categoryName,
      },
      {
        key: 'level',
        header: 'Niveau attendu',
        mobilePriority: 'secondary',
        cell: (row) => <SkillReferenceLevelBadge level={row.referenceLevel} />,
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (row) => <SkillStatusBadge status={row.status} />,
      },
      {
        key: 'updatedAt',
        header: 'Mise à jour',
        mobilePriority: 'hidden-mobile',
        cell: (row) => formatDate(row.updatedAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Voir les collaborateurs"
              onClick={() => onOpenCollaborators(row)}
            >
              <Users className="size-4" />
            </Button>
            {canUpdate ? (
              <>
                <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => onEdit(row)}>
                  Modifier
                </Button>
                {row.status !== 'ARCHIVED' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => onArchive(row)}
                  >
                    Archiver
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => onRestore(row)}
                  >
                    Restaurer
                  </Button>
                )}
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [canUpdate, onArchive, onEdit, onOpenCollaborators, onRestore],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      mobileCardsAriaLabel="Liste des compétences"
      emptyTitle="Aucune compétence"
      emptyDescription="Aucune compétence ne correspond aux filtres."
    />
  );
}
