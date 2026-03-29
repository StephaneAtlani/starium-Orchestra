'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BudgetPageHeader } from '../budget-page-header';
import { BudgetEmptyState } from '../budget-empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetLineForm } from '../forms/budget-line-form';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getLine } from '../../api/budget-management.api';
import { useBudgetEnvelopesAll } from '../../hooks/use-budget-envelopes';
import { useBudgetDetail } from '../../hooks/use-budgets';
import { useBudgetExerciseSummary } from '../../hooks/use-budget-exercises';
import { getBudgetMonthColumnLabelsFromExerciseStartIso } from '../../lib/budget-month-labels';
import { useGeneralLedgerAccountOptions } from '../../hooks/use-general-ledger-account-options';
import { useCreateBudgetLine } from '../../hooks/use-create-budget-line';
import { useUpdateBudgetLine } from '../../hooks/use-update-budget-line';
import { lineApiToForm } from '../../mappers/budget-form.mappers';
import { budgetDetail } from '../../constants/budget-routes';
import type { BudgetLineFormValues } from '../../schemas/budget-line-form.schema';
import type { BudgetLineFormSubmitMeta } from '../forms/budget-line-form';
import type { CreateBudgetLineMutationInput } from '../../hooks/use-create-budget-line';
import type { ApiFormError } from '../../api/types';
// Ancienne zone de "planning détaillé" désactivée : la calculette rapide embarque désormais la logique principale.

interface BudgetLineFormPageProps {
  mode: 'create' | 'edit';
  budgetId?: string;
  envelopeId?: string;
  lineId?: string;
  variant?: 'page' | 'embedded';
  onCloseEmbedded?: () => void;
  /** Avec création sans navigation (modale). */
  skipRedirectAfterCreate?: boolean;
  /** Après création réussie (ex. fermer la modale). */
  onCreateSuccess?: () => void;
}

export function BudgetLineFormPage({
  mode,
  budgetId,
  envelopeId,
  lineId,
  variant = 'page',
  onCloseEmbedded,
  skipRedirectAfterCreate = false,
  onCreateSuccess,
}: BudgetLineFormPageProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data: line, isLoading, error } = useQuery({
    queryKey: ['budget-line-detail', clientId, lineId],
    queryFn: () => getLine(authFetch, lineId!),
    enabled: mode === 'edit' && !!lineId && !!clientId,
  });

  const resolvedBudgetId = budgetId ?? line?.budgetId;
  const { data: budget } = useBudgetDetail(resolvedBudgetId ?? null);
  const { data: budgetExercise } = useBudgetExerciseSummary(budget?.exerciseId ?? null);
  const envelopesQuery = useBudgetEnvelopesAll(resolvedBudgetId ?? null);
  const { data: generalLedgerData } = useGeneralLedgerAccountOptions();

  const envelopeOptions = envelopesQuery.data ?? [];
  const isEnvelopeOptionsLoading = envelopesQuery.isLoading;
  const isEnvelopeOptionsSuccess = envelopesQuery.isSuccess;
  const generalLedgerOptions = generalLedgerData?.items ?? [];

  const createMutation = useCreateBudgetLine(resolvedBudgetId ?? null, {
    skipRedirect: skipRedirectAfterCreate,
    onCreated: onCreateSuccess,
  });
  const updateMutation = useUpdateBudgetLine(lineId ?? null, resolvedBudgetId ?? null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  // Ancien état du planning détaillé (grille + moteurs avancés) supprimé au profit de la calculette rapide.

  if (isEdit && isLoading) {
    return (
      variant === 'page' ? (
        <>
          <BudgetPageHeader title="Modifier la ligne" description="Chargement…" />
          <LoadingState rows={3} />
        </>
      ) : (
        <LoadingState rows={3} />
      )
    );
  }

  if (isEdit && (error || (!isLoading && !line))) {
    return (
      variant === 'page' ? (
        <>
          <BudgetPageHeader title="Modifier la ligne" />
          <BudgetEmptyState title="Aucune ligne à afficher" description="" />
        </>
      ) : (
        <BudgetEmptyState title="Aucune ligne à afficher" description="" />
      )
    );
  }

  if (!resolvedBudgetId) {
    return (
      variant === 'page' ? (
        <>
          <BudgetPageHeader title="Ligne" />
          <BudgetEmptyState title="Aucun budget à afficher" description="" />
        </>
      ) : (
        <BudgetEmptyState title="Aucun budget à afficher" description="" />
      )
    );
  }

  const defaultValues: Partial<BudgetLineFormValues> = isEdit && line
    ? lineApiToForm(line, budget?.taxMode ?? 'HT')
    : { budgetId: resolvedBudgetId, envelopeId, currency: 'EUR', status: 'DRAFT' };

  const handleSubmit = (values: BudgetLineFormValues, meta?: BudgetLineFormSubmitMeta) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      const payload: CreateBudgetLineMutationInput = meta?.planningAmounts12
        ? { ...values, planningAmounts12: meta.planningAmounts12 }
        : values;
      createMutation.mutate(payload);
    }
  };

  const cancelHref = budgetDetail(resolvedBudgetId);
  const budgetLabel = budget?.name ?? resolvedBudgetId;

  const monthColumnLabels = useMemo((): string[] | undefined => {
    if (!budgetExercise?.startDate) return undefined;
    try {
      return getBudgetMonthColumnLabelsFromExerciseStartIso(budgetExercise.startDate);
    } catch {
      return undefined;
    }
  }, [budgetExercise?.startDate]);

  const exercisePeriodHint = useMemo((): string | null => {
    if (!budgetExercise?.startDate || !budgetExercise?.endDate) return null;
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const start = new Date(budgetExercise.startDate);
    const end = new Date(budgetExercise.endDate);
    return `Exercice ${fmt.format(start)} → ${fmt.format(end)} · 12 mois (mois 1 = premier mois d’exercice)`;
  }, [budgetExercise?.startDate, budgetExercise?.endDate]);

  return (
    <>
      {variant === 'page' && (
        <BudgetPageHeader
          title={isEdit ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'}
          description={
            <span className="flex flex-col gap-1">
              <span>
                {isEdit && line ? line.name : 'Créez une ligne pour ce budget.'}
              </span>
              {budget && (
                <span className="text-muted-foreground">
                  Responsable du budget :{' '}
                  <span className="font-medium text-foreground">
                    {budget.ownerUserName?.trim()
                      ? budget.ownerUserName
                      : '—'}
                  </span>
                </span>
              )}
            </span>
          }
        />
      )}
      <div className="space-y-6">
        <BudgetLineForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          cancelHref={variant === 'page' ? cancelHref : undefined}
          onCancel={variant === 'embedded' ? onCloseEmbedded : undefined}
          submitError={submitError}
          budgetId={resolvedBudgetId}
          budgetLabel={budgetLabel}
          isEdit={isEdit}
          budgetTaxMode={budget?.taxMode ?? 'HT'}
          envelopeOptions={envelopeOptions.map((e) => ({ id: e.id, name: e.name }))}
          envelopeOptionsLoading={isEnvelopeOptionsLoading}
          envelopeOptionsSuccess={isEnvelopeOptionsSuccess}
          generalLedgerOptions={generalLedgerOptions}
          hasPlanning
          monthColumnLabels={monthColumnLabels}
          exercisePeriodHint={exercisePeriodHint}
        />
      </div>
    </>
  );
}
