'use client';

import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowRight,
  Building2,
  Handshake,
  List,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { useSuppliersDashboardQuery } from '../hooks/use-suppliers-dashboard-query';

function CatalogueRatioBar({
  listed,
  archived,
}: {
  listed: number;
  archived: number;
}) {
  const total = listed + archived;
  const pctListed = total > 0 ? Math.round((listed / total) * 100) : 0;
  const pctArchived = total > 0 ? 100 - pctListed : 0;

  return (
    <div className="space-y-2">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        {total > 0 ? (
          <>
            <div
              className="min-w-0 bg-primary transition-all"
              style={{ width: `${pctListed}%` }}
              title={`Catalogue ${pctListed}%`}
            />
            <div
              className="min-w-0 bg-muted-foreground/35 transition-all"
              style={{ width: `${pctArchived}%` }}
              title={`Archivés ${pctArchived}%`}
            />
          </>
        ) : (
          <div className="h-full w-full bg-muted-foreground/15" />
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          Catalogue ({listed})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/45" aria-hidden />
          Archivés ({archived})
        </span>
      </div>
    </div>
  );
}

export function SuppliersDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSuppliersDashboardQuery();
  const { has, isSuccess: permsOk } = usePermissions();
  const canCreate = permsOk && has('procurement.create');

  const loading = isLoading || isFetching;
  const v = (n: number | undefined) =>
    loading && !data ? '—' : String(n ?? 0);

  const allZero =
    data &&
    data.suppliersListed === 0 &&
    data.suppliersArchived === 0 &&
    data.purchaseOrdersCount === 0 &&
    data.invoicesCount === 0 &&
    data.contactsActiveCount === 0;

  return (
    <PageContainer>
      <PageHeader
        title="Fournisseurs — Dashboard"
        description="Indicateurs clés du module achats pour le client actif (API /api/suppliers/dashboard)."
      />

      {isError ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle className="size-4" />
          <AlertTitle>Impossible de charger les KPI</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error?.message ?? 'Erreur réseau ou API.'}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Bloc KPI principal — variant default = grands chiffres (FRONTEND_UI-UX §6) */}
      <section className="space-y-3" aria-labelledby="suppliers-kpi-heading">
        <h2
          id="suppliers-kpi-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Indicateurs clés
        </h2>

        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="min-h-[140px] rounded-xl" />
            ))}
          </div>
        ) : null}

        {data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              variant="default"
              title="Fournisseurs catalogue"
              value={v(data.suppliersListed)}
              subtitle="Fiches actives (hors archivé)"
              icon={<Handshake className="size-4" aria-hidden />}
            />
            <KpiCard
              variant="default"
              title="Archivés"
              value={v(data.suppliersArchived)}
              subtitle="Retirés du catalogue"
              icon={<Archive className="size-4" aria-hidden />}
            />
            <KpiCard
              variant="default"
              title="Bons de commande"
              value={v(data.purchaseOrdersCount)}
              subtitle="BC sur ce client"
              icon={<Building2 className="size-4" aria-hidden />}
            />
            <KpiCard
              variant="default"
              title="Factures"
              value={v(data.invoicesCount)}
              subtitle="Factures fournisseurs"
              icon={<Receipt className="size-4" aria-hidden />}
            />
            <KpiCard
              variant="default"
              title="Contacts actifs"
              value={v(data.contactsActiveCount)}
              subtitle="Annuaire opérationnel"
              icon={<Users className="size-4" aria-hidden />}
            />
          </div>
        ) : null}
      </section>

      {data && data.suppliersArchived > 0 && data.suppliersListed > 0 ? (
        <Alert className="border-amber-500/35 bg-amber-500/5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400" />
          <AlertTitle className="font-semibold text-amber-950 dark:text-amber-100">
            Fournisseurs archivés
          </AlertTitle>
          <AlertDescription className="text-amber-950/90 dark:text-amber-100/90">
            {data.suppliersArchived} fiche(s) archivée(s) — hors catalogue opérationnel.
          </AlertDescription>
        </Alert>
      ) : null}

      {data && allZero ? (
        <Card size="sm" className="overflow-hidden border-dashed border-border/80 bg-muted/20">
          <CardContent className="py-10">
            <EmptyState
              title="Aucune donnée achats pour l’instant"
              description="Les compteurs ci-dessus sont à zéro. Créez un fournisseur ou rattachez des BC / factures pour ce client."
              action={
                canCreate ? (
                  <Link
                    href="/suppliers"
                    className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
                  >
                    Ouvrir le catalogue
                  </Link>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card size="sm" className="overflow-hidden border-border shadow-sm">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="text-sm font-medium">Répartition catalogue</CardTitle>
              <CardDescription className="text-xs">
                Actifs vs archivés (nombre de fiches).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <CatalogueRatioBar
                listed={data.suppliersListed}
                archived={data.suppliersArchived}
              />
            </CardContent>
          </Card>

          <Card size="sm" className="overflow-hidden border-border shadow-sm">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Raccourcis
              </CardTitle>
              <CardDescription className="text-xs">Navigation rapide.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4 sm:grid-cols-2">
              <Link
                href="/suppliers"
                className="group flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <List className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Catalogue fournisseurs</p>
                  <p className="text-xs text-muted-foreground">
                    Liste, catégories, logos, archivage
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
              <Link
                href="/suppliers/contacts"
                className="group flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Users className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Contacts</p>
                  <p className="text-xs text-muted-foreground">Vue transverse</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageContainer>
  );
}
