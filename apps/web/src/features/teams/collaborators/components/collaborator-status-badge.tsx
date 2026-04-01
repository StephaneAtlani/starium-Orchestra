import { Badge } from '@/components/ui/badge';
import { collaboratorStatusLabel } from '../lib/collaborator-label-mappers';
import type { CollaboratorStatus } from '../types/collaborator.types';

export function CollaboratorStatusBadge({ status }: { status: CollaboratorStatus }) {
  const variant =
    status === 'ACTIVE'
      ? 'default'
      : status === 'INACTIVE'
        ? 'secondary'
        : 'destructive';
  return <Badge variant={variant}>{collaboratorStatusLabel(status)}</Badge>;
}

