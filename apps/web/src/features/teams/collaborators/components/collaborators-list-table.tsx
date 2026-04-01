import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CollaboratorListItem } from '../types/collaborator.types';
import { CollaboratorStatusBadge } from './collaborator-status-badge';
import { CollaboratorSourceBadge } from './collaborator-source-badge';

export function CollaboratorsListTable({ items }: { items: CollaboratorListItem[] }) {
  return (
    <Table className="min-w-[64rem]">
      <TableHeader>
        <TableRow>
          <TableHead>Collaborateur</TableHead>
          <TableHead>Fonction</TableHead>
          <TableHead>Manager</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="font-medium">{item.displayName}</div>
              <div className="text-xs text-muted-foreground">{item.email ?? '—'}</div>
            </TableCell>
            <TableCell>{item.jobTitle ?? '—'}</TableCell>
            <TableCell>{item.managerDisplayName ?? '—'}</TableCell>
            <TableCell>
              <CollaboratorStatusBadge status={item.status} />
            </TableCell>
            <TableCell>
              <CollaboratorSourceBadge source={item.source} />
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/teams/collaborators/${item.id}`}
                className="text-primary hover:underline"
              >
                Voir / Editer
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

