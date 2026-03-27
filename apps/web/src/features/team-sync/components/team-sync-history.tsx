'use client';

import type { DirectorySyncJob } from '../types/team-sync.types';

type Props = {
  jobs: DirectorySyncJob[] | undefined;
};

export function TeamSyncHistory({ jobs }: Props) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Aucun job de synchronisation pour le moment.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="p-2">Date</th>
            <th className="p-2">Statut</th>
            <th className="p-2">Trouvés</th>
            <th className="p-2">Créés</th>
            <th className="p-2">MAJ</th>
            <th className="p-2">Désactivés</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-t">
              <td className="p-2">{new Date(job.startedAt).toLocaleString('fr-FR')}</td>
              <td className="p-2">{job.status}</td>
              <td className="p-2">{job.totalFound}</td>
              <td className="p-2">{job.createdCount}</td>
              <td className="p-2">{job.updatedCount}</td>
              <td className="p-2">{job.deactivatedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
