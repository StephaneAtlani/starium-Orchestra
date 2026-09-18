'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import {
  archiveProcedure,
  getProcedure,
  unarchiveProcedure,
  updateProcedureDraft,
} from '@/features/procedures/api/procedures.api';
import { procedureQueryKeys } from '@/features/procedures/lib/procedure-query-keys';
import {
  procedureCategoryLabel,
  procedureStatusLabel,
} from '@/features/procedures/lib/procedure-labels';
import { EMPTY_PROCEDURE_DOC } from '@/features/procedures/lib/procedure-content';
import { ProcedureRichEditor } from '@/features/procedures/components/procedure-rich-editor';

export default function ProcedureEditPage() {
  const params = useParams();
  const procedureId = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canArchive = has('procedures.archive');
  const canUpdate = has('procedures.update');
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: procedureQueryKeys.detail(clientId, procedureId),
    queryFn: () => getProcedure(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  const [draftJson, setDraftJson] = useState<Record<string, unknown> | null>(
    null,
  );
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!q.data?.currentDraft) {
      setDraftJson(null);
      return;
    }
    const content = q.data.currentDraft.contentJson;
    setDraftJson(
      content && typeof content === 'object'
        ? (content as Record<string, unknown>)
        : { ...EMPTY_PROCEDURE_DOC },
    );
  }, [q.data?.currentDraft?.id, q.data?.currentDraft?.updatedAt]);

  const archiveMut = useMutation({
    mutationFn: () => archiveProcedure(authFetch, procedureId),
    onSuccess: async () => {
      toast.success('Procédure archivée');
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.all(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unarchiveMut = useMutation({
    mutationFn: () => unarchiveProcedure(authFetch, procedureId),
    onSuccess: async () => {
      toast.success('Procédure restaurée');
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.all(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateProcedureDraft(authFetch, procedureId, {
        contentJson: draftJson ?? { ...EMPTY_PROCEDURE_DOC },
        expectedUpdatedAt: q.data?.updatedAt,
      }),
    onSuccess: async () => {
      setSaveMessage('Enregistré');
      toast.success('Brouillon enregistré');
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.detail(clientId, procedureId),
      });
    },
    onError: (e: Error) => {
      setSaveMessage('');
      toast.error(e.message);
    },
  });

  const isArchived = q.data?.status === 'ARCHIVED';
  const editable = Boolean(canUpdate && !isArchived && q.isSuccess);

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          backHref="/procedures"
          eyebrow="Gouvernance › Procédures"
          title={
            q.data ? displayLabel(q.data.title, 'Procédure') : 'Procédure'
          }
          description={
            q.data
              ? `${displayLabel(q.data.code, 'Sans code')} · ${procedureStatusLabel(q.data.status)} · ${procedureCategoryLabel(q.data.category)}`
              : 'Chargement…'
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {editable ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  disabled={saveMut.isPending || !draftJson}
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              ) : null}
              {canArchive && q.isSuccess ? (
                isArchived ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={unarchiveMut.isPending}
                    onClick={() => unarchiveMut.mutate()}
                  >
                    Désarchiver
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={archiveMut.isPending}
                    onClick={() => {
                      if (
                        typeof window !== 'undefined' &&
                        !window.confirm(
                          'Archiver cette procédure ? Elle disparaîtra du catalogue actif.',
                        )
                      ) {
                        return;
                      }
                      archiveMut.mutate();
                    }}
                  >
                    Archiver
                  </Button>
                )
              ) : null}
              <Link
                href="/procedures"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                Catalogue
              </Link>
            </div>
          }
        />

        <p className="sr-only" aria-live="polite">
          {saveMessage}
        </p>

        {q.isLoading ? <LoadingState rows={3} /> : null}
        {q.isError ? (
          <ErrorState
            message="Impossible de charger la procédure."
            onRetry={() => void q.refetch()}
          />
        ) : null}

        {q.isSuccess ? (
          <div className="flex flex-col gap-4">
            {isArchived ? (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>Procédure archivée</AlertTitle>
                <AlertDescription>
                  Contenu en lecture seule jusqu&apos;à désarchivage.
                </AlertDescription>
              </Alert>
            ) : null}

            <section
              className="starium-section space-y-2 p-4 sm:p-5"
              aria-labelledby="procedure-meta"
            >
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
            </section>

            <section className="space-y-2" aria-labelledby="procedure-body">
              <h2 id="procedure-body" className="text-base font-semibold">
                Contenu
              </h2>
              {draftJson ? (
                <ProcedureRichEditor
                  key={`${q.data.currentDraft?.id ?? 'empty'}-${q.data.currentDraft?.updatedAt ?? ''}`}
                  content={draftJson}
                  editable={editable}
                  onChange={setDraftJson}
                  procedureId={procedureId}
                  authFetch={authFetch}
                />
              ) : (
                <LoadingState rows={2} />
              )}
            </section>
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
