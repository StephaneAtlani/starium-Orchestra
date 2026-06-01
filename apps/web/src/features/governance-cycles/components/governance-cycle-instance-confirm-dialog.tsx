'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type GovernanceCycleInstanceConfirmAction = 'cancel' | 'close';

const COPY: Record<
  GovernanceCycleInstanceConfirmAction,
  { title: string; confirmLabel: string; destructive?: boolean }
> = {
  cancel: {
    title: 'Annuler la séance',
    confirmLabel: 'Annuler la séance',
    destructive: true,
  },
  close: {
    title: 'Clôturer la séance',
    confirmLabel: 'Clôturer la séance',
    destructive: false,
  },
};

export function GovernanceCycleInstanceConfirmDialog({
  open,
  onOpenChange,
  action,
  sessionLabel,
  agendaCount,
  incompleteDecisionCount = 0,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: GovernanceCycleInstanceConfirmAction | null;
  sessionLabel: string;
  agendaCount: number;
  incompleteDecisionCount?: number;
  isPending?: boolean;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const { title, confirmLabel, destructive } = COPY[action];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Séance :{' '}
                <span className="font-medium text-foreground">{sessionLabel}</span>
              </p>
              {action === 'cancel' ? (
                <p>
                  Cette action est irréversible. Aucune décision portefeuille ne sera enregistrée
                  ni propagée. L&apos;ordre du jour ({agendaCount} point
                  {agendaCount > 1 ? 's' : ''}) restera consultable à titre informatif.
                </p>
              ) : (
                <>
                  <p>
                    Les décisions de séance seront figées et reportées comme{' '}
                    <strong>dernière décision connue</strong> sur les éléments du cycle. La
                    propagation vers les fiches projet ou budget dépend de la configuration du
                    programme.
                  </p>
                  {incompleteDecisionCount > 0 ? (
                    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
                      {incompleteDecisionCount} point
                      {incompleteDecisionCount > 1 ? 's' : ''} de l&apos;ordre du jour n&apos;a
                      pas de décision finale enregistrée — la clôture sera refusée par le serveur
                      si un point est encore au statut Candidat.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Retour
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
