'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ExecuteResult, PreviewResult } from '../types/budget-imports.types';

export interface BudgetImportExecuteStepProps {
  previewStats: PreviewResult['stats'];
  executeResult: ExecuteResult | null;
  isExecuting: boolean;
  errorMessage: string | null;
  canExecute: boolean;
  readOnlyReason: string | null;
  budgetDetailHref: string;
  historyJobHref?: string | null;
  profilesHref?: string | null;
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
  profilesHref,
  onExecute,
  onBack,
  onResetWizard,
}: BudgetImportExecuteStepProps) {
  return (
    <div className="space-y-4">
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

      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
        <p className="font-medium">Récapitulatif prévisualisation</p>
        <ul className="mt-2 list-inside list-disc text-muted-foreground">
          <li>Créations : {previewStats.createRows}</li>
          <li>Mises à jour : {previewStats.updateRows}</li>
          <li>Ignorées : {previewStats.skipRows}</li>
          <li>Erreurs : {previewStats.errorRows}</li>
        </ul>
      </div>

      {!executeResult ? (
        <Button type="button" onClick={onExecute} disabled={!canExecute || isExecuting}>
          {isExecuting ? 'Import en cours…' : 'Lancer l’import'}
        </Button>
      ) : null}

      {executeResult ? (
        <div
          className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
          aria-live="polite"
        >
          <p className="font-semibold text-foreground">Import terminé</p>
          <ul className="text-sm">
            <li>Créées : {executeResult.createdRows}</li>
            <li>Mises à jour : {executeResult.updatedRows}</li>
            <li>Ignorées : {executeResult.skippedRows}</li>
            <li>Erreurs : {executeResult.errorRows}</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" asChild>
              <Link href={budgetDetailHref}>Retour au budget</Link>
            </Button>
            {historyJobHref ? (
              <Button type="button" variant="outline" asChild>
                <Link href={historyJobHref}>Voir dans l’historique</Link>
              </Button>
            ) : null}
            {profilesHref ? (
              <Button type="button" variant="ghost" asChild>
                <Link href={profilesHref}>Gérer les profils</Link>
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={onResetWizard}>
              Nouvel import
            </Button>
          </div>
        </div>
      ) : null}

      {!executeResult ? (
        <Button type="button" variant="outline" onClick={onBack} disabled={isExecuting}>
          Retour à la prévisualisation
        </Button>
      ) : null}
    </div>
  );
}
