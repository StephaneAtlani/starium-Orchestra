'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead className="hidden sm:table-cell">Ordre</TableHead>
          <TableHead className="hidden md:table-cell">Compétences</TableHead>
          <TableHead className="w-[180px] text-right">Actions</TableHead>
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
            <TableCell className="hidden sm:table-cell">{row.sortOrder}</TableCell>
            <TableCell className="hidden md:table-cell">{row.skillCount}</TableCell>
            <TableCell className="text-right space-x-1">
              {canUpdate ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row)}>
                  Modifier
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/40"
                  onClick={() => onDelete(row)}
                >
                  Supprimer
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
