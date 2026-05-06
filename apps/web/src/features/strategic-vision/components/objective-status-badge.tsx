'use client';

import { Badge } from '@/components/ui/badge';
import type { StrategicObjectiveStatus } from '../types/strategic-vision.types';
import { getObjectiveStatusLabel } from '../lib/strategic-vision-labels';

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
  return (
    <Badge variant={statusVariant(status)} className="tracking-wide">
      {getObjectiveStatusLabel(status)}
    </Badge>
  );
}
