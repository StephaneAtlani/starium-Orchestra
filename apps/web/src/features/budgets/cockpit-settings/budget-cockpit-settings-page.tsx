'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  listBudgetDashboardConfigs,
  patchBudgetDashboardConfig,
} from '@/features/budgets/api/budget-dashboard.api';
import type { BudgetDashboardConfigDto } from '@/features/budgets/types/budget-dashboard.types';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';

type LocalWidget = BudgetDashboardConfigDto['widgets'][number];

function sortByPosition(a: LocalWidget, b: LocalWidget) {
  return a.position - b.position;
}

export function BudgetCockpitSettingsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const { data: configs, isLoading, error, refetch } = useQuery({
    queryKey: ['budget-dashboard-configs', clientId],
    queryFn: () => listBudgetDashboardConfigs(authFetch),
    enabled: !!clientId,
  });

  const targetConfig = useMemo(() => {
    if (!configs?.length) return undefined;
    return configs.find((c) => c.isDefault) ?? configs[0];
  }, [configs]);

  const [widgets, setWidgets] = useState<LocalWidget[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!targetConfig) return;
    setWidgets([...targetConfig.widgets].sort(sortByPosition));
    setDirty(false);
  }, [targetConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!targetConfig) throw new Error('Aucune configuration');
      const ordered = [...widgets]
        .sort(sortByPosition)
        .map((w, i) => ({ ...w, position: i }));
      return patchBudgetDashboardConfig(authFetch, targetConfig.id, {
        widgets: ordered.map((w) => ({
          id: w.id,
          type: w.type,
          position: w.position,
          title: w.title,
          size: w.size,
          isActive: w.isActive,
          settings: w.settings ?? undefined,
        })),
      });
    },
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ['budget-dashboard-configs', clientId] });
      void qc.invalidateQueries({
        queryKey: budgetQueryKeys.dashboardAll(clientId),
      });
    },
  });

  const move = useCallback((index: number, dir: -1 | 1) => {
    setWidgets((prev) => {
      const next = [...prev].sort(sortByPosition);
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next.map((w, i) => ({ ...w, position: i }));
    });
    setDirty(true);
  }, []);

  const toggleActive = useCallback((id: string, v: boolean) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: v } : w)),
    );
    setDirty(true);
  }, []);

  const err = error instanceof Error ? error.message : null;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Réglages du cockpit budget"
          description="Activer ou désactiver les blocs et leur ordre d’affichage. Enregistrement : remplacement complet des widgets pour la configuration sélectionnée."
        />

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Chargement…
          </div>
        )}

        {!isLoading && err && (
          <p className="text-sm text-destructive">{err}</p>
        )}

        {!isLoading && !err && targetConfig && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Configuration :{' '}
                <span className="font-medium text-foreground">{targetConfig.name}</span>
                {targetConfig.isDefault ? (
                  <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs">
                    par défaut
                  </span>
                ) : null}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  disabled={saveMutation.isPending}
                >
                  Recharger
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 size-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </div>

            {saveMutation.isError && (
              <p className="text-sm text-destructive">
                {(saveMutation.error as Error)?.message ?? 'Erreur à l’enregistrement'}
              </p>
            )}

            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]" />
                    <TableHead>Titre</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[100px] text-center">Actif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...widgets].sort(sortByPosition).map((w, i) => (
                    <TableRow key={w.id}>
                      <TableCell className="align-middle">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Monter"
                            disabled={i === 0}
                            onClick={() => move(i, -1)}
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Descendre"
                            disabled={i === widgets.length - 1}
                            onClick={() => move(i, 1)}
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{w.title}</TableCell>
                      <TableCell>
                        <code
                          className={cn(
                            'rounded bg-muted px-1.5 py-0.5 text-xs',
                          )}
                        >
                          {w.type}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={w.isActive}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            toggleActive(w.id, e.target.checked)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!isLoading && !err && !targetConfig && (
          <p className="text-sm text-muted-foreground">
            Aucune configuration cockpit. Ouvrez le dashboard budget pour initialiser.
          </p>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
