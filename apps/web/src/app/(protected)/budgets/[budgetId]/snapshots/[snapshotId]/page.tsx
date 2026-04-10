'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Receipt } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { getBudgetSnapshotById } from '@/features/budgets/api/budget-snapshots.api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BudgetSnapshotKpiStrip } from '@/features/budgets/components/budget-snapshot-kpi-strip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);
}

function toDisplayDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

export default function BudgetSnapshotDetailPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const snapshotId = typeof params.snapshotId === 'string' ? params.snapshotId : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const snapshotQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotDetail(clientId, snapshotId),
    queryFn: () => getBudgetSnapshotById(authFetch, snapshotId),
    enabled: !!clientId && !!snapshotId,
  });

  const data = snapshotQuery.data;
  const currency = data?.budgetCurrency ?? 'EUR';

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Détail version figée"
          description="Lecture seule — état du budget à la date de capture."
          actions={
            <Link
              href={`/budgets/${budgetId}/snapshots`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Retour aux versions figées
            </Link>
          }
        />

        {snapshotQuery.isLoading ? (
          <Card size="sm" className="shadow-sm">
            <CardContent className="pt-6">
              <LoadingState rows={6} />
            </CardContent>
          </Card>
        ) : null}

        {snapshotQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription>
              {(snapshotQuery.error as Error)?.message ??
                'Erreur API lors du chargement de la version figée.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!snapshotQuery.isLoading && !snapshotQuery.isError && !data ? (
          <p className="text-sm text-muted-foreground">Version figée introuvable</p>
        ) : null}

        {data ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Totaux figés à la date de capture (écritures / affectations connues jusqu’à ce jour — pas les soldes
                courants du cockpit). Même lecture que la bande KPI du détail de ligne.
              </p>
              <BudgetSnapshotKpiStrip totals={data.totals} currency={currency} />
            </div>

            <section
              aria-labelledby="snapshot-meta-heading"
              className="rounded-lg border border-border/70 bg-muted/30 p-4"
            >
              <h2 id="snapshot-meta-heading" className="sr-only">
                Informations sur la version figée
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nom
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">{data.name}</dd>
                </div>
                {data.occasionTypeLabel ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Type de version figée
                    </dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                      {data.occasionTypeLabel}
                      {data.occasionTypeCode ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ({data.occasionTypeCode}
                          {data.occasionTypeScope === 'global' ? ' — plateforme' : ''})
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date de capture
                  </dt>
                  <dd className="mt-0.5 text-sm tabular-nums text-foreground">
                    {toDisplayDate(data.snapshotDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Créé par
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {data.createdByLabel ?? 'Utilisateur inconnu'}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="snapshot-eng-conso-heading" className="space-y-3">
              <h2 id="snapshot-eng-conso-heading" className="sr-only">
                Rappel engagé et consommé
              </h2>
              <Alert className="border-border/80 bg-muted/40">
                <Receipt className="size-4" aria-hidden />
                <AlertTitle className="text-sm">Engagé vs consommé (factures)</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Dans Orchestra, une <strong className="text-foreground">facture</strong> liée à une ligne budgétaire
                  génère un mouvement de <strong className="text-foreground">consommation</strong>, pas d’engagement :
                  le montant apparaît dans <strong className="text-foreground">Consommé</strong>, pas dans Engagé.
                  L’engagé reflète notamment les commandes (BDC) et engagements enregistrés comme tels dans le moteur
                  financier.
                </AlertDescription>
              </Alert>
            </section>

            {data.lines.length === 0 ? (
              <Card size="sm" className="shadow-sm">
                <CardContent className="py-10">
                  <EmptyState
                    title="Aucune ligne détaillée"
                    description={
                      'Aucune ligne de budget non archivée à cette date (budget vide ou toutes les lignes en statut archivé). Les totaux ci-dessus sont alors nuls.'
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <Card size="sm" className="overflow-hidden shadow-sm">
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle className="text-sm font-medium">Lignes figées</CardTitle>
                  <CardDescription className="text-xs">
                    Une ligne par poste budget non archivé — montants tels qu’au moment de la capture. Les factures
                    alimentent la colonne Consommé ; Engagé = engagements (ex. commandes), pas les factures.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[52rem]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Ligne</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-right">Engagé</TableHead>
                          <TableHead className="text-right">Consommé</TableHead>
                          <TableHead className="text-right">Forecast</TableHead>
                          <TableHead className="text-right">Restant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>{line.lineCode}</TableCell>
                            <TableCell>{line.lineName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(line.budgetAmount, line.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(line.committedAmount, line.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(line.consumedAmount, line.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(line.forecastAmount, line.currency)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(line.remainingAmount, line.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
