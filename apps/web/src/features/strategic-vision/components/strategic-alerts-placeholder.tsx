'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function StrategicAlertsPlaceholder() {
  return (
    <Alert>
      <AlertTitle>Alertes et desalignements</AlertTitle>
      <AlertDescription>
        Cette section sera activee des que l'endpoint d'alertes strategiques sera disponible.
      </AlertDescription>
    </Alert>
  );
}
