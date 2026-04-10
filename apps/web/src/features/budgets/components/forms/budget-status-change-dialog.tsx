'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  BUDGET_WORKFLOW_STATUS_LABELS,
  type BudgetWorkflowStatus,
} from '../../constants/budget-workflow-status';
import { getBudgetStatusTransitionImplications } from '../../constants/budget-status-transition-copy';
import type { ChildWorkflowCascadeCounts } from '../../types/budget-management.types';
import { budgetStatusChangeNeedsCascadeConfirmation } from '../../lib/budget-cascade-confirmation';

interface BudgetStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: BudgetWorkflowStatus;
  to: BudgetWorkflowStatus;
  counts: ChildWorkflowCascadeCounts;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function BudgetStatusChangeDialog({
  open,
  onOpenChange,
  from,
  to,
  counts,
  isSubmitting,
  onConfirm,
}: BudgetStatusChangeDialogProps) {
  const needsCascade = budgetStatusChangeNeedsCascadeConfirmation(from, to, counts);
  const implications = getBudgetStatusTransitionImplications(from, to);

  const cascadeSubmit =
    to === 'SUBMITTED' && from === 'DRAFT'
      ? {
          title: 'Enveloppes et lignes en brouillon',
          body:
            'Les enveloppes et les lignes encore en brouillon passeront à l’état « À valider » (aligné sur la soumission du budget). Les éléments déjà rejetés, reportés ou verrouillés ne sont pas modifiés.',
        }
      : to === 'VALIDATED' && (from === 'SUBMITTED' || from === 'REVISED')
        ? {
            title: 'Enveloppes et lignes à finaliser',
            body:
              'Les enveloppes et les lignes en brouillon ou « À valider » passeront à l’état « Actif ». Les éléments déjà rejetés, reportés ou verrouillés ne sont pas modifiés.',
          }
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>Changement de statut du budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              {BUDGET_WORKFLOW_STATUS_LABELS[from]}
            </span>
            {' → '}
            <span className="font-medium text-foreground">
              {BUDGET_WORKFLOW_STATUS_LABELS[to]}
            </span>
          </p>
          <p className="text-foreground/90">{implications}</p>
          {needsCascade && cascadeSubmit && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="font-medium text-foreground">{cascadeSubmit.title}</p>
              <p>{cascadeSubmit.body}</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                {counts.draftEnvelopeCount > 0 && (
                  <li>
                    Enveloppes en brouillon :{' '}
                    <span className="font-medium tabular-nums">{counts.draftEnvelopeCount}</span>
                  </li>
                )}
                {to === 'VALIDATED' && counts.pendingValidationEnvelopeCount > 0 && (
                  <li>
                    Enveloppes « À valider » :{' '}
                    <span className="font-medium tabular-nums">
                      {counts.pendingValidationEnvelopeCount}
                    </span>
                  </li>
                )}
                {counts.draftLineCount > 0 && (
                  <li>
                    Lignes en brouillon :{' '}
                    <span className="font-medium tabular-nums">{counts.draftLineCount}</span>
                  </li>
                )}
                {to === 'VALIDATED' && counts.pendingValidationLineCount > 0 && (
                  <li>
                    Lignes « À valider » :{' '}
                    <span className="font-medium tabular-nums">
                      {counts.pendingValidationLineCount}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
