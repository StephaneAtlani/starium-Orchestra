'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PermissionGate } from '@/components/PermissionGate';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { listProjectRequests } from '../api/project-requests.api';
import { PROJECT_REQUEST_STATUS_LABELS } from '../constants/project-request-labels';
import { CreateProjectRequestDialog } from './create-project-request-dialog';

export function ProjectRequestsListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const {
    has,
    isModuleVisible,
    isLoading: permsLoading,
    isSuccess: permsSuccess,
  } = usePermissions();
  const canReadProjectRequests =
    permsSuccess &&
    has('project_requests.read') &&
    isModuleVisible('project_requests');
  const listEnabled = !!clientId && canReadProjectRequests;

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-requests', clientId],
    queryFn: () => listProjectRequests(authFetch, { limit: 50 }),
    enabled: listEnabled,
  });

  const apiErr = error ? (error as unknown as ApiFormError) : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Demandes projet"
          description="Soumissions et validation en amont du portefeuille."
          actions={
            <PermissionGate permission="project_requests.create">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle demande
              </Button>
            </PermissionGate>
          }
        />
        <CreateProjectRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
        {permsLoading || (!clientId && !permsSuccess) ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : permsSuccess && !canReadProjectRequests ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Accès refusé</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Le module <strong>Demandes projet</strong> n&apos;est pas accessible avec votre
                profil pour ce client.
              </p>
              <p>
                Vérifiez en administration que le module{' '}
                <code className="rounded bg-background/50 px-1 font-mono text-xs">
                  project_requests
                </code>{' '}
                est <strong>activé</strong> et que votre rôle inclut{' '}
                <code className="rounded bg-background/50 px-1 font-mono text-xs">
                  project_requests.read
                </code>{' '}
                (ex. profils Directeur ou Chef de projet).
              </p>
              <Link
                href="/client/help/access-model"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Modèle d&apos;accès actuel (aide)
              </Link>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>
              {apiErr?.message ?? 'Impossible de charger les demandes.'}
            </AlertTitle>
            {apiErr?.status === 403 && (
              <AlertDescription className="space-y-2">
                <p>
                  Module désactivé pour ce client, ou permission{' '}
                  <code className="rounded bg-background/50 px-1 font-mono text-xs">
                    project_requests.read
                  </code>{' '}
                  absente de votre rôle.
                </p>
                <Link
                  href="/client/help/access-model"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Modèle d&apos;accès actuel (aide)
                </Link>
              </AlertDescription>
            )}
          </Alert>
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
