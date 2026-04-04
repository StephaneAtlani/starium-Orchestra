'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { useResourceTimeEntriesList } from '@/features/teams/resource-time-entries/hooks/use-resource-time-entries-list';

export default function ResourceTimeEntriesPage() {
  const { has, isLoading: permsLoading, isSuccess: permsOk } = usePermissions();
  const canRead = has('resources.read');

  const today = new Date();
  const fromDefault = new Date(today);
  fromDefault.setDate(fromDefault.getDate() - 30);
  const [from] = useState(fromDefault.toISOString().slice(0, 10));
  const [to] = useState(today.toISOString().slice(0, 10));

  const params = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      from,
      to,
    }),
    [from, to],
  );

  const listQuery = useResourceTimeEntriesList(params, permsOk && canRead);

  return (
    <>
      <PageHeader
        title="Temps réalisé"
        description="Saisies de temps par ressource Humaine (distinct des affectations planifiées)."
      />

      {permsLoading && <LoadingState rows={2} />}
      {permsOk && !canRead && (
        <Alert className="border-amber-500/35">
          <AlertTriangle className="size-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Permission requise : <code>resources.read</code>.
          </AlertDescription>
        </Alert>
      )}

      {permsOk && canRead && (
        <div className="space-y-4">
          {listQuery.isLoading && <LoadingState rows={4} />}
          {listQuery.error && (
            <Alert variant="destructive">
              <AlertTitle>{(listQuery.error as Error).message}</AlertTitle>
            </Alert>
          )}
          {listQuery.data && (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ressource</TableHead>
                    <TableHead className="text-right">Heures</TableHead>
                    <TableHead>Projet</TableHead>
                    <TableHead>Activité</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listQuery.data.items ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(row.workDate).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-medium">{row.resourceDisplayName}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.durationHours}</TableCell>
                      <TableCell>{row.projectName ?? '—'}</TableCell>
                      <TableCell>{row.activityTypeName ?? '—'}</TableCell>
                      <TableCell>{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {listQuery.data && listQuery.data.items.length === 0 && !listQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Aucune saisie sur la période.</p>
          )}
        </div>
      )}
    </>
  );
}
