'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileStack, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import {
  createProcedureTemplate,
  listProcedureTemplates,
} from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import {
  procedureCategoryLabel,
  procedureTemplateStatusLabel,
} from '../lib/procedure-labels';
import { ProcedureTemplateCreateDialog } from './procedure-template-create-dialog';

export function ProcedureTemplatesCatalog() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const listQ = useQuery({
    queryKey: procedureQueryKeys.templates(clientId),
    queryFn: () => listProcedureTemplates(authFetch),
    enabled: Boolean(clientId),
  });

  const createMut = useMutation({
    mutationFn: (name: string) =>
      createProcedureTemplate(authFetch, { name, outline: [] }),
    onSuccess: async (tpl) => {
      toast.success('Modèle créé');
      setCreateOpen(false);
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.templates(clientId),
      });
      router.push(`/procedures/templates/${tpl.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (listQ.isLoading) {
    return <LoadingState />;
  }

  if (listQ.isError) {
    return (
      <ErrorState
        message={
          listQ.error instanceof Error
            ? listQ.error.message
            : 'Impossible de charger les modèles'
        }
        onRetry={() => void listQ.refetch()}
      />
    );
  }

  const items = listQ.data ?? [];

  return (
    <div className="starium-stack gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          className="min-h-11 sm:min-h-9"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
          Nouveau modèle
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Aucun modèle"
          description="Créez un modèle avec une structure de titres H1 / H2 / H3 pour démarrer les prochaines procédures."
          action={
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Créer un modèle
            </Button>
          }
        />
      ) : (
        <ul className="starium-panel divide-y divide-border/70 overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card">
          {items.map((tpl) => (
            <li key={tpl.id}>
              <button
                type="button"
                className="flex min-h-14 w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] sm:flex-row sm:items-center sm:justify-between"
                onClick={() =>
                  router.push(`/procedures/templates/${tpl.id}`)
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileStack
                    className="size-4 shrink-0 text-[var(--brand-gold)]"
                    aria-hidden
                  />
                  <span className="truncate font-medium text-foreground">
                    {displayLabel(tpl.name, 'Modèle sans nom')}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {tpl.category ? (
                    <span>{procedureCategoryLabel(tpl.category)}</span>
                  ) : (
                    <span>Sans catégorie</span>
                  )}
                  <Badge variant="secondary">
                    {procedureTemplateStatusLabel(tpl.status)}
                  </Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ProcedureTemplateCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createMut.isPending}
        onSubmit={(name) => createMut.mutate(name)}
      />
    </div>
  );
}
