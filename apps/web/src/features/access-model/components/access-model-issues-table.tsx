'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AccessModelIssue } from '../api/access-model.api';
import { moduleLabel } from '../lib/labels';

export function AccessModelIssuesTable({
  items,
  truncated,
  isLoading,
}: {
  items: AccessModelIssue[];
  truncated: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Chargement des alertes…</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune alerte pour cette catégorie avec les filtres actuels.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {truncated && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Liste tronquée — affinez les filtres ou traitez les écarts par priorité.
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Sévérité</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead className="w-[140px]">Module</TableHead>
            <TableHead className="w-[160px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge
                  variant={row.severity === 'warning' ? 'destructive' : 'secondary'}
                >
                  {row.severity === 'warning' ? 'Attention' : 'Info'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="font-medium">{row.label}</div>
                {row.subtitle && (
                  <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                )}
              </TableCell>
              <TableCell className="text-sm">{moduleLabel(row.module)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={row.correctiveAction.href}>
                    {row.correctiveAction.label}
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
