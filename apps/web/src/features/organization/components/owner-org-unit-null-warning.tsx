'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const ADVISORY_MESSAGE =
  "Aucune Direction propriétaire — cette ressource pourra être invisible aux profils scopés lorsque le moteur d'accès V2 sera activé.";

const BLOCKING_MESSAGE =
  'Direction propriétaire obligatoire pour ce client : renseignez une unité organisationnelle active avant de continuer.';

export function OwnerOrgUnitNullWarning({
  className,
  variant = 'advisory',
}: {
  className?: string;
  variant?: 'advisory' | 'blocking';
}) {
  const blocking = variant === 'blocking';
  return (
    <Alert
      variant={blocking ? 'destructive' : 'default'}
      className={cn(className)}
    >
      <AlertTriangle
        className={cn('size-4', blocking ? '' : 'text-amber-600')}
        aria-hidden
      />
      <AlertDescription className="text-sm">
        {blocking ? BLOCKING_MESSAGE : ADVISORY_MESSAGE}
      </AlertDescription>
    </Alert>
  );
}
