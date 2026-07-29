import { TableToneBadge, type StatusTone } from '@/components/portfolio';
import type { GovernanceCycleStatus } from '../types/governance-cycle.types';
import { getGovernanceCycleStatusLabel } from '../lib/governance-cycle-labels';

function cycleStatusTone(status: GovernanceCycleStatus): StatusTone {
  switch (status) {
    case 'IN_EXECUTION':
    case 'ARBITRATED':
      return 'ok';
    case 'PREPARING':
      return 'info';
    case 'TO_ARBITRATE':
      return 'warn';
    case 'DRAFT':
      return 'muted';
    case 'CLOSED':
    case 'ARCHIVED':
      return 'muted';
    default:
      return 'muted';
  }
}

export function GovernanceCycleStatusBadge({
  status,
  className,
}: {
  status: GovernanceCycleStatus;
  className?: string;
}) {
  return (
    <TableToneBadge tone={cycleStatusTone(status)} className={className}>
      {getGovernanceCycleStatusLabel(status)}
    </TableToneBadge>
  );
}
