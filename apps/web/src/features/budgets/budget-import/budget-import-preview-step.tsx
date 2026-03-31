'use client';

import React, { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PreviewResult, PreviewRowResult } from '../types/budget-imports.types';
import { previewReasonLabel } from './budget-import-preview-reasons';

const PREVIEW_DISPLAY_CAP = 500;

export interface BudgetImportPreviewStepProps {
  preview: PreviewResult;
  errorMessage: string | null;
  isLoading: boolean;
  onContinue: () => void;
  onBack: () => void;
}

const frNumber = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDataCell(row: PreviewRowResult): string {
  const d = row.data;
  if (!d || typeof d !== 'object') return '—';
  const amount = d.amount ?? d.initialAmount;
  const name = d.name ?? d.label;
  const parts: string[] = [];
  if (amount != null && amount !== '') {
    const n = typeof amount === 'number' ? amount : Number(amount);
    parts.push(Number.isFinite(n) ? frNumber.format(n) : String(amount));
  }
  if (name != null && String(name).trim()) parts.push(String(name));
  return parts.length ? parts.join(' · ') : '—';
}

export function BudgetImportPreviewStep({
  preview,
  errorMessage,
  isLoading,
  onContinue,
  onBack,
}: BudgetImportPreviewStepProps) {
  const [errorsOnly, setErrorsOnly] = useState(false);

  const { rows, totalShown, isTruncated } = useMemo(() => {
    let list = preview.previewRows;
    if (errorsOnly) {
      list = list.filter((r) => r.status === 'ERROR');
    }
    const total = list.length;
    const capped = list.slice(0, PREVIEW_DISPLAY_CAP);
    return {
      rows: capped,
      totalShown: total,
      isTruncated: total > PREVIEW_DISPLAY_CAP,
    };
  }, [preview.previewRows, errorsOnly]);

  const s = preview.stats;

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-md border border-border px-3 py-2">
          <div className="text-muted-foreground">Total</div>
          <div className="font-semibold">{s.totalRows}</div>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <div className="text-muted-foreground">Création</div>
          <div className="font-semibold text-emerald-700">{s.createRows}</div>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <div className="text-muted-foreground">Mise à jour</div>
          <div className="font-semibold text-blue-700">{s.updateRows}</div>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <div className="text-muted-foreground">Ignorées</div>
          <div className="font-semibold">{s.skipRows}</div>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <div className="text-muted-foreground">Erreurs</div>
          <div className="font-semibold text-destructive">{s.errorRows}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border border-input"
            checked={errorsOnly}
            onChange={(e) => setErrorsOnly(e.target.checked)}
          />
          Erreurs uniquement
        </label>
      </div>

      {isTruncated ? (
        <Alert>
          <AlertDescription>
            Affichage des {PREVIEW_DISPLAY_CAP} premières lignes sur {totalShown}
            {errorsOnly ? ' (après filtre)' : ''}. Utilisez le filtre erreurs pour cibler les lignes en
            échec.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="max-h-[min(28rem,70vh)] overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ligne</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Détail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.rowIndex}>
                <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell className="max-w-[12rem] text-xs">
                  {previewReasonLabel(r.reason)}
                </TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                  {formatDataCell(r)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
          Retour au mapping
        </Button>
        <Button type="button" onClick={onContinue} disabled={isLoading}>
          Continuer vers l’exécution
        </Button>
      </div>
    </div>
  );
}
