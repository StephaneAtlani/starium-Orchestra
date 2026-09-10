'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { displayLabel } from '@/lib/display-label';
import type { FinalizeChecklistResult } from '../lib/review-finalize-checklist';

type Props = {
  checklist: FinalizeChecklistResult;
  pushActionsToTasks: boolean;
  promoteRiskNotes: boolean;
  onPushActionsChange: (value: boolean) => void;
  onPromoteRisksChange: (value: boolean) => void;
  onFocusTab: (tab: 'decisions' | 'actions') => void;
};

export function ProjectReviewFinalizeChecklist({
  checklist,
  pushActionsToTasks,
  promoteRiskNotes,
  onPushActionsChange,
  onPromoteRisksChange,
  onFocusTab,
}: Props) {
  const gaps =
    checklist.openArbitrationsWithoutVerdictCount +
    checklist.openActionsWithoutOwnerOrDueCount;
  const eligibleCount = checklist.eligibleActionTitles.length;
  const riskCount = checklist.riskNoteTitles.length;

  return (
    <section
      className="mb-3 shrink-0 space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4"
      aria-labelledby="finalize-checklist-title"
    >
      <h2
        id="finalize-checklist-title"
        className="text-sm font-semibold text-foreground"
      >
        Contrôles avant finalisation
      </h2>

      {gaps === 0 ? (
        <Alert className="border-[color:var(--state-success)]/40 bg-[color:var(--state-success-bg)]">
          <CheckCircle2 className="size-4 text-[color:var(--state-success)]" aria-hidden />
          <AlertTitle>Prêt à finaliser</AlertTitle>
          <AlertDescription>
            Aucun arbitrage sans verdict ni action incomplète détecté.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-[color:var(--state-warning)]/50 bg-[color:var(--state-warning-bg)]">
          <AlertTriangle className="size-4 text-[color:var(--state-warning)]" aria-hidden />
          <AlertTitle>Points à vérifier (non bloquant)</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
              {checklist.openArbitrationsWithoutVerdictCount > 0 ? (
                <li>
                  {checklist.openArbitrationsWithoutVerdictCount} arbitrage
                  {checklist.openArbitrationsWithoutVerdictCount > 1 ? 's' : ''}{' '}
                  sans verdict
                </li>
              ) : null}
              {checklist.openActionsWithoutOwnerOrDueCount > 0 ? (
                <li>
                  {checklist.openActionsWithoutOwnerOrDueCount} action
                  {checklist.openActionsWithoutOwnerOrDueCount > 1 ? 's' : ''}{' '}
                  incomplète
                  {checklist.openActionsWithoutOwnerOrDueCount > 1 ? 's' : ''}{' '}
                  (porteur ou échéance)
                </li>
              ) : null}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {checklist.openArbitrationsWithoutVerdictCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onFocusTab('decisions')}
                >
                  Voir les décisions
                </Button>
              ) : null}
              {checklist.openActionsWithoutOwnerOrDueCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onFocusTab('actions')}
                >
                  Voir les actions
                </Button>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 border-t border-border/60 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          À la finalisation
        </p>
        <div className="flex items-start gap-3">
          <Checkbox
            id="finalize-push-actions"
            checked={pushActionsToTasks}
            disabled={eligibleCount === 0}
            onCheckedChange={(v) => onPushActionsChange(v)}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <Label htmlFor="finalize-push-actions" className="text-sm font-medium leading-snug">
              Créer les tâches projet pour les actions non liées
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {eligibleCount === 0
                ? 'Aucun candidat'
                : `${eligibleCount} candidat${eligibleCount > 1 ? 's' : ''} : ${checklist.eligibleActionTitles
                    .map((t) => displayLabel(t, 'Action'))
                    .join(', ')}`}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="finalize-promote-risks"
            checked={promoteRiskNotes}
            disabled={riskCount === 0}
            onCheckedChange={(v) => onPromoteRisksChange(v)}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <Label htmlFor="finalize-promote-risks" className="text-sm font-medium leading-snug">
              Promouvoir les notes « Risque : » vers le registre
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {riskCount === 0
                ? 'Aucun candidat'
                : `${riskCount} candidat${riskCount > 1 ? 's' : ''} : ${checklist.riskNoteTitles
                    .map((t) => displayLabel(t, 'Risque'))
                    .join(', ')}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Initialise les cases opt-in quand les candidats changent (coché ssi count > 0). */
export function useFinalizeOptInDefaults(checklist: FinalizeChecklistResult): {
  pushActionsToTasks: boolean;
  promoteRiskNotes: boolean;
  setPushActionsToTasks: (v: boolean) => void;
  setPromoteRiskNotes: (v: boolean) => void;
} {
  const [pushActionsToTasks, setPushActionsToTasks] = useState(
    checklist.eligibleActionTitles.length > 0,
  );
  const [promoteRiskNotes, setPromoteRiskNotes] = useState(
    checklist.riskNoteTitles.length > 0,
  );

  useEffect(() => {
    setPushActionsToTasks(checklist.eligibleActionTitles.length > 0);
  }, [checklist.eligibleActionTitles.length]);

  useEffect(() => {
    setPromoteRiskNotes(checklist.riskNoteTitles.length > 0);
  }, [checklist.riskNoteTitles.length]);

  return {
    pushActionsToTasks,
    promoteRiskNotes,
    setPushActionsToTasks,
    setPromoteRiskNotes,
  };
}
