'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  createProcedureCategory,
  listProcedureCategories,
  updateProcedureCategory,
} from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';
import { procedureCategoryLabel } from '../lib/procedure-labels';

export function ProcedureSettingsPanel() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canConfigure = has('procedures.configure');
  const queryClient = useQueryClient();
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  const categoriesQ = useQuery({
    queryKey: procedureQueryKeys.categories(clientId, false),
    queryFn: () => listProcedureCategories(authFetch),
    enabled: Boolean(clientId),
  });

  const createCatMut = useMutation({
    mutationFn: (label: string) =>
      createProcedureCategory(authFetch, { label }),
    onSuccess: async () => {
      toast.success('Catégorie créée');
      setNewCategoryLabel('');
      await queryClient.invalidateQueries({
        queryKey: [...procedureQueryKeys.all(clientId), 'categories'],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCatMut = useMutation({
    mutationFn: (input: {
      id: string;
      label?: string;
      isActive?: boolean;
    }) =>
      updateProcedureCategory(authFetch, input.id, {
        label: input.label,
        isActive: input.isActive,
      }),
    onSuccess: async () => {
      toast.success('Catégorie mise à jour');
      await queryClient.invalidateQueries({
        queryKey: [...procedureQueryKeys.all(clientId), 'categories'],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-5">
      <section
        className="starium-section space-y-4 p-4 sm:p-5"
        aria-labelledby="pr-cfg-categories"
      >
        <div>
          <h2
            id="pr-cfg-categories"
            className="text-base font-bold text-foreground"
          >
            Catégories
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Référentiel du client actif — libellés affichés dans le catalogue et
            l’éditeur. La gouvernance (rédacteurs, relecteurs, validateurs) se
            configure sur chaque procédure.
          </p>
        </div>

        {categoriesQ.isLoading ? (
          <LoadingState rows={3} />
        ) : categoriesQ.isError ? (
          <ErrorState
            message="Impossible de charger les catégories."
            onRetry={() => void categoriesQ.refetch()}
          />
        ) : (
          <>
            <ul className="divide-y divide-border/60 rounded-[var(--radius-md)] border border-border/70">
              {(categoriesQ.data ?? []).length === 0 ? (
                <li className="px-3 py-4 text-[13px] text-muted-foreground">
                  Aucune catégorie.
                </li>
              ) : (
                (categoriesQ.data ?? []).map((cat) => (
                  <li
                    key={cat.id}
                    className="flex min-h-11 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {canConfigure ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="starium-form-field min-w-0 flex-1">
                          <Label
                            htmlFor={`pr-cat-label-${cat.id}`}
                            className="sr-only"
                          >
                            Libellé {procedureCategoryLabel(cat)}
                          </Label>
                          <Input
                            id={`pr-cat-label-${cat.id}`}
                            className="min-h-11"
                            defaultValue={cat.label}
                            disabled={updateCatMut.isPending}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (!next || next === cat.label) return;
                              updateCatMut.mutate({ id: cat.id, label: next });
                            }}
                          />
                          <p className="mt-1 text-[11.5px] text-muted-foreground">
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 sm:min-h-9"
                          disabled={updateCatMut.isPending}
                          onClick={() =>
                            updateCatMut.mutate({
                              id: cat.id,
                              isActive: !cat.isActive,
                            })
                          }
                        >
                          {cat.isActive ? 'Désactiver' : 'Réactiver'}
                        </Button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-foreground">
                          {procedureCategoryLabel(cat)}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>

            {canConfigure ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="starium-form-field min-w-0 flex-1">
                  <Label htmlFor="pr-new-category">Nouvelle catégorie</Label>
                  <Input
                    id="pr-new-category"
                    className="min-h-11"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="Ex. Achats"
                    disabled={createCatMut.isPending}
                  />
                </div>
                <Button
                  type="button"
                  className="min-h-11 sm:min-h-9"
                  disabled={
                    !newCategoryLabel.trim() || createCatMut.isPending
                  }
                  onClick={() =>
                    createCatMut.mutate(newCategoryLabel.trim())
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
