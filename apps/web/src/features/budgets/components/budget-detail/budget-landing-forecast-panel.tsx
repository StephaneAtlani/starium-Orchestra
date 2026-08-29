'use client';

import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { BUDGET_LABELS } from '@/features/budgets/lib/budget-display-labels';
import {
  budgetDetail,
  budgetLineNew,
  budgetReallocations,
} from '@/features/budgets/constants/budget-routes';
import {
  useApplyLandingForecast,
  useLandingForecast,
  useValidateLandingForecast,
} from '@/features/budgets/hooks/use-landing-forecast';
import {
  useActivateBudgetEnvelope,
  useActivateBudgetLine,
  useSubmitBudgetEnvelope,
  useSubmitBudgetLine,
} from '@/features/budgets/hooks/use-budget-structural-lifecycle';
import { useBudgetEnvelopesAll } from '@/features/budgets/hooks/use-budget-envelopes';
import type { LandingForecastStatus } from '@/features/budgets/types/budget-landing-forecast.types';

const STATUS_LABEL: Record<LandingForecastStatus, string> = {
  NONE: 'Aucune session en cours',
  BASELINE_FROZEN: 'Avant figé — construisez le scénario',
  SCENARIO_FROZEN: 'Scénario figé — à comparer puis valider',
  VALIDATED: 'Validée — prête à activer',
  APPLIED: 'Activée sur le budget live',
};

export interface BudgetLandingForecastPanelProps {
  budgetId: string;
  onCreateSnapshot: (suggestedOccasionCode: 'PA_BASELINE' | 'PA_ARBITRATED') => void;
}

