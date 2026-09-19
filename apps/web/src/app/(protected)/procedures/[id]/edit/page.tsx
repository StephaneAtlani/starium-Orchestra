'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Clock, Eye } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  getProcedure,
  getProcedureStakeholders,
  listProcedureCategories,
  transitionProcedure,
  updateProcedureDraft,
} from '@/features/procedures/api/procedures.api';
import { procedureQueryKeys } from '@/features/procedures/lib/procedure-query-keys';
import { displayLabel } from '@/lib/display-label';
import { procedureStatusLabel } from '@/features/procedures/lib/procedure-labels';
import {
  ProcedureBlockEditor,
  type ProcedureBlocksDoc,
  type TextBlock,
} from '@/features/procedures/components/procedure-block-editor';
import { ProcedurePublishDialog } from '@/features/procedures/components/procedure-publish-dialog';
import { ProcedureVersionHistory } from '@/features/procedures/components/procedure-version-history';
import { ProcedureStakeholdersPanel } from '@/features/procedures/components/procedure-stakeholders-panel';
import {
  ProcedureDiagramEditor,
  type DiagEdge,
  type DiagNode,
} from '@/features/procedures/components/procedure-diagram-editor';
import type {
  ProcedureBumpType,
  ProcedureCategoryRef,
  ProcedureStatusApi,
} from '@/features/procedures/types/procedure.types';
import { useAuth } from '@/context/auth-context';

