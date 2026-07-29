'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/feedback/empty-state';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { PortfolioProgressBar, type StatusTone } from '@/components/portfolio';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';
import {
  initials,
  objectiveProgress,
  objectiveTone,
  type StrategicTone,
} from '../lib/strategic-overview-progress';
import { paginateOverviewItems } from '../lib/strategic-overview-view';
import { ObjectiveStatusBadge } from './objective-status-badge';

export const STRATEGIC_OBJECTIVES_PAGE_SIZE = 6;

function formatDeadline(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function strategicToneToStatus(tone: StrategicTone): StatusTone {
  switch (tone) {
    case 'success':
      return 'ok';
    case 'warning':
      return 'warn';
    case 'danger':
      return 'danger';
    default:
      return 'muted';
  }
}

function ObjectiveProgressBar({ pct, tone }: { pct: number; tone: StrategicTone }) {
  return (
    <PortfolioProgressBar
      value={pct}
      tone={strategicToneToStatus(tone)}
      showPercent
      label="Avancement objectif"
    />
  );
}

export function StrategicObjectivesOverviewTable({
  objectives,
  axisNameById,
  pageSize = STRATEGIC_OBJECTIVES_PAGE_SIZE,
}: {
  objectives: StrategicObjectiveDto[];
  axisNameById: Map<string, string>;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [objectives.length]);

  const { total, totalPages, safePage, start, pageItems } = paginateOverviewItems(
    objectives,
    page,
    pageSize,
  );

  return (
    <Card size="sm" className="starium-panel overflow-hidden">
      <CardHeader className="border-b border-border/70">
        <CardTitle>Objectifs stratégiques</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {total === 0 ? (
          <div className="py-10">
            <EmptyState
              title="Aucun objectif"
              description="Aucun objectif pour ce périmètre."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="starium-overline">Objectif</TableHead>
                  <TableHead className="starium-overline">Axe</TableHead>
                  <TableHead className="starium-overline">Responsable</TableHead>
                  <TableHead className="starium-overline">Échéance</TableHead>
                  <TableHead className="starium-overline w-[18%]">Avancement</TableHead>
                  <TableHead className="starium-overline">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-live="polite" aria-relevant="additions removals">
                {pageItems.map((objective) => {
                  const owner =
                    objective.ownerLabel ??
                    objective.ownerOrgUnitSummary?.name ??
                    'Non défini';
                  const pct = objectiveProgress(objective.status);
                  const tone = objectiveTone(objective.status);
                  return (
                    <TableRow key={objective.id}>
                      <TableCell className="font-medium text-foreground">
                        {objective.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {axisNameById.get(objective.axisId) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {initials(owner)}
                          </span>
                          <span className="text-muted-foreground">{owner}</span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDeadline(objective.deadline)}
                      </TableCell>
                      <TableCell>
                        <ObjectiveProgressBar pct={pct} tone={tone} />
                      </TableCell>
                      <TableCell>
                        <ObjectiveStatusBadge status={objective.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {total > 0 ? (
        <CardFooter className="starium-table-footer flex flex-col gap-2 border-t border-border/60 bg-muted/15 py-3 sm:flex-row sm:items-center sm:justify-between">
          <PaginationSummary
            offset={start}
            limit={pageSize}
            total={total}
            className="text-xs text-muted-foreground"
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 gap-1 sm:min-h-0 sm:flex-none"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Page précédente des objectifs"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                <span className="max-sm:sr-only">Précédent</span>
              </Button>
              <span className="shrink-0 px-2 text-xs tabular-nums text-muted-foreground">
                Page {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 gap-1 sm:min-h-0 sm:flex-none"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Page suivante des objectifs"
              >
                <span className="max-sm:sr-only">Suivant</span>
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </Button>
            </div>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
