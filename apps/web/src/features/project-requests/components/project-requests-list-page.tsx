'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PermissionGate } from '@/components/PermissionGate';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectRequests } from '../api/project-requests.api';
import { PROJECT_REQUEST_STATUS_LABELS } from '../constants/project-request-labels';

export function ProjectRequestsListPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-requests', clientId],
    queryFn: () => listProjectRequests(authFetch, { limit: 50 }),
    enabled: !!clientId,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Demandes projet"
          description="Soumissions et validation en amont du portefeuille."
          actions={
            <PermissionGate permission="project_requests.create">
              <Button asChild size="sm">
                <Link href="/projects/requests/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle demande
                </Link>
              </Button>
            </PermissionGate>
          }
        />
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Impossible de charger les demandes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Demandeur</TableHead>
                <TableHead>Validateur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/projects/requests/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {PROJECT_REQUEST_STATUS_LABELS[row.status] ?? row.status}
                  </TableCell>
                  <TableCell>{row.requesterSummary.displayName}</TableCell>
                  <TableCell>
                    {row.validatorSummary?.displayName ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.items?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucune demande visible.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
