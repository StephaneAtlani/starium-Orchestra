import { Card, CardContent } from '@/components/ui/card';
import type { CollaboratorListItem } from '../types/collaborator.types';
import { CollaboratorSourceBadge } from './collaborator-source-badge';
import { CollaboratorStatusBadge } from './collaborator-status-badge';
import { PlatformUserLinkBadge } from './platform-user-link-badge';

export function CollaboratorDetailHeader({ collaborator }: { collaborator: CollaboratorListItem }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold">{collaborator.displayName}</h2>
            <p className="text-sm text-muted-foreground">{collaborator.email ?? '—'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CollaboratorStatusBadge status={collaborator.status} />
            <CollaboratorSourceBadge source={collaborator.source} />
            {collaborator.source === 'DIRECTORY_SYNC' ? (
              <PlatformUserLinkBadge
                status={collaborator.platformUserLinkStatus ?? 'LINKED'}
                linkedUserEmail={collaborator.linkedUserEmail}
                linkedUserDisplayName={collaborator.linkedUserDisplayName}
              />
            ) : null}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Manager: {collaborator.managerDisplayName ?? '—'} · Fonction: {collaborator.jobTitle ?? '—'}
        </div>
      </CardContent>
    </Card>
  );
}

