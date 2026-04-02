'use client';

import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Compétence</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Niveau attendu</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="hidden md:table-cell">Mise à jour</TableHead>
          <TableHead className="w-[100px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <div>{row.name}</div>
              {row.description ? (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {row.description}
                </p>
              ) : null}
            </TableCell>
            <TableCell>{row.categoryName}</TableCell>
            <TableCell>
              <SkillReferenceLevelBadge level={row.referenceLevel} />
            </TableCell>
            <TableCell>
              <SkillStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
              {formatDate(row.updatedAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Voir les collaborateurs"
                  onClick={() => onOpenCollaborators(row)}
                >
                  <Users className="size-4" />
                </Button>
                {canUpdate ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(row)}
                    >
                      Modifier
                    </Button>
                    {row.status !== 'ARCHIVED' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(row)}
                      >
                        Archiver
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRestore(row)}
                      >
                        Restaurer
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
