'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import {
  budgetDetail,
  budgetImportsTab,
} from '@/features/budgets/constants/budget-routes';
import { getBudgetImportJob } from '@/features/budgets/api/budget-imports.api';
import { displayLabel } from '@/lib/display-label';
import { ImportJobStatusBadge } from '@/features/budgets/import-hub/import-job-status-badge';

export default function BudgetImportJobDetailPage() {
  const p = useParams();
  const jobId = typeof p.jobId === 'string' ? p.jobId : null;
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: budgetQueryKeys.budgetImportJobDetail(clientId, jobId ?? ''),
    queryFn: () => getBudgetImportJob(authFetch, jobId!),
    enabled: !!clientId && !!jobId,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Détail de l’import"
          description="Résultat d’une exécution — le fichier source n’est pas conservé après import."
        />
        <div className="mb-6">
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href={budgetImportsTab('history')} className="gap-2">
              <ArrowLeft className="size-4" aria-hidden />
              Retour à l’historique
            </Link>
          </Button>
        </div>

        {!jobId ? (
          <ErrorState message="Import introuvable — identifiant manquant." />
        ) : null}
        {jobId && isLoading ? <LoadingState rows={4} /> : null}
        {jobId && error ? (
          <ErrorState
            message="Impossible de charger l’import. Vérifiez que l’import appartient au client actif."
            onRetry={() => void refetch()}
          />
        ) : null}

        {data ? (
          <div className="space-y-6 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <ImportJobStatusBadge status={data.status} />
              <span className="text-sm text-muted-foreground tabular-nums">
                {new Date(data.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border bg-card p-4">
              <div>
                <dt className="text-xs text-muted-foreground">Budget</dt>
                <dd>
                  <Link
                    href={budgetDetail(data.budgetId)}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {displayLabel(data.budgetLabel, 'Budget')}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Exercice</dt>
                <dd>{displayLabel(data.exerciseLabel, 'Non renseigné')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Fichier</dt>
                <dd>{displayLabel(data.fileName, 'Fichier')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Profil</dt>
                <dd>{displayLabel(data.mappingName, 'Sans profil')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Auteur</dt>
                <dd>{displayLabel(data.createdByLabel, 'Utilisateur')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mode</dt>
                <dd className="tabular-nums">{data.importMode}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total', value: data.totalRows },
                { label: 'Créées', value: data.createdRows },
                { label: 'Mises à jour', value: data.updatedRows },
                { label: 'Ignorées', value: data.skippedRows },
                { label: 'Erreurs', value: data.errorRows },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-lg border border-border bg-card p-3 text-center"
                >
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{k.value}</p>
                </div>
              ))}
            </div>

            {data.summary?.errorsByType &&
            Object.keys(data.summary.errorsByType).length > 0 ? (
              <section className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h2 className="text-sm font-semibold">Erreurs par type</h2>
                <ul className="text-sm space-y-1">
                  {Object.entries(data.summary.errorsByType).map(([type, count]) => (
                    <li key={type} className="flex justify-between gap-4">
                      <span>{type}</span>
                      <span className="tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="text-sm text-muted-foreground">
              Le fichier source n’est pas conservé après exécution : un rejeu nécessite un nouvel
              upload.
            </p>
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
