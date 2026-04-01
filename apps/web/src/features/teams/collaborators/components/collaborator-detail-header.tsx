import { Card, CardContent } from '@/components/ui/card';
import type { CollaboratorListItem } from '../types/collaborator.types';
import { CollaboratorSourceBadge } from './collaborator-source-badge';
import { CollaboratorStatusBadge } from './collaborator-status-badge';

export function CollaboratorDetailHeader({ collaborator }: { collaborator: CollaboratorListItem }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{collaborator.displayName}</h2>
            <p className="text-sm text-muted-foreground">{collaborator.email ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <CollaboratorStatusBadge status={collaborator.status} />
            <CollaboratorSourceBadge source={collaborator.source} />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Manager: {collaborator.managerDisplayName ?? '—'} · Fonction: {collaborator.jobTitle ?? '—'}
        </div>
      </CardContent>
    </Card>
  );
}

