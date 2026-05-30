import { cn } from '@/lib/utils';
import type { GovernanceCycleItemDecisionStatus } from '../types/governance-cycle.types';
import { getGovernanceCycleItemDecisionLabel } from '../lib/governance-cycle-labels';

const DECISION_CLASS: Record<GovernanceCycleItemDecisionStatus, string> = {
  CANDIDATE: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  TO_ARBITRATE: 'border-amber-500/40 bg-amber-500/10 text-amber-950',
  ACCEPTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950',
  DEFERRED: 'border-orange-500/30 bg-orange-500/10 text-orange-950',
  REJECTED: 'border-red-500/30 bg-red-500/10 text-red-950',
  NEEDS_INFORMATION: 'border-blue-500/30 bg-blue-500/10 text-blue-950',
  ACCEPTED_WITH_RESERVE: 'border-violet-500/30 bg-violet-500/10 text-violet-950',
};

export function GovernanceCycleDecisionBadge({
  status,
  className,
}: {
  status: GovernanceCycleItemDecisionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        DECISION_CLASS[status],
        className,
      )}
    >
      {getGovernanceCycleItemDecisionLabel(status)}
    </span>
  );
}
