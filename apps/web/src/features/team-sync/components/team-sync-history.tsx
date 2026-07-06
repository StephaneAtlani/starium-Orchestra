'use client';

import type { DirectorySyncJob } from '../types/team-sync.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = {
  jobs: DirectorySyncJob[] | undefined;
};

export function TeamSyncHistory({ jobs }: Props) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        Aucun job de synchronisation pour le moment.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table className="text-sm">
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Trouvés</TableHead>
            <TableHead>Créés</TableHead>
            <TableHead>MAJ</TableHead>
            <TableHead>Désactivés</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell>{new Date(job.startedAt).toLocaleString('fr-FR')}</TableCell>
              <TableCell>{job.status}</TableCell>
              <TableCell>{job.totalFound}</TableCell>
              <TableCell>{job.createdCount}</TableCell>
              <TableCell>{job.updatedCount}</TableCell>
              <TableCell>{job.deactivatedCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
