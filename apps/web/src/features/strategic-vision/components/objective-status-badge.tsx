'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StrategicObjectiveStatus } from '../types/strategic-vision.types';
import { getObjectiveStatusLabel } from '../lib/strategic-vision-labels';

function statusVariant(
  status: StrategicObjectiveStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ON_TRACK':
      return 'outline';
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

function statusClassName(status: StrategicObjectiveStatus): string | undefined {
  if (status === 'ON_TRACK') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  return undefined;
}

export function ObjectiveStatusBadge({ status }: { status: StrategicObjectiveStatus }) {
  return (
    <Badge
      variant={statusVariant(status)}
      className={cn('tracking-wide', statusClassName(status))}
    >
      {getObjectiveStatusLabel(status)}
    </Badge>
  );
}
