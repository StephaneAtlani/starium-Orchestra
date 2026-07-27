'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { listWorkTeamSummaries } from '@/features/teams/work-teams/api/work-teams.api';
import { workTeamQueryKeys } from '@/features/teams/work-teams/lib/work-team-query-keys';
import { WorkTeamCards } from '@/features/teams/work-teams/components/work-team-cards';
import { getDashboardWorkTeamLoad } from '@/features/capacity/api/capacity.api';
import { capacityQueryKeys } from '@/features/capacity/lib/capacity-query-keys';

/** Fenêtre des statistiques de charge : mois courant. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return { from: yearMonth, to: yearMonth };
}

export default function TeamsIndexPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canReadTeams = has('teams.read');
  const canReadCapacity = permsSuccess && has('capacity.read');

  const range = useMemo(currentMonthRange, []);
  const enabled = Boolean(clientId) && permsSuccess && canReadTeams;

  const teamsQ = useQuery({
    queryKey: workTeamQueryKeys.summary(clientId, false),
    queryFn: () => listWorkTeamSummaries(authFetch),
    enabled,
    staleTime: 30_000,
  });

  const loadQ = useQuery({
    queryKey: capacityQueryKeys.dashboardWorkTeamLoad(clientId, range),
    queryFn: () => getDashboardWorkTeamLoad(authFetch, range),
    enabled: Boolean(clientId) && canReadCapacity,
    staleTime: 30_000,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Organisation › Équipes"
          title="Équipes"
          description="Organisation des équipes et répartition des responsabilités."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/teams/structure/teams"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Structure
              </Link>
              <Link
                href="/teams/collaborators"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Collaborateurs
              </Link>
              <Link
                href="/teams/capacity"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
              >
                Plan de charge
              </Link>
            </div>
          }
        />

        {clientId && permsLoading && <LoadingState rows={3} />}

        {clientId && permsSuccess && !canReadTeams && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-950 dark:text-amber-100">
              Accès aux équipes
            </AlertTitle>
            <AlertDescription className="text-amber-950/90 dark:text-amber-100/90">
              Votre rôle n&apos;inclut pas la permission{' '}
              <code className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-xs">
                teams.read
              </code>{' '}
              pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {enabled && teamsQ.isError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Impossible de charger les équipes</AlertTitle>
            <AlertDescription>
              {teamsQ.error instanceof Error
                ? teamsQ.error.message
                : 'Une erreur est survenue. Réessayez dans un instant.'}
            </AlertDescription>
          </Alert>
        )}

        {enabled && !teamsQ.isError && (
          <section className="space-y-2" aria-labelledby="teams-cards-heading">
            <div>
              <h2 id="teams-cards-heading" className="text-sm font-semibold text-foreground">
                Équipes actives
              </h2>
              <p className="text-xs text-muted-foreground">
                {canReadCapacity
                  ? 'Effectifs, responsables et charge du mois en cours.'
                  : 'Effectifs et responsables.'}
              </p>
            </div>
            <WorkTeamCards
              teams={teamsQ.data}
              loads={loadQ.data?.items}
              isLoading={teamsQ.isLoading || (canReadCapacity && loadQ.isLoading)}
              canReadCapacity={canReadCapacity && !loadQ.isError}
            />
          </section>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
