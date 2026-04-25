'use client';

import { Badge } from '@/components/ui/badge';
import type { StrategicObjectiveStatus } from '../types/strategic-vision.types';

function statusLabel(status: StrategicObjectiveStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'Dans la trajectoire';
    case 'AT_RISK':
      return 'A risque';
    case 'OFF_TRACK':
      return 'Hors trajectoire';
    case 'COMPLETED':
      return 'Termine';
    case 'ARCHIVED':
      return 'Archive';
    default:
      return status;
  }
}

function statusVariant(
  status: StrategicObjectiveStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ON_TRACK':
      return 'default';
    case 'AT_RISK':
      return 'secondary';
    case 'OFF_TRACK':
      return 'destructive';
    case 'COMPLETED':
      return 'secondary';
    case 'ARCHIVED':
      return 'outline';
    default:
      return 'outline';
  }
}

export function ObjectiveStatusBadge({ status }: { status: StrategicObjectiveStatus }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
