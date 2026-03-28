'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { projectDetail, projectRisks } from '../../constants/project-routes';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import { RiskLevelBadge } from './risk-level-badge';
import { RiskStatusBadge } from './risk-status-badge';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

const PAGE_SIZE = 25;

type Props = {
  rows: ProjectRiskRegistryRow[];
  page: number;
  onPageChange: (page: number) => void;
};

export function risksRegistryPageSize(): number {
  return PAGE_SIZE;
}

export function RisksList({ rows, page, onPageChange }: Props) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Projet</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Criticité</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>Revue</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => (
              <TableRow key={`${r.projectId}-${r.id}`}>
                <TableCell className="max-w-[min(100%,280px)] font-medium">
                  <span className="line-clamp-2" title={r.title}>
                    {r.title}
                  </span>
                  <div className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">{r.code}</div>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="line-clamp-2" title={r.projectName}>
                    {r.projectName}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.category?.trim() ? r.category : '—'}
                </TableCell>
                <TableCell>
                  <RiskStatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  <RiskLevelBadge level={r.criticalityLevel} />
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <span className="line-clamp-2" title={r.ownerDisplayLabel}>
                    {r.ownerDisplayLabel}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {formatDate(r.reviewDate)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {formatDate(r.dueDate)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={projectRisks(r.projectId)}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Registre risques
                    </Link>
                    <Link
                      href={projectDetail(r.projectId)}
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Projet
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {total === 0 ? '0' : start + 1}–{Math.min(start + PAGE_SIZE, total)} sur {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              Page {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
