'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { usePlatformUsageOverviewQuery } from '@/features/admin-studio/hooks/use-platform-usage-overview-query';
import { PlatformUsageCharts } from '@/features/admin-studio/components/platform-usage-charts';
import { cn } from '@/lib/utils';
import {
  Activity,
  Building2,
  ClipboardList,
  FileStack,
  FolderKanban,
  KeyRound,
  Link2,
  Shield,
  ShoppingCart,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';

function fmtInt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export default function AdminPlatformDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError, error, refetch } = usePlatformUsageOverviewQuery();

  useEffect(() => {
    if (authLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  const t = data?.totals;
  const act = data?.activity;
  const integ = data?.integrations;
  const sess = data?.sessions;

  return (
    <PageContainer>
      <PageHeader
        title="Plateforme — utilisation"
        description="Sessions, courbes d’usage (audit, auth) et stocks métier — agrégation base, instantané au chargement."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/clients"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Clients
            </Link>
            <Link
              href="/admin/users"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Utilisateurs
            </Link>
            <Link
              href="/admin/snapshot-occasion-types"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Types versions figées
            </Link>
            <Link
              href="/admin/audit"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Journaux d’audit
            </Link>
          </div>
        }
      />

      {isLoading && <LoadingState rows={6} />}
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {error instanceof Error ? error.message : 'Chargement impossible.'}
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {data && t && act && integ && sess && (
        <>
          <p className="text-muted-foreground text-xs">
            Données au{' '}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleString('fr-FR')}
            </time>
            . Graphiques mis à jour avec ces données. Recharger la page pour actualiser.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs « connectés »</CardTitle>
                <UserCheck className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {fmtInt(sess.distinctUsersWithActiveRefresh)}
                </div>
                <CardDescription>
                  Comptes distincts avec au moins un jeton refresh valide (session ouverte possible,
                  non expiré, non révoqué).
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions refresh actives</CardTitle>
                <KeyRound className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {fmtInt(sess.activeRefreshTokens)}
                </div>
                <CardDescription>
                  Total de jetons refresh valides (plusieurs navigateurs ou appareils par utilisateur
                  possible).
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {data.series.daily.length > 0 && (
            <PlatformUsageCharts daily={data.series.daily} />
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organisations</CardTitle>
                <Building2 className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{fmtInt(t.clients)}</div>
                <CardDescription>Clients actifs dans la base</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                <Users className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{fmtInt(t.users)}</div>
                <CardDescription>
                  Admins plateforme :{' '}
                  <span className="text-foreground font-medium">{fmtInt(t.platformAdmins)}</span>
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rattachements</CardTitle>
                <Shield className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {fmtInt(t.clientMembershipsActive)}
                </div>
                <CardDescription>ClientUser actifs (membres d’organisations)</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projets</CardTitle>
                <FolderKanban className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{fmtInt(t.projects)}</div>
                <CardDescription>Plans d’action : {fmtInt(t.actionPlans)}</CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budgets</CardTitle>
                <Wallet className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{fmtInt(t.budgets)}</div>
                <CardDescription>Lignes budgétaires : {fmtInt(t.budgetLines)}</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Achats</CardTitle>
                <ShoppingCart className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{fmtInt(t.suppliers)}</div>
                <CardDescription>Bons de commande : {fmtInt(t.purchaseOrders)}</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conformité</CardTitle>
                <ClipboardList className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {fmtInt(t.complianceFrameworks)}
                </div>
                <CardDescription>Cadres enregistrés</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ressources</CardTitle>
                <FileStack className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{fmtInt(t.resources)}</div>
                <CardDescription>Collaborateurs : {fmtInt(t.collaborators)}</CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activité (7 jours)</CardTitle>
                <CardDescription>Événements enregistrés en base</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Activity className="size-4" />
                    Journaux d’audit
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtInt(act.auditLogsLast7Days)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Shield className="size-4" />
                    Journaux de sécurité
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtInt(act.securityLogsLast7Days)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Intégrations</CardTitle>
                <CardDescription>Connexions techniques déclarées</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Link2 className="size-4" />
                    Microsoft 365 / Graph
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtInt(integ.microsoftConnections)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Users className="size-4" />
                    Annuaire (AD / synchro)
                  </span>
                  <span className="font-semibold tabular-nums">
                    {fmtInt(integ.directoryConnections)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
