import { Badge } from '@/components/ui/badge';
import { collaboratorSourceLabel } from '../lib/collaborator-label-mappers';
import type { CollaboratorSource } from '../types/collaborator.types';

export function CollaboratorSourceBadge({ source }: { source: CollaboratorSource }) {
  const variant = source === 'DIRECTORY_SYNC' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{collaboratorSourceLabel(source)}</Badge>;
}

