'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CollaboratorListItem } from '../types/collaborator.types';
import { CollaboratorStatusBadge } from './collaborator-status-badge';
import { CollaboratorSourceBadge } from './collaborator-source-badge';
import { PlatformUserLinkBadge } from './platform-user-link-badge';

export function CollaboratorsListTable({
  items,
  canLinkPlatformUser = false,
}: {
  items: CollaboratorListItem[];
  canLinkPlatformUser?: boolean;
}) {
  const columns = useMemo<DataTableColumn<CollaboratorListItem>[]>(
    () => [
      {
        key: 'displayName',
        header: 'Collaborateur',
        mobilePriority: 'primary',
        cell: (item) => (
          <div className="space-y-1">
            <div className="font-medium">{item.displayName}</div>
            <div className="text-xs text-muted-foreground">{item.email ?? '—'}</div>
            {item.platformUserLinkStatus === 'LINK_REQUIRED' ? (
              <div className="sm:hidden">
                <PlatformUserLinkBadge status={item.platformUserLinkStatus} />
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'jobTitle',
        header: 'Fonction',
        mobilePriority: 'secondary',
        cell: (item) => item.jobTitle ?? '—',
      },
      {
        key: 'manager',
        header: 'Manager',
        mobilePriority: 'secondary',
        cell: (item) => item.managerDisplayName ?? '—',
      },
      {
        key: 'link',
        header: 'Compte',
        mobilePriority: 'secondary',
        cell: (item) =>
          item.source === 'DIRECTORY_SYNC' ? (
            <PlatformUserLinkBadge status={item.platformUserLinkStatus ?? 'LINKED'} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (item) => <CollaboratorStatusBadge status={item.status} />,
      },
      {
        key: 'source',
        header: 'Source',
        mobilePriority: 'secondary',
        cell: (item) => <CollaboratorSourceBadge source={item.source} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        mobilePriority: 'actions',
        cell: (item) => {
          const needsLink = item.platformUserLinkStatus === 'LINK_REQUIRED';
          const href = `/teams/collaborators/${item.id}`;
          if (needsLink && canLinkPlatformUser) {
            return (
              <Link
                href={href}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'min-h-11',
                )}
              >
                Rattacher
              </Link>
            );
          }
          return (
            <Link
              href={href}
              className="inline-flex min-h-11 items-center text-primary hover:underline"
            >
              Voir / Éditer
            </Link>
          );
        },
      },
    ],
    [canLinkPlatformUser],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      getRowId={(item) => item.id}
      mobileCardsAriaLabel="Liste des collaborateurs"
      emptyTitle="Aucun collaborateur"
      emptyDescription="Aucun collaborateur ne correspond aux filtres."
    />
  );
}
