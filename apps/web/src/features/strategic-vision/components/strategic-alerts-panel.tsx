'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StrategicVisionAlertsResponseDto } from '../types/strategic-vision.types';
import { getAlertSeverityLabel, getAlertTypeLabel } from '../lib/strategic-vision-labels';

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

export function StrategicAlertsPanel({
  alerts,
  isLoading,
  isError,
}: {
  alerts?: StrategicVisionAlertsResponseDto;
  isLoading: boolean;
  isError: boolean;
}) {
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

  const items = alerts?.items ?? [];
  if (items.length === 0) {
    return (
      <Alert>
        <AlertDescription>Alertes de desalignement: aucune alerte active pour ce client.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes de désalignement</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border">
          {items.map((alert) => (
            <li key={alert.id} className="flex items-start gap-3 py-3 first:pt-0">
              <span
                aria-hidden
                className={`mt-[7px] size-2 shrink-0 rounded-full ${severityDotClassName[alert.severity] ?? severityDotClassName.MEDIUM}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {alert.targetLabel}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getAlertSeverityLabel(alert.severity)} · {alert.directionName} ·{' '}
                  {getAlertTypeLabel(alert.type)} · {formatAlertDate(alert.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
