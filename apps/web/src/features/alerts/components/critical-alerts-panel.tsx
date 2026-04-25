'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useCriticalAlertsQuery,
  useDismissAlertMutation,
  useResolveAlertMutation,
} from '../hooks/use-alerts';

export function CriticalAlertsPanel() {
  const { data, isLoading, isError } = useCriticalAlertsQuery();
  const resolveAlert = useResolveAlertMutation();
  const dismissAlert = useDismissAlertMutation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes critiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : null}
        {isError ? (
          <p className="text-sm text-destructive">
            Impossible de charger les alertes.
          </p>
        ) : null}
        {!isLoading && !isError && (data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune alerte critique active.</p>
        ) : null}
        {data?.items.map((alert) => (
          <div key={alert.id} className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold">{alert.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{alert.message}</p>
            {alert.entityLabel ? (
              <p className="mt-1 text-xs font-medium">{alert.entityLabel}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void resolveAlert.mutateAsync(alert.id);
                }}
              >
                Resolve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  void dismissAlert.mutateAsync(alert.id);
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
