'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const OWNER_ORG_UNIT_NULL_MESSAGE =
  "Aucune Direction propriétaire — cette ressource pourra être invisible aux profils scopés lorsque le moteur d'accès V2 sera activé.";

export function OwnerOrgUnitNullWarning({ className }: { className?: string }) {
  return (
    <Alert variant="default" className={className}>
      <AlertTriangle className="size-4 text-amber-600" aria-hidden />
      <AlertDescription className="text-sm">{OWNER_ORG_UNIT_NULL_MESSAGE}</AlertDescription>
    </Alert>
  );
}
