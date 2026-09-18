'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { displayLabel } from '@/lib/display-label';
import { getProcedure } from '@/features/procedures/api/procedures.api';
import { procedureQueryKeys } from '@/features/procedures/lib/procedure-query-keys';
import {
  procedureCategoryLabel,
  procedureStatusLabel,
} from '@/features/procedures/lib/procedure-labels';

export default function ProcedureEditPage() {
  const params = useParams();
  const procedureId = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const q = useQuery({
    queryKey: procedureQueryKeys.detail(clientId, procedureId),
    queryFn: () => getProcedure(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          backHref="/procedures"
          eyebrow="Gouvernance › Procédures"
          title={
            q.data
              ? displayLabel(q.data.title, 'Procédure')
              : 'Procédure'
          }
          description={
            q.data
              ? `${displayLabel(q.data.code, 'Sans code')} · ${procedureStatusLabel(q.data.status)} · ${procedureCategoryLabel(q.data.category)}`
              : 'Chargement…'
          }
          actions={
            <Link
              href="/procedures"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 sm:min-h-9')}
            >
              Catalogue
            </Link>
          }
        />

        {q.isLoading ? <LoadingState rows={3} /> : null}
        {q.isError ? (
          <ErrorState
            message="Impossible de charger la procédure."
            onRetry={() => void q.refetch()}
          />
        ) : null}

        {q.isSuccess ? (
          <div className="flex flex-col gap-4">
            <section className="starium-section space-y-2 p-4 sm:p-5" aria-labelledby="procedure-meta">
              <h2 id="procedure-meta" className="text-base font-semibold">
                Métadonnées
              </h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Code</dt>
                  <dd>{displayLabel(q.data.code, 'Sans code')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Statut</dt>
                  <dd>{procedureStatusLabel(q.data.status)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Catégorie</dt>
                  <dd>{procedureCategoryLabel(q.data.category)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Propriétaire</dt>
                  <dd>
                    {q.data.ownerLabel
                      ? displayLabel(q.data.ownerLabel, 'Non assigné')
                      : 'Non assigné'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Brouillon</dt>
                  <dd>
                    {q.data.currentDraft
                      ? `Version ${q.data.currentDraft.versionNumber}`
                      : 'Aucun brouillon'}
                  </dd>
                </div>
              </dl>
              {q.data.description ? (
                <p className="text-sm text-muted-foreground">
                  {displayLabel(q.data.description, 'Sans description')}
                </p>
              ) : null}
            </section>

            <EmptyState
              title="Éditeur de contenu riche"
              description="La rédaction TipTap (texte, médias, liens) arrive avec US-PROC-02. Les métadonnées et le brouillon v1 sont déjà créés."
            />
          </div>
        ) : null}

        {q.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Procédure inaccessible</AlertTitle>
            <AlertDescription>
              Vérifiez vos droits ou revenez au catalogue.
            </AlertDescription>
          </Alert>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
