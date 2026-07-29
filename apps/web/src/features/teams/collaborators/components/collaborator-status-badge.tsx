import { TableToneBadge, type StatusTone } from '@/components/portfolio';
import { collaboratorStatusLabel } from '../lib/collaborator-label-mappers';
import type { CollaboratorStatus } from '../types/collaborator.types';

function collaboratorTone(status: CollaboratorStatus): StatusTone {
  switch (status) {
    case 'ACTIVE':
      return 'ok';
    case 'INACTIVE':
      return 'muted';
    default:
      return 'danger';
  }
}

export function CollaboratorStatusBadge({ status }: { status: CollaboratorStatus }) {
  return (
    <TableToneBadge tone={collaboratorTone(status)}>
      {collaboratorStatusLabel(status)}
    </TableToneBadge>
  );
}
