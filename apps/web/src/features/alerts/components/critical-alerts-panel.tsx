'use client';

import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useCriticalAlertsQuery,
  useDismissAlertMutation,
  useResolveAlertMutation,
} from '../hooks/use-alerts';

export function CriticalAlertsPanel() {
  const { data, isLoading, isError, refetch } = useCriticalAlertsQuery();
  const resolveAlert = useResolveAlertMutation();
  const dismissAlert = useDismissAlertMutation();

  return (
    <section className="starium-module space-y-4" aria-labelledby="dashboard-alerts-heading">
      <h2 id="dashboard-alerts-heading" className="starium-section-title">
        Alertes critiques
      </h2>

      <Card size="sm" className="starium-panel max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <CardHeader className="sr-only">
          <CardTitle>Liste des alertes critiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <LoadingState rows={3} /> : null}

          {isError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Impossible de charger les alertes.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                  onClick={() => void refetch()}
                >
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {!isLoading && !isError && (data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="Aucune alerte critique"
              description="Aucune alerte critique active pour ce client."
              className="py-8"
            />
          ) : null}

          <ul className="space-y-3" aria-live="polite">
            {data?.items.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                {alert.entityLabel ? (
                  <p className="mt-1 text-xs font-medium text-foreground">
                    {alert.entityLabel}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                    onClick={() => {
                      void resolveAlert.mutateAsync(alert.id);
                    }}
                  >
                    Résoudre
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                    onClick={() => {
                      void dismissAlert.mutateAsync(alert.id);
                    }}
                  >
                    Ignorer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
