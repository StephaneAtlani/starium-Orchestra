'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StrategicVisionAlertsResponseDto } from '../types/strategic-vision.types';
import { getAlertSeverityLabel, getAlertTypeLabel } from '../lib/strategic-vision-labels';

const severityClassName: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-800',
  MEDIUM: 'bg-amber-100 text-amber-900',
  HIGH: 'bg-orange-100 text-orange-900',
  CRITICAL: 'bg-red-100 text-red-900',
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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Alertes de desalignement</h2>
      <div className="grid gap-3">
        {items.map((alert) => (
          <Card key={alert.id} size="sm">
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{alert.targetLabel}</CardTitle>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityClassName[alert.severity] ?? severityClassName.MEDIUM}`}
                >
                  {getAlertSeverityLabel(alert.severity)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{alert.message}</p>
              <p className="text-muted-foreground">Direction: {alert.directionName}</p>
              <p className="text-muted-foreground">
                {getAlertTypeLabel(alert.type)} - {formatAlertDate(alert.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
