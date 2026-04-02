'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkTeamStatusBadge } from './work-team-status-badge';
import type { WorkTeamDto } from '../types/work-team.types';

export function WorkTeamsTable({ items }: { items: WorkTeamDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Chemin</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <Link
                href={`/teams/structure/teams/${t.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{t.code ?? '—'}</TableCell>
            <TableCell className="max-w-[240px] truncate text-muted-foreground" title={t.pathLabel}>
              {t.pathLabel}
            </TableCell>
            <TableCell>{t.leadDisplayName ?? '—'}</TableCell>
            <TableCell>
              <WorkTeamStatusBadge status={t.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
