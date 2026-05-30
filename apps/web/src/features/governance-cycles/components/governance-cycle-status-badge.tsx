import { cn } from '@/lib/utils';
import type { GovernanceCycleStatus } from '../types/governance-cycle.types';
import { getGovernanceCycleStatusLabel } from '../lib/governance-cycle-labels';

const STATUS_CLASS: Record<GovernanceCycleStatus, string> = {
  DRAFT: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  PREPARING: 'border-blue-500/30 bg-blue-500/10 text-blue-900',
  TO_ARBITRATE: 'border-amber-500/40 bg-amber-500/10 text-amber-950',
  ARBITRATED: 'border-violet-500/30 bg-violet-500/10 text-violet-950',
  IN_EXECUTION: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950',
  CLOSED: 'border-slate-500/30 bg-slate-500/10 text-slate-800',
  ARCHIVED: 'border-muted-foreground/20 bg-muted/60 text-muted-foreground',
};

export function GovernanceCycleStatusBadge({
  status,
  className,
}: {
  status: GovernanceCycleStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASS[status],
        className,
      )}
    >
      {getGovernanceCycleStatusLabel(status)}
    </span>
  );
}
