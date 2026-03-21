'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectListItem } from '../types/project.types';
import { Badge } from '@/components/ui/badge';
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

export function ProjectsListTable({ items }: { items: ProjectListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Projet</TableHead>
          <TableHead className="w-[7rem]">Nature</TableHead>
          <TableHead>Santé</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Av. manuel</TableHead>
          <TableHead className="text-right">Av. dérivé</TableHead>
          <TableHead>Échéance</TableHead>
          <TableHead className="text-center">Tâches / Risques / Jalons retard</TableHead>
          <TableHead>Signaux</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <Link
                href={`/projects/${p.id}`}
                className="font-medium text-primary hover:underline"
              >
                {p.name}
              </Link>
              {p.code && (
                <div className="text-xs text-muted-foreground">{p.code}</div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {PROJECT_CRITICALITY_LABEL[p.criticality] ?? p.criticality}
                {p.ownerDisplayName ? ` · ${p.ownerDisplayName}` : ''}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal">
                {PROJECT_KIND_LABEL[p.kind] ?? p.kind}
              </Badge>
            </TableCell>
            <TableCell>
              <HealthBadge health={p.computedHealth} />
            </TableCell>
            <TableCell>{PROJECT_STATUS_LABEL[p.status] ?? p.status}</TableCell>
            <TableCell className="text-right tabular-nums">
              {p.progressPercent != null ? `${p.progressPercent} %` : '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {p.derivedProgressPercent != null ? `${p.derivedProgressPercent} %` : '—'}
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(p.targetEndDate)}</TableCell>
            <TableCell className="text-center text-xs tabular-nums">
              {p.openTasksCount} / {p.openRisksCount} / {p.delayedMilestonesCount}
            </TableCell>
            <TableCell>
              <div className="max-w-[14rem] space-y-1">
                <ProjectPortfolioBadges signals={p.signals} />
                {p.warnings.length > 0 && (
                  <div className="text-[0.65rem] leading-tight text-muted-foreground">
                    {p.warnings.map((w) => WARNING_CODE_LABEL[w] ?? w).join(' · ')}
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