export function BudgetLandingForecastPanel({
  budgetId,
  onCreateSnapshot,
}: BudgetLandingForecastPanelProps) {
  const { has } = usePermissions();
  const query = useLandingForecast(budgetId);
  const validateMutation = useValidateLandingForecast(budgetId);
  const applyMutation = useApplyLandingForecast(budgetId);
  const canUpdate = has('budgets.update');
  const canApply = has('budgets.landing_forecast.apply');
  const envelopesQuery = useBudgetEnvelopesAll(budgetId);
  const submitLine = useSubmitBudgetLine();
  const activateLine = useActivateBudgetLine();
  const submitEnvelope = useSubmitBudgetEnvelope();
  const activateEnvelope = useActivateBudgetEnvelope();

  if (query.isLoading) {
    return <LoadingState rows={4} />;
  }
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message="Impossible de charger l’état de la session."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const state = query.data;
  const status = state.status;
  const stepDone = {
    1: status !== 'NONE' || Boolean(state.baseline),
    2: status === 'SCENARIO_FROZEN' || status === 'VALIDATED' || status === 'APPLIED',
    3: Boolean(state.arbitrated),
    4: Boolean(state.arbitrated),
    5: status === 'VALIDATED' || status === 'APPLIED',
    6: status === 'APPLIED',
  };

  const compareHref = state.arbitrated
    ? `${budgetDetail(budgetId)}?onglet=comparaisons&compareTo=snapshot&targetId=${encodeURIComponent(state.arbitrated.id)}`
    : `${budgetDetail(budgetId)}?onglet=comparaisons`;

  return (
    <section className="starium-module space-y-4" data-testid="budget-landing-forecast-panel">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {BUDGET_LABELS.landingForecastExercise}
        </h2>
        <p className="text-sm text-muted-foreground">
          Rituel CODIR : figer l’avant, construire le scénario, comparer, valider, puis activer.
          Distinct du KPI {BUDGET_LABELS.landing} et du plan 12 mois (
          {BUDGET_LABELS.planningTab}).
        </p>
      </div>

      <p className="text-sm font-medium text-foreground" aria-live="polite">
        {STATUS_LABEL[status]}
        {state.staleSession
          ? ' — session périmée : re-figez une version avant pour reprendre.'
          : ''}
      </p>

      {state.staleSession ? (
        <Alert>
          <AlertDescription>
            La version figée de session n’est plus active. Reprenez en enregistrant un nouvel
            avant ({BUDGET_LABELS.landingForecastExerciseShort}).
          </AlertDescription>
        </Alert>
      ) : null}

      <ol className="space-y-3">
        <li className="rounded-lg border border-border/70 bg-card p-4">
          <p className="font-medium text-foreground">1. Figer l’avant</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Photo de référence avant arbitrage
            {state.baseline
              ? ` — ${displayLabel(state.baseline.name, 'Version figée')}`
              : '.'}
          </p>
          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-11 sm:min-h-9"
              onClick={() => onCreateSnapshot('PA_BASELINE')}
            >
              Enregistrer l’avant
            </Button>
          ) : null}
        </li>
        <li className="rounded-lg border border-border/70 bg-card p-4">
          <p className="font-medium text-foreground">2. Construire le scénario</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajouts structurels, plan 12 mois, réallocations — hors rituel d’activation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={budgetLineNew(budgetId)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 sm:min-h-9')}
            >
              Nouvelle ligne
            </Link>
            <Link
              href={`${budgetDetail(budgetId)}?onglet=previsionnel`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 sm:min-h-9')}
            >
              Plan 12 mois
            </Link>
            <Link
              href={budgetReallocations(budgetId)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 sm:min-h-9')}
            >
              Réallocations
            </Link>
          </div>
        </li>
        <li className="rounded-lg border border-border/70 bg-card p-4">
          <p className="font-medium text-foreground">3. Figer le scénario arbitré</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.arbitrated
              ? displayLabel(state.arbitrated.name, 'Scénario figé')
              : 'Aucune version de scénario pour cette session.'}
          </p>
          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 min-h-11 sm:min-h-9"
              onClick={() => onCreateSnapshot('PA_ARBITRATED')}
            >
              Enregistrer le scénario
            </Button>
          ) : null}
        </li>
        <li className="rounded-lg border border-border/70 bg-card p-4">
          <p className="font-medium text-foreground">4. Comparer live vs scénario</p>
          <Link
            href={compareHref}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'mt-3 inline-flex min-h-11 sm:min-h-9',
            )}
          >
            Ouvrir la comparaison
          </Link>
        </li>
        <li className="rounded-lg border border-border/70 bg-card p-4">
          <p className="font-medium text-foreground">5. Valider le scénario</p>
          {canUpdate ? (
            <Button
              type="button"
              size="sm"
              className="mt-3 min-h-11 sm:min-h-9"
              disabled={!state.arbitrated || status === 'APPLIED' || validateMutation.isPending}
              onClick={() => {
                if (!state.arbitrated) return;
                validateMutation.mutate(state.arbitrated.id, {
                  onSuccess: () => toast.success('Scénario validé'),
                  onError: (err) =>
                    toast.error('Validation impossible', { description: (err as Error).message }),
                });
              }}
            >
              Valider
            </Button>
          ) : null}
        </li>
        <li className="rounded-lg border border-border/70 bg-card p-4">
          <p className="font-medium text-foreground">6. Activer sur le live</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Recopie le plan 12 mois et active les lignes en attente présentes dans le scénario.
          </p>
          {canApply ? (
            <Button
              type="button"
              size="sm"
              className="mt-3 min-h-11 sm:min-h-9"
              disabled={status !== 'VALIDATED' || !state.arbitrated || applyMutation.isPending}
              onClick={() => {
                if (!state.arbitrated) return;
                applyMutation.mutate(state.arbitrated.id, {
                  onSuccess: () => toast.success('Prévision d’atterrissage activée'),
                  onError: (err) =>
                    toast.error('Activation impossible', { description: (err as Error).message }),
                });
              }}
            >
              Activer
            </Button>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Permission d’activation requise.
            </p>
          )}
        </li>
      </ol>

      {state.pendingStructuralLines.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Lignes en attente</h3>
          <ul className="space-y-2 text-sm">
            {state.pendingStructuralLines.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">
                    {displayLabel(line.name, 'Ligne sans nom')}
                  </span>
                  <span className="text-muted-foreground">
                    {' — '}
                    {displayLabel(line.description, 'Sans justification')}
                  </span>
                </div>
                {canUpdate ? (
                  <div className="flex flex-wrap gap-2">
                    {line.status === 'DRAFT' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        disabled={submitLine.isPending}
                        onClick={() => submitLine.mutate(line.id)}
                      >
                        Soumettre
                      </Button>
                    ) : null}
                    {line.status === 'PENDING_VALIDATION' ? (
                      <Button
                        type="button"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        disabled={activateLine.isPending}
                        onClick={() => activateLine.mutate(line.id)}
                      >
                        Activer
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(envelopesQuery.data ?? []).some(
        (env) => env.status === 'DRAFT' || env.status === 'PENDING_VALIDATION',
      ) ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Enveloppes en attente</h3>
          <ul className="space-y-2 text-sm">
            {(envelopesQuery.data ?? [])
              .filter(
                (env) => env.status === 'DRAFT' || env.status === 'PENDING_VALIDATION',
              )
              .map((env) => (
                <li
                  key={env.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {displayLabel(env.name, 'Enveloppe sans nom')}
                    </span>
                    <span className="text-muted-foreground">
                      {' — '}
                      {displayLabel(env.description, 'Sans justification')}
                    </span>
                  </div>
                  {canUpdate ? (
                    <div className="flex flex-wrap gap-2">
                      {env.status === 'DRAFT' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 sm:min-h-9"
                          disabled={submitEnvelope.isPending}
                          onClick={() => submitEnvelope.mutate(env.id)}
                        >
                          Soumettre
                        </Button>
                      ) : null}
                      {env.status === 'PENDING_VALIDATION' ? (
                        <Button
                          type="button"
                          size="sm"
                          className="min-h-11 sm:min-h-9"
                          disabled={activateEnvelope.isPending}
                          onClick={() => activateEnvelope.mutate(env.id)}
                        >
                          Activer l’enveloppe
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Activer une enveloppe ne valide pas ses lignes.
          </p>
        </div>
      ) : null}

      <p className="sr-only">
        Étapes complétées :{' '}
        {Object.values(stepDone)
          .map((d, i) => (d ? i + 1 : null))
          .filter(Boolean)
          .join(', ') || 'aucune'}
      </p>
    </section>
  );
}
