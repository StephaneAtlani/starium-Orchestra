'use client';

import Link from 'next/link';
import { BudgetPageHeader } from '../budget-page-header';
import { BudgetEmptyState } from '../budget-empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetEnvelopeForm } from '../forms/budget-envelope-form';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useQuery } from '@tanstack/react-query';
import { budgetQueryKeys } from '../../lib/budget-query-keys';
import { getEnvelope } from '../../api/budget-management.api';
import * as versioningApi from '../../api/budget-versioning.api';
import { useCreateBudgetEnvelope } from '../../hooks/use-create-budget-envelope';
import { useUpdateBudgetEnvelope } from '../../hooks/use-update-budget-envelope';
import { useBudgetDetail } from '../../hooks/use-budgets';
import { envelopeApiToForm } from '../../mappers/budget-form.mappers';
import { budgetDetail } from '../../constants/budget-routes';
import type { CreateEnvelopeInput } from '../../schemas/create-envelope.schema';
import type { ApiFormError } from '../../api/types';
import {
  budgetStructureBlockedReason,
  canMutateBudgetStructure,
} from '../../lib/budget-structure-mutations';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BudgetEnvelopeFormPageProps {
  mode: 'create' | 'edit';
  budgetId?: string;
  envelopeId?: string;
}

export function BudgetEnvelopeFormPage({ mode, budgetId, envelopeId }: BudgetEnvelopeFormPageProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const budgetDetailQuery = useBudgetDetail(mode === 'create' ? budgetId ?? null : null);
  const budgetForGuard = budgetDetailQuery.data;

  const versionSetIdForGuard = budgetForGuard?.versionSetId ?? null;
  const versionSetForGuard = useQuery({
    queryKey: budgetQueryKeys.budgetVersionSetDetail(clientId, versionSetIdForGuard ?? ''),
    queryFn: () => versioningApi.getVersionSetById(authFetch, versionSetIdForGuard!),
    enabled:
      !!clientId &&
      !!versionSetIdForGuard &&
      !!budgetForGuard &&
      !canMutateBudgetStructure(budgetForGuard),
  });

  const { data: envelope, isLoading, error, refetch } = useQuery({
    queryKey: ['budget-envelope-detail', clientId, envelopeId],
    queryFn: () => getEnvelope(authFetch, envelopeId!),
    enabled: mode === 'edit' && !!envelopeId && !!clientId,
  });

  const createMutation = useCreateBudgetEnvelope(budgetId ?? null);
  const updateMutation = useUpdateBudgetEnvelope(envelopeId ?? null, envelope?.budgetId ?? budgetId ?? null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  const resolvedBudgetId = budgetId ?? envelope?.budgetId;

  if (mode === 'create' && budgetId && budgetDetailQuery.isLoading) {
    return (
      <>
        <BudgetPageHeader title="Nouvelle enveloppe" description="Chargement du budget…" />
        <LoadingState rows={3} />
      </>
    );
  }

  if (mode === 'create' && budgetId && budgetDetailQuery.isError) {
    return (
      <>
        <BudgetPageHeader title="Nouvelle enveloppe" />
        <BudgetEmptyState title="Budget introuvable" description="" />
      </>
    );
  }

  if (
    mode === 'create' &&
    budgetId &&
    budgetForGuard &&
    !canMutateBudgetStructure(budgetForGuard)
  ) {
    const activeId = versionSetForGuard.data?.active?.id;
    const reason = budgetStructureBlockedReason(budgetForGuard);
    return (
      <>
        <BudgetPageHeader title="Nouvelle enveloppe" />
        <Alert variant="destructive" className="mt-4">
          <AlertDescription className="space-y-2">
            <p>{reason}</p>
            {activeId && activeId !== budgetForGuard.id ? (
              <p>
                <Link href={budgetDetail(activeId)} className="font-medium underline">
                  Ouvrir le budget de la version active
                </Link>
                {' · '}
                <Link href={`${budgetDetail(budgetForGuard.id)}/versions`} className="font-medium underline">
                  Voir la lignée des versions
                </Link>
              </p>
            ) : (
              <p>
                <Link href={`${budgetDetail(budgetForGuard.id)}/versions`} className="font-medium underline">
                  Voir la lignée des versions
                </Link>
              </p>
            )}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (isEdit && isLoading) {
    return (
      <>
        <BudgetPageHeader title="Modifier l'enveloppe" description="Chargement…" />
        <LoadingState rows={3} />
      </>
    );
  }

  if (isEdit && (error || (!isLoading && !envelope))) {
    return (
      <>
        <BudgetPageHeader title="Modifier l'enveloppe" />
        <BudgetEmptyState title="Aucune enveloppe à afficher" description="" />
      </>
    );
  }

  const defaultValues: Partial<CreateEnvelopeInput> = isEdit && envelope
    ? envelopeApiToForm(envelope)
    : resolvedBudgetId ? { budgetId: resolvedBudgetId } : {};

  const handleSubmit = (values: CreateEnvelopeInput) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const cancelHref = resolvedBudgetId ? budgetDetail(resolvedBudgetId) : '/budgets';

  return (
    <>
      <BudgetPageHeader
        title={isEdit ? "Modifier l'enveloppe" : 'Nouvelle enveloppe'}
        description={isEdit && envelope ? envelope.name : 'Créez une enveloppe pour ce budget.'}
      />
      <BudgetEnvelopeForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        cancelHref={cancelHref}
        submitError={submitError}
        budgetId={resolvedBudgetId}
      />
    </>
  );
}
