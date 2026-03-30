'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';

import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';

import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { patchBudgetDashboardUserOverrides } from '@/features/budgets/api/budget-dashboard.api';
import type {
  BudgetCockpitWidgetPayload,
  BudgetCockpitResponse,
} from '@/features/budgets/types/budget-dashboard.types';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function sortByPosition(a: BudgetCockpitWidgetPayload, b: BudgetCockpitWidgetPayload) {
  return a.position - b.position;
}

export function computeUserOverridesPayload({
  initialWidgets,
  draftWidgets,
}: {
  initialWidgets: BudgetCockpitWidgetPayload[];
  draftWidgets: BudgetCockpitWidgetPayload[];
}): Array<{
  widgetId: string;
  isActive: boolean;
  position: number;
}> {
  const initialById = new Map(initialWidgets.map((w) => [w.id, w] as const));
  const changed = draftWidgets.filter((w) => {
    const base = initialById.get(w.id);
    if (!base) return true;
    return base.isActive !== w.isActive || base.position !== w.position;
  });

  return changed.map((w) => ({
    widgetId: w.id,
    isActive: w.isActive,
    position: w.position,
  }));
}

export function BudgetCockpitUserSettingsDialog({
  open,
  onOpenChange,
  widgets,
  title = 'Personnalisation cockpit budget',
  description = 'Ordre et activation des widgets — enregistrés pour ce compte.',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: BudgetCockpitResponse['widgets'];
  title?: string;
  description?: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const initialWidgets = useMemo(() => {
    return [...widgets].sort(sortByPosition);
  }, [widgets]);

  const [draftWidgets, setDraftWidgets] = useState<BudgetCockpitWidgetPayload[]>(initialWidgets);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftWidgets(initialWidgets);
    setDirty(false);
  }, [open, initialWidgets]);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setDraftWidgets((prev) => {
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
    setDraftWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, isActive: v } : w)));
    setDirty(true);
  }, []);

  const overridesPayload = useMemo(() => {
    return computeUserOverridesPayload({ initialWidgets, draftWidgets });
  }, [draftWidgets, initialWidgets]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('Client actif requis');
      if (overridesPayload.length === 0) return [];
      return patchBudgetDashboardUserOverrides(authFetch, { overrides: overridesPayload });
    },
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: budgetQueryKeys.dashboardAll(clientId) });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {draftWidgets.filter((w) => w.isActive).length} actif(s) sur {draftWidgets.length}
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!dirty || saveMutation.isPending}
                onClick={() => {
                  setDraftWidgets(initialWidgets);
                  setDirty(false);
                }}
              >
                Réinitialiser
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saveMutation.isPending || !dirty}
                onClick={() => void saveMutation.mutate()}
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

          <div className={cn('rounded-xl border border-border', 'overflow-hidden')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]" />
                  <TableHead>Widget</TableHead>
                  <TableHead className="w-[100px] text-center">Actif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...draftWidgets].sort(sortByPosition).map((w, i) => (
                  <TableRow key={w.id}>
                    <TableCell className="align-middle">
                      <div className="flex flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Monter"
                          disabled={i === 0 || saveMutation.isPending}
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
                          disabled={i === draftWidgets.length - 1 || saveMutation.isPending}
                          onClick={() => move(i, 1)}
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{w.title}</TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={w.isActive}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          toggleActive(w.id, e.target.checked)
                        }
                        disabled={saveMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

