'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecuteResult, PreviewResult } from '../types/budget-imports.types';
import { budgetImportsTab } from '../constants/budget-routes';

export interface BudgetImportExecuteStepProps {
  previewStats: PreviewResult['stats'];
  executeResult: ExecuteResult | null;
  isExecuting: boolean;
  errorMessage: string | null;
  canExecute: boolean;
  readOnlyReason: string | null;
  budgetDetailHref: string;
  historyJobHref?: string | null;
  onExecute: () => void;
  onBack: () => void;
  onResetWizard: () => void;
}

export function BudgetImportExecuteStep({
  previewStats,
  executeResult,
  isExecuting,
  errorMessage,
  canExecute,
  readOnlyReason,
  budgetDetailHref,
  historyJobHref,
  onExecute,
  onBack,
  onResetWizard,
}: BudgetImportExecuteStepProps) {
  const profilesHref = budgetImportsTab('profiles');

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Exécution impossible</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {readOnlyReason && !canExecute ? (
        <Alert>
          <AlertDescription>{readOnlyReason}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">Récapitulatif de la prévisualisation</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-muted-foreground tabular-nums">
          <li>Créations : {previewStats.createRows}</li>
          <li>Mises à jour : {previewStats.updateRows}</li>
          <li>Ignorées : {previewStats.skipRows}</li>
          <li>Erreurs : {previewStats.errorRows}</li>
        </ul>
      </div>

      {!executeResult ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={onExecute}
            disabled={!canExecute || isExecuting}
          >
            {isExecuting ? 'Import en cours…' : 'Lancer l’import'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={onBack}
            disabled={isExecuting}
          >
            Retour à l’aperçu
          </Button>
        </div>
      ) : null}

      {executeResult ? (
        <div
          className="space-y-4 rounded-lg border border-border bg-[color:var(--state-success-bg)] p-4"
          aria-live="polite"
        >
          <p className="font-semibold text-foreground">Import terminé</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2 tabular-nums">
            <li>Créées : {executeResult.createdRows}</li>
            <li>Mises à jour : {executeResult.updatedRows}</li>
            <li>Ignorées : {executeResult.skippedRows}</li>
            <li>Erreurs : {executeResult.errorRows}</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={budgetDetailHref}
              className={cn(buttonVariants({ size: 'sm' }), 'min-h-11 sm:min-h-9')}
            >
              Retour au budget
            </Link>
            {historyJobHref ? (
              <Link
                href={historyJobHref}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'min-h-11 sm:min-h-9',
                )}
              >
                Voir dans l’historique
              </Link>
            ) : null}
            <Link
              href={profilesHref}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 sm:min-h-9',
              )}
            >
              Profils d’import
            </Link>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 sm:min-h-9"
              onClick={onResetWizard}
            >
              Nouvel import
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
