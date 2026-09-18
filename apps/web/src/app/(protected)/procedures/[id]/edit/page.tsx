'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import {
  archiveProcedure,
  getProcedure,
  transitionProcedure,
  unarchiveProcedure,
  updateProcedureDraft,
} from '@/features/procedures/api/procedures.api';
import { procedureQueryKeys } from '@/features/procedures/lib/procedure-query-keys';
import { EMPTY_PROCEDURE_DOC } from '@/features/procedures/lib/procedure-content';
import {
  ProcedureBlockEditor,
  type ProcedureBlocksDoc,
  type TextBlock,
} from '@/features/procedures/components/procedure-block-editor';
import {
  ProcedureDiagramEditor,
  type DiagEdge,
  type DiagNode,
} from '@/features/procedures/components/procedure-diagram-editor';
import type { ProcedureCategoryApi } from '@/features/procedures/types/procedure.types';

export default function ProcedureEditPage() {
  const params = useParams();
  const procedureId = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canArchive = has('procedures.archive');
  const canUpdate = has('procedures.update');
  const canPublish = has('procedures.publish');
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: procedureQueryKeys.detail(clientId, procedureId),
    queryFn: () => getProcedure(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  const [doc, setDoc] = useState<ProcedureBlocksDoc | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProcedureCategoryApi>('PILOTAGE');
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [diagIndex, setDiagIndex] = useState<number | null>(null);
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
      category?: ProcedureCategoryApi;
    }) => {
      setSaveState('saving');
      try {
        const res = await updateProcedureDraft(authFetch, procedureId, {
          ...patch,
          expectedUpdatedAt: updatedAtRef.current,
        });
        updatedAtRef.current = res.updatedAt;
        setSaveState('saved');
        await queryClient.invalidateQueries({
          queryKey: procedureQueryKeys.detail(clientId, procedureId),
        });
      } catch (e) {
        setSaveState('error');
        toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
      }
    },
    [authFetch, procedureId, clientId, queryClient],
  );

  const scheduleSave = useCallback(
    (patch: {
      contentJson?: ProcedureBlocksDoc;
      title?: string;
      category?: ProcedureCategoryApi;
    }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void persist(patch);
      }, 1000);
    },
    [persist],
  );

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

  const transitionMut = useMutation({
    mutationFn: (to: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED') =>
      transitionProcedure(authFetch, procedureId, {
        to,
        expectedUpdatedAt: updatedAtRef.current,
      }),
    onSuccess: async (_res, to) => {
      toast.success(
        to === 'PUBLISHED'
          ? 'Procédure publiée'
          : to === 'IN_REVIEW'
            ? 'Procédure envoyée en revue'
            : 'Retour en brouillon',
      );
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.all(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isArchived = q.data?.status === 'ARCHIVED';
  const editable = Boolean(canUpdate && !isArchived && q.isSuccess);

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          backHref="/procedures"
          eyebrow="Gouvernance › Procédures"
          title={displayLabel(q.data?.title, 'Procédure')}
          actions={
            canArchive && q.isSuccess ? (
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
                  onClick={() => archiveMut.mutate()}
                >
                  Archiver
                </Button>
              )
            ) : null
          }
        />

        {q.isLoading ? <LoadingState rows={6} /> : null}
        {q.isError ? (
          <ErrorState
            message="Impossible de charger la procédure."
            onRetry={() => void q.refetch()}
          />
        ) : null}

        {q.isSuccess && doc ? (
          <ProcedureBlockEditor
            procedureId={procedureId}
            authFetch={authFetch}
            initialContent={doc}
            initialTitle={title}
            category={category}
            status={q.data.status}
            ownerLabel={q.data.ownerLabel}
            versionNumber={q.data.currentDraft?.versionNumber ?? null}
            editable={editable}
            saveState={saveState}
            canPublish={canPublish}
            onOpenDiagram={(idx) => setDiagIndex(idx)}
            onChange={(next) => {
              setDoc(next);
              if (editable) scheduleSave({ contentJson: next });
            }}
            onTitleChange={(t) => {
              setTitle(t);
              if (editable) scheduleSave({ title: t });
            }}
            onCategoryChange={(c) => {
              setCategory(c);
              if (editable) scheduleSave({ category: c });
            }}
            onTransition={(to) => transitionMut.mutate(to)}
          />
        ) : null}

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
              const next = { schemaVersion: 2 as const, blocks };
              setDoc(next);
              scheduleSave({ contentJson: next });
              setDiagIndex(null);
              toast.success('Schéma inséré dans la procédure');
            }}
          />
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
