'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TeamAssignmentStatusBadge({
  cancelledAt,
  className,
}: {
  cancelledAt: string | null;
  className?: string;
}) {
  const cancelled = !!cancelledAt;
  return (
    <Badge
      variant={cancelled ? 'secondary' : 'default'}
      className={cn(cancelled && 'opacity-80', className)}
    >
      {cancelled ? 'Annulée' : 'Active'}
    </Badge>
  );
}
