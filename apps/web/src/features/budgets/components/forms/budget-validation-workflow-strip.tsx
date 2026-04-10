'use client';

import { ChevronRight } from 'lucide-react';
import {
  BUDGET_WORKFLOW_STATUSES,
  BUDGET_WORKFLOW_STATUS_LABELS,
  type BudgetWorkflowStatus,
} from '../../constants/budget-workflow-status';

type Props = {
  /** Statut budget affiché dans le formulaire (select Pilotage). */
  currentStatus: BudgetWorkflowStatus | undefined;
};

/**
 * Frise du cycle nominal budget : repère visuel du statut courant (pas une barre de progression stricte — des retours arrière sont possibles côté API).
 */
export function BudgetValidationWorkflowStrip({ currentStatus }: Props) {
  const active = currentStatus ?? 'DRAFT';

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center gap-x-1 gap-y-2"
        role="list"
        aria-label="Workflow de validation du budget"
      >
        {BUDGET_WORKFLOW_STATUSES.map((status, i) => {
          const isCurrent = status === active;
          return (
            <div key={status} className="flex items-center gap-1" role="listitem">
              {i > 0 && (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground/60"
                  aria-hidden
                />
              )}
              <span
                className={
                  isCurrent
                    ? 'rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/25'
                    : 'rounded-md px-2.5 py-1 text-xs text-muted-foreground'
                }
              >
                {BUDGET_WORKFLOW_STATUS_LABELS[status]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Parcours type : construction → soumission → arbitrage / révisions → validation → gel → archivage. Les
        changements de statut autorisés dépendent de la situation (révision, resoumission, réouverture) — le select
        « Statut » ne propose que les transitions possibles.
      </p>
      <dl className="grid gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:grid-cols-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium text-foreground">Budget initial</dt>
          <dd className="sm:min-w-0">correspond au statut « Soumis » (première version transmise à l’arbitrage).</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium text-foreground">Statut « Révisé »</dt>
          <dd className="sm:min-w-0">étape du workflow (itérations après retours), distinct du montant budgétaire.</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium text-foreground">Baseline</dt>
          <dd className="sm:min-w-0">correspond au budget au statut « Validé » — référence de pilotage retenue.</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Pour passer le budget en « Validé », <strong className="font-medium text-foreground">chaque enveloppe</strong>{' '}
        doit avoir quitté le statut brouillon (aucune enveloppe en « Brouillon »).
      </p>
    </div>
  );
}