function statusBadgeClass(status: ProcedureStatusApi): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-[var(--state-success-bg)] text-[var(--state-success)]';
    case 'IN_REVIEW':
    case 'PENDING_VALIDATION':
      return 'bg-[color-mix(in_srgb,var(--brand-gold)_20%,white)] text-[var(--brand-gold-700)]';
    case 'ARCHIVED':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function ProcedureEditPage() {
  const params = useParams();
  const procedureId = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { user } = useAuth();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canUpdate = has('procedures.update');
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: procedureQueryKeys.detail(clientId, procedureId),
    queryFn: () => getProcedure(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  const categoriesQ = useQuery({
    queryKey: procedureQueryKeys.categories(clientId, true),
    queryFn: () => listProcedureCategories(authFetch, { activeOnly: true }),
    enabled: Boolean(clientId),
  });

  const stakeholdersQ = useQuery({
    queryKey: procedureQueryKeys.stakeholders(clientId, procedureId),
    queryFn: () => getProcedureStakeholders(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  const [doc, setDoc] = useState<ProcedureBlocksDoc | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProcedureCategoryRef | null>(null);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [diagIndex, setDiagIndex] = useState<number | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedAtRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!q.data) return;
    updatedAtRef.current = q.data.updatedAt;
    setTitle(q.data.title);
    setCategory(q.data.category);
    const content = q.data.currentDraft?.contentJson;
    setDoc(
      content && typeof content === 'object'
        ? (content as ProcedureBlocksDoc)
        : ({
            schemaVersion: 2,
            blocks: [
              { t: 'h1', html: '' },
              { t: 'p', html: '' },
            ],
          } satisfies ProcedureBlocksDoc),
    );
  }, [q.data?.id, q.data?.currentDraft?.updatedAt, q.data?.updatedAt]);

  const persist = useCallback(
    async (patch: {
      contentJson?: ProcedureBlocksDoc;
      title?: string;
      categoryId?: string;
    }) => {
      setSaveState('saving');
      try {
        const res = await updateProcedureDraft(authFetch, procedureId, {
          ...patch,
          expectedUpdatedAt: updatedAtRef.current,
        });
        updatedAtRef.current = res.updatedAt;
        if (res.category) setCategory(res.category);
        setSaveState('saved');
        await queryClient.invalidateQueries({
          queryKey: procedureQueryKeys.detail(clientId, procedureId),
        });
      } catch (e) {
        setSaveState('error');
        toast.error(
          e instanceof Error ? e.message : 'Enregistrement impossible',
        );
      }
    },
    [authFetch, procedureId, clientId, queryClient],
  );

  const scheduleSave = useCallback(
    (patch: {
      contentJson?: ProcedureBlocksDoc;
      title?: string;
      categoryId?: string;
    }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void persist(patch);
      }, 1000);
    },
    [persist],
  );

  const transitionMut = useMutation({
    mutationFn: (input: {
      to: 'DRAFT' | 'IN_REVIEW' | 'PENDING_VALIDATION' | 'PUBLISHED';
      bumpType?: ProcedureBumpType;
      changeSummary?: string;
    }) =>
      transitionProcedure(authFetch, procedureId, {
        ...input,
        expectedUpdatedAt: updatedAtRef.current,
      }),
    onSuccess: async (res, input) => {
      const label = res.publishedVersion?.versionLabel;
      const toastMsg =
        input.to === 'PUBLISHED'
          ? label
            ? `Procédure publiée — ${label}`
            : 'Procédure publiée'
          : input.to === 'IN_REVIEW'
            ? 'Procédure envoyée en relecture'
            : input.to === 'PENDING_VALIDATION'
              ? 'Relecture validée — en validation'
              : 'Retour en brouillon';
      toast.success(toastMsg);
      setPublishOpen(false);
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.all(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isArchived = q.data?.status === 'ARCHIVED';
  const status = q.data?.status;
  const contentEditable =
    Boolean(canUpdate && !isArchived && q.isSuccess) &&
    (status === 'DRAFT' || status === 'PUBLISHED');

  const userId = user?.id;
  const isEditor = Boolean(
    userId && stakeholdersQ.data?.editors.some((e) => e.userId === userId),
  );
  const isReviewer = Boolean(
    userId && stakeholdersQ.data?.reviewers.some((r) => r.userId === userId),
  );
  const isValidator = Boolean(
    userId && stakeholdersQ.data?.validators.some((v) => v.userId === userId),
  );
  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';
  const isPlatformAdmin = user?.platformRole === 'PLATFORM_ADMIN';
  const canForce = isClientAdmin || isPlatformAdmin;

  const canSendToReview =
    canUpdate &&
    (status === 'DRAFT' || status === 'PUBLISHED') &&
    (isEditor || canForce);

  const canValidateReview =
    canUpdate &&
    status === 'IN_REVIEW' &&
    (isReviewer || canForce);

  const canPublish =
    canUpdate &&
    status === 'PENDING_VALIDATION' &&
    (isValidator || canForce);

  const canRejectToDraft =
    canUpdate &&
    ((status === 'IN_REVIEW' && (isReviewer || canForce)) ||
      (status === 'PENDING_VALIDATION' && (isValidator || canForce)));

  const canRejectToReview =
    canUpdate &&
    status === 'PENDING_VALIDATION' &&
    (isValidator || canForce);

  const published = q.data?.publishedVersion;
  const currentPublished =
    published?.versionMajor != null && published.versionMinor != null
      ? {
          versionMajor: published.versionMajor,
          versionMinor: published.versionMinor,
        }
      : null;

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-3.5">
          <Link
            href="/procedures"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-[13px] font-bold text-muted-foreground hover:bg-muted sm:min-h-9 sm:py-1.5"
          >
            <ChevronLeft className="size-[15px]" aria-hidden />
            Procédures
          </Link>

          {status ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11.5px] font-bold',
                statusBadgeClass(status),
              )}
            >
              <span
                className="size-1.5 rounded-full bg-current"
                aria-hidden
              />
              {procedureStatusLabel(status)}
            </span>
          ) : null}

          {q.data?.sourceTemplateLabel ? (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              Créée depuis{' '}
              <span className="font-medium text-foreground">
                {displayLabel(q.data.sourceTemplateLabel, 'Modèle')}
              </span>
            </span>
          ) : null}

          <span
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <span
              className={cn(
                'size-[7px] rounded-full',
                saveState === 'saving' && 'bg-[var(--brand-gold)]',
                saveState === 'saved' && 'bg-[var(--state-success)]',
                saveState === 'error' && 'bg-[var(--state-danger)]',
                saveState === 'idle' && 'bg-border',
              )}
              aria-hidden
            />
            {saveState === 'saving'
              ? 'Enregistrement…'
              : saveState === 'saved'
                ? 'Enregistré'
                : saveState === 'error'
                  ? 'Erreur d’enregistrement'
                  : '—'}
          </span>

          <span className="hidden min-w-0 flex-1 sm:block" aria-hidden />

          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() =>
                toast.message('Aperçu lecteur — bientôt disponible')
              }
            >
              <Eye className="size-4" aria-hidden />
              Aperçu
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => {
                document
                  .getElementById('pr-hist')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
            >
              <Clock className="size-4" aria-hidden />
              Versions
            </Button>
            {canSendToReview ? (
              <Button
                type="button"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={transitionMut.isPending}
                aria-busy={transitionMut.isPending}
                onClick={() => transitionMut.mutate({ to: 'IN_REVIEW' })}
              >
                <Check className="size-4" aria-hidden />
                Envoyer en relecture
              </Button>
            ) : null}
            {canValidateReview ? (
              <Button
                type="button"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={transitionMut.isPending}
                onClick={() =>
                  transitionMut.mutate({ to: 'PENDING_VALIDATION' })
                }
              >
                <Check className="size-4" aria-hidden />
                Valider la relecture
              </Button>
            ) : null}
            {canPublish ? (
              <Button
                type="button"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={transitionMut.isPending}
                onClick={() => setPublishOpen(true)}
              >
                <Check className="size-4" aria-hidden />
                Publier
              </Button>
            ) : null}
            {canRejectToReview ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={transitionMut.isPending}
                onClick={() => transitionMut.mutate({ to: 'IN_REVIEW' })}
              >
                Renvoyer en relecture
              </Button>
            ) : null}
            {canRejectToDraft ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={transitionMut.isPending}
                onClick={() => transitionMut.mutate({ to: 'DRAFT' })}
              >
                Renvoyer en brouillon
              </Button>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {transitionMut.isPending ? 'Transition en cours…' : ''}
            </p>
          </div>
        </div>

        {q.isLoading ? <LoadingState rows={6} /> : null}
        {q.isError ? (
          <ErrorState
            message="Impossible de charger la procédure."
            onRetry={() => void q.refetch()}
          />
        ) : null}

        {q.isSuccess && doc && category ? (
          <ProcedureBlockEditor
            procedureId={procedureId}
            authFetch={authFetch}
            initialContent={doc}
            initialTitle={title}
            category={category}
            categoryOptions={
              categoriesQ.data?.length ? categoriesQ.data : [category]
            }
            ownerLabel={q.data.ownerLabel}
            ownerUserId={q.data.ownerUserId}
            publishedVersionLabel={
              q.data.publishedVersion?.versionLabel ?? null
            }
            editable={contentEditable}
            governanceSlot={
              <ProcedureStakeholdersPanel
                procedureId={procedureId}
                canManage={Boolean(
                  canUpdate &&
                    !isArchived &&
                    (isEditor || canForce || q.data.status === 'DRAFT'),
                )}
              />
            }
            historySlot={
              <ProcedureVersionHistory
                procedureId={procedureId}
                clientId={clientId}
                authFetch={authFetch}
                canRestore={contentEditable}
              />
            }
            onOpenDiagram={(idx) => setDiagIndex(idx)}
            onChange={(next) => {
              setDoc(next);
              if (contentEditable) scheduleSave({ contentJson: next });
            }}
            onTitleChange={(t) => {
              setTitle(t);
              if (contentEditable) scheduleSave({ title: t });
            }}
            onCategoryChange={(categoryId) => {
              const next =
                categoriesQ.data?.find((c) => c.id === categoryId) ??
                (category.id === categoryId ? category : null);
              if (next) setCategory(next);
              if (contentEditable) scheduleSave({ categoryId });
            }}
          />
        ) : null}

        <ProcedurePublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          currentPublished={currentPublished}
          submitting={transitionMut.isPending}
          onConfirm={({ bumpType, changeSummary }) => {
            transitionMut.mutate({
              to: 'PUBLISHED',
              bumpType,
              changeSummary,
            });
          }}
        />

        {diagIndex != null && doc ? (
          <ProcedureDiagramEditor
            open
            title={
              doc.blocks[diagIndex]?.t === 'diag'
                ? (doc.blocks[diagIndex] as Extract<TextBlock, { t: 'diag' }>)
                    .title
                : ''
            }
            nodes={
              doc.blocks[diagIndex]?.t === 'diag'
                ? ((doc.blocks[diagIndex] as Extract<TextBlock, { t: 'diag' }>)
                    .nodes as DiagNode[])
                : []
            }
            edges={
              doc.blocks[diagIndex]?.t === 'diag'
                ? ((doc.blocks[diagIndex] as Extract<TextBlock, { t: 'diag' }>)
                    .edges as DiagEdge[])
                : []
            }
            onClose={() => setDiagIndex(null)}
            onCommit={({ title: t, nodes, edges }) => {
              const blocks = doc.blocks.map((b, i) =>
                i === diagIndex && b.t === 'diag'
                  ? { ...b, title: t, nodes, edges }
                  : b,
              );
              const next = { ...doc, blocks };
              setDoc(next);
              setDiagIndex(null);
              if (contentEditable) scheduleSave({ contentJson: next });
            }}
          />
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
