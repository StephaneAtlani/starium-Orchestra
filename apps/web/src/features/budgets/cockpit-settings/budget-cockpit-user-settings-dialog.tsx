'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Check,
  Sparkles,
} from 'lucide-react';

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { BudgetExerciseSummary } from '@/features/budgets/types/budget-list.types';
import type { BudgetSummary } from '@/features/budgets/types/budget-list.types';
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

/** Libellés métier pour le type technique (RFC-022). */
const WIDGET_TYPE_LABEL: Record<string, string> = {
  KPI: 'Indicateurs',
  ALERT_LIST: 'Alertes',
  ENVELOPE_LIST: 'Enveloppes',
  LINE_LIST: 'Lignes',
  CHART: 'Graphiques',
};

function widgetTypeLabel(type: string): string {
  return WIDGET_TYPE_LABEL[type] ?? type;
}

const AUTOSAVE_DEBOUNCE_MS = 650;

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
  description = 'Ordre et visibilité des blocs — enregistrement automatique pour votre compte.',
  useUserOverrides,
  animateAmounts,
  onAnimateAmountsChange,
  exercises,
  budgets,
  exerciseId,
  budgetId,
  exerciseSelectLabel,
  budgetSelectLabel,
  exercisesLoading,
  budgetsLoading,
  onExerciseChange,
  onBudgetChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: BudgetCockpitResponse['widgets'];
  title?: string;
  description?: string;
  /** Périmètre par défaut (même état que l’en-tête du cockpit). */
  useUserOverrides: boolean;
  /** Animation des montants sur la synthèse financière (stocké localement). */
  animateAmounts: boolean;
  onAnimateAmountsChange: (v: boolean) => void;
  exercises: BudgetExerciseSummary[];
  budgets: BudgetSummary[];
  exerciseId?: string;
  budgetId?: string;
  exerciseSelectLabel: string;
  budgetSelectLabel: string;
  exercisesLoading: boolean;
  budgetsLoading: boolean;
  onExerciseChange: (id: string) => void;
  onBudgetChange: (id: string) => void;
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

  const draftWidgetsRef = useRef(draftWidgets);
  const initialWidgetsRef = useRef(initialWidgets);
  draftWidgetsRef.current = draftWidgets;
  initialWidgetsRef.current = initialWidgets;

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

  const { mutateAsync: patchWidgetOverrides, ...saveMutation } = useMutation({
    mutationFn: async (
      overrides: Array<{ widgetId: string; isActive: boolean; position: number }>,
    ) => {
      if (!clientId) throw new Error('Client actif requis');
      if (overrides.length === 0) return [];
      return patchBudgetDashboardUserOverrides(authFetch, { overrides });
    },
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: budgetQueryKeys.dashboardAll(clientId) });
    },
  });

  /** Sauvegarde automatique des widgets (debounce) — refs pour le payload au moment du flush. */
  useEffect(() => {
    if (!open || !dirty) return;
    const t = window.setTimeout(() => {
      const payload = computeUserOverridesPayload({
        initialWidgets: initialWidgetsRef.current,
        draftWidgets: draftWidgetsRef.current,
      });
      if (payload.length === 0) {
        setDirty(false);
        return;
      }
      void patchWidgetOverrides(payload).catch(() => {
        /* erreur affichée via saveMutation.isError */
      });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [draftWidgets, dirty, open, patchWidgetOverrides]);

  const activeCount = draftWidgets.filter((w) => w.isActive).length;
  const total = draftWidgets.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,800px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        {/* §11.3.1 — bandeau d’en-tête ; corps scrollable ; pied toujours visible (évite footer hors viewport) */}
        <DialogHeader className="shrink-0 space-y-3 rounded-t-xl border-b border-border/60 bg-card px-4 pb-4 pt-4 text-left shadow-sm sm:px-6 sm:pl-8 sm:pt-5">
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <DialogTitle className="text-left text-lg font-semibold tracking-tight text-foreground">
                {title}
              </DialogTitle>
              <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">
                Cockpit
              </Badge>
            </div>
            <DialogDescription className="mt-2 text-left text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground/90" aria-hidden />
            <span>
              <span className="font-medium tabular-nums text-foreground">{activeCount}</span>
              {' actif'}
              {activeCount > 1 ? 's' : ''} sur {total}
            </span>
            {saveMutation.isPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
                Enregistrement…
              </span>
            ) : dirty ? (
              <span className="rounded-md border border-amber-600/50 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow-sm dark:border-amber-500/60 dark:bg-amber-950/90 dark:text-amber-50 dark:shadow-none">
                En attente d’enregistrement…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-600/40 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950/70 dark:text-emerald-50">
                <Check className="size-3.5 shrink-0" aria-hidden />
                À jour
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {saveMutation.isError ? (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertCircle className="size-4" aria-hidden />
              <AlertTitle>Enregistrement impossible</AlertTitle>
              <AlertDescription>
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : 'Une erreur est survenue. Réessayez ou vérifiez vos droits (budgets.update).'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div
            className={cn(
              'rounded-xl border border-border/70 bg-card p-4 shadow-sm',
              'ring-1 ring-border/40',
            )}
          >
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Exercice et budget par défaut
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {useUserOverrides
                    ? 'Choisissez l’exercice et le budget affichés au chargement : ils sont enregistrés pour votre compte (navigateur, mode personnalisé).'
                    : 'Choisissez l’exercice et le budget affichés au chargement : en mode global, la mémorisation est partagée pour le client. Activez « Personnalisé » dans l’en-tête pour un défaut propre à votre compte.'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cockpit-settings-exercise" className="text-xs text-muted-foreground">
                  Exercice
                </Label>
                <Select
                  value={exerciseId ?? ''}
                  onValueChange={(v) => {
                    if (v) onExerciseChange(v);
                  }}
                  disabled={
                    exercisesLoading ||
                    (exercises.length === 0 && !exerciseSelectLabel)
                  }
                >
                  <SelectTrigger
                    id="cockpit-settings-exercise"
                    className="w-full border-input bg-background shadow-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-left text-sm">
                      {exerciseSelectLabel ? (
                        exerciseSelectLabel
                      ) : (
                        <span className="text-muted-foreground">Exercice</span>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.code ? `${ex.code} — ` : ''}
                        {ex.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cockpit-settings-budget" className="text-xs text-muted-foreground">
                  Budget
                </Label>
                <Select
                  value={budgetId ?? ''}
                  onValueChange={(v) => {
                    if (v) onBudgetChange(v);
                  }}
                  disabled={
                    !exerciseId ||
                    budgetsLoading ||
                    (budgets.length === 0 && !budgetSelectLabel)
                  }
                >
                  <SelectTrigger
                    id="cockpit-settings-budget"
                    className="w-full border-input bg-background shadow-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-left text-sm">
                      {budgetSelectLabel ? (
                        budgetSelectLabel
                      ) : (
                        <span className="text-muted-foreground">Budget</span>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.code ? `${b.code} — ` : ''}
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl border border-border/70 bg-card p-4 shadow-sm',
              'ring-1 ring-border/40',
            )}
          >
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                <Sparkles className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">Affichage</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Les montants de la synthèse financière peuvent défiler en douceur lors des
                  mises à jour. Préférence enregistrée dans ce navigateur pour votre compte.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
              <span className="text-sm font-medium text-foreground">
                Animer les montants
              </span>
              <Switch
                checked={animateAmounts}
                onCheckedChange={onAnimateAmountsChange}
                aria-label="Animer les montants sur la synthèse financière"
              />
            </div>
          </div>

          <div
            className={cn(
              'overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm',
              'ring-1 ring-border/40',
            )}
          >
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Widgets du cockpit</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Utilisez les flèches pour l’ordre d’affichage ; l’interrupteur masque ou affiche le bloc.
                Les changements sont enregistrés automatiquement.
              </p>
            </div>
            <div className="min-w-0">
              <Table className="min-w-[20rem]">
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[88px] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Ordre
                    </TableHead>
                    <TableHead className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Widget
                    </TableHead>
                    <TableHead className="w-[100px] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Afficher
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...draftWidgets].sort(sortByPosition).map((w, i) => (
                    <TableRow key={w.id} className="border-border/50">
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            aria-label={`Monter « ${w.title} »`}
                            disabled={i === 0 || saveMutation.isPending}
                            onClick={() => move(i, -1)}
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            aria-label={`Descendre « ${w.title} »`}
                            disabled={i === draftWidgets.length - 1 || saveMutation.isPending}
                            onClick={() => move(i, 1)}
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-medium text-foreground">{w.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {widgetTypeLabel(w.type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={w.isActive}
                            onCheckedChange={(v) => toggleActive(w.id, v)}
                            disabled={saveMutation.isPending}
                            aria-label={`Afficher le widget « ${w.title} »`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="!mx-0 !mb-0 shrink-0 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border/80"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => {
              setDraftWidgets(initialWidgets);
              setDirty(false);
            }}
          >
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Réinitialiser
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
