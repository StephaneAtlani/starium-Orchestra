'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import type { StrategicVisionAlertsResponseDto } from '../types/strategic-vision.types';
import { getAlertSeverityLabel, getAlertTypeLabel } from '../lib/strategic-vision-labels';

export const STRATEGIC_ALERTS_PAGE_SIZE = 5;

const severityDotClassName: Record<string, string> = {
  LOW: 'bg-muted-foreground/50',
  MEDIUM: 'bg-[color:var(--state-warning)]',
  HIGH: 'bg-[color:var(--state-warning)]',
  CRITICAL: 'bg-[color:var(--state-danger)]',
};

export function formatAlertDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('fr-FR');
}

export function paginateStrategicAlerts<T>(
  items: T[],
  page: number,
  pageSize = STRATEGIC_ALERTS_PAGE_SIZE,
) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    total,
    totalPages,
    safePage,
    start,
    pageItems: items.slice(start, start + pageSize),
  };
}

export function StrategicAlertsPanel({
  alerts,
  isLoading,
  isError,
  pageSize = STRATEGIC_ALERTS_PAGE_SIZE,
}: {
  alerts?: StrategicVisionAlertsResponseDto;
  isLoading: boolean;
  isError: boolean;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const items = alerts?.items ?? [];

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Alertes de desalignement</h2>
        <Skeleton className="h-20 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Impossible de charger les alertes de desalignement.</AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Alert>
        <AlertDescription>Alertes de desalignement: aucune alerte active pour ce client.</AlertDescription>
      </Alert>
    );
  }

  const { total, totalPages, safePage, start, pageItems } = paginateStrategicAlerts(
    items,
    page,
    pageSize,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes de désalignement</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border" aria-live="polite" aria-relevant="additions removals">
          {pageItems.map((alert) => (
            <li key={alert.id} className="flex items-start gap-3 py-3 first:pt-0">
              <span
                aria-hidden
                className={`mt-[7px] size-2 shrink-0 rounded-full ${severityDotClassName[alert.severity] ?? severityDotClassName.MEDIUM}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{alert.targetLabel}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getAlertSeverityLabel(alert.severity)} · {alert.directionName} ·{' '}
                  {getAlertTypeLabel(alert.type)} · {formatAlertDate(alert.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
          <PaginationSummary
            offset={start}
            limit={pageSize}
            total={total}
            className="text-xs text-muted-foreground"
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 gap-1 sm:min-h-0 sm:flex-none"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Page précédente des alertes"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                <span className="max-sm:sr-only">Précédent</span>
              </Button>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                Page {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 gap-1 sm:min-h-0 sm:flex-none"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Page suivante des alertes"
              >
                <span className="max-sm:sr-only">Suivant</span>
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
