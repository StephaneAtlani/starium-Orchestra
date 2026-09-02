'use client';

import React, { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PreviewReason, PreviewResult, PreviewRowResult } from '../types/budget-imports.types';
import { previewReasonLabel } from './budget-import-preview-reasons';
import { envelopeCodeFromPreviewRow } from './budget-import-preview-envelope-gaps';
import { BudgetImportPreviewRemediation } from './budget-import-preview-remediation';
import type { BudgetImportOptionsConfig } from '../types/budget-imports.types';
import type { BudgetEnvelope } from '../types/budget-management.types';

const PREVIEW_DISPLAY_CAP = 500;

export type PreviewErrorCategory = 'all' | 'envelope' | 'amounts' | 'match' | 'ok';
export type PreviewDocumentKindFilter = 'all' | 'ORDER' | 'INVOICE' | 'none';

function categoryForReason(reason: PreviewReason | undefined, status: string): PreviewErrorCategory {
  if (status !== 'ERROR') return 'ok';
  switch (reason) {
    case 'MISSING_ENVELOPE':
      return 'envelope';
    case 'WILL_CREATE_ENVELOPE':
      return 'ok';
    case 'INVALID_AMOUNT':
    case 'INVALID_DATE':
    case 'MISSING_REQUIRED_FIELD':
      return 'amounts';
    case 'DUPLICATE_SOURCE_KEY':
    case 'AMBIGUOUS_MATCH':
    case 'MATCHED_BY_EXTERNAL_ID':
    case 'MATCHED_BY_COMPOSITE_KEY':
    case 'NO_MATCH_CREATE':
    case 'NO_MATCH_UPDATE_ONLY':
      return 'match';
    default:
      return 'amounts';
  }
}

const CATEGORY_LABELS: Record<PreviewErrorCategory, string> = {
  all: 'Toutes',
  envelope: 'Enveloppe',
  amounts: 'Montants / champs',
  match: 'Correspondance',
  ok: 'Sans erreur',
};

const DOC_KIND_FILTER_LABELS: Record<PreviewDocumentKindFilter, string> = {
  all: 'Tous documents',
  ORDER: 'Commandes (CD)',
  INVOICE: 'Factures (FA)',
  none: 'Sans type',
};

const frNumber = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function previewStatusLabel(status: PreviewRowResult['status']): string {
  switch (status) {
    case 'CREATE':
      return 'Création';
    case 'UPDATE':
      return 'Mise à jour';
    case 'SKIP':
      return 'Ignorée';
    case 'ERROR':
      return 'Erreur';
    default:
      return status;
  }
}

function formatDataCell(row: PreviewRowResult): string {
  const d = row.data;
  if (!d || typeof d !== 'object') return '—';
  const parts: string[] = [];
  const willCreate = d._willCreateEnvelopeCode;
  if (willCreate != null && String(willCreate).trim()) {
    const nm = d._willCreateEnvelopeName;
    parts.push(
      nm != null && String(nm).trim()
        ? `Nouvelle enveloppe : ${willCreate} — ${nm}`
        : `Nouvelle enveloppe : ${willCreate}`,
    );
  } else {
    const envCode = envelopeCodeFromPreviewRow(row);
    if (envCode) parts.push(`Enveloppe fichier : ${envCode}`);
  }
  const docKind = d.documentKind;
  const docRef = d.documentRef;
  if (docKind === 'ORDER') {
    parts.push(docRef ? `Commande : ${docRef}` : 'Commande');
  } else if (docKind === 'INVOICE') {
    parts.push(docRef ? `Facture : ${docRef}` : 'Facture');
  }
  const committed = d.committedAmount;
  const consumed = d.consumedAmount;
  if (committed != null && committed !== '') {
    const n = typeof committed === 'number' ? committed : Number(committed);
    if (Number.isFinite(n)) parts.push(`Engagé ${frNumber.format(n)}`);
  }
  if (consumed != null && consumed !== '') {
    const n = typeof consumed === 'number' ? consumed : Number(consumed);
    if (Number.isFinite(n)) parts.push(`Consommé ${frNumber.format(n)}`);
  }
  const amount = d.amount ?? d.initialAmount;
  const name = d.name ?? d.label;
  if (amount != null && amount !== '') {
    const n = typeof amount === 'number' ? amount : Number(amount);
    parts.push(Number.isFinite(n) ? frNumber.format(n) : String(amount));
  }
  if (name != null && String(name).trim()) parts.push(String(name));
  return parts.length ? parts.join(' · ') : '—';
}

export interface BudgetImportPreviewStepProps {
  preview: PreviewResult;
  options: BudgetImportOptionsConfig;
  envelopes: BudgetEnvelope[];
  errorMessage: string | null;
  isLoading: boolean;
  ordersSectionEnabled?: boolean;
  invoicesSectionEnabled?: boolean;
  onCreateEnvelope: (input: {
    name: string;
    code?: string;
    description?: string;
    type: string;
    status: string;
  }) => Promise<BudgetEnvelope>;
  onSelectDefaultEnvelope: (envelopeId: string) => void;
  onRefreshPreview: () => Promise<void>;
  onEditConfiguration: () => void;
  onSwitchToUpsert: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function BudgetImportPreviewStep({
  preview,
  options,
  envelopes,
  errorMessage,
  isLoading,
  ordersSectionEnabled = false,
  invoicesSectionEnabled = false,
  onCreateEnvelope,
  onSelectDefaultEnvelope,
  onRefreshPreview,
  onEditConfiguration,
  onSwitchToUpsert,
  onContinue,
  onBack,
}: BudgetImportPreviewStepProps) {
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [category, setCategory] = useState<PreviewErrorCategory>('all');
  const [docKindFilter, setDocKindFilter] = useState<PreviewDocumentKindFilter>('all');

  const showDocKindFilters = useMemo(
    () =>
      preview.previewRows.some(
        (r) => r.data?.documentKind === 'ORDER' || r.data?.documentKind === 'INVOICE',
      ),
    [preview.previewRows],
  );

  const { rows, totalShown, isTruncated } = useMemo(() => {
    let list = preview.previewRows;
    if (errorsOnly) {
      list = list.filter((r) => r.status === 'ERROR');
    }
    if (category !== 'all' && category !== 'ok') {
      list = list.filter((r) => categoryForReason(r.reason, r.status) === category);
    }
    if (category === 'ok') {
      list = list.filter((r) => r.status !== 'ERROR');
    }
    if (docKindFilter === 'ORDER' || docKindFilter === 'INVOICE') {
      list = list.filter((r) => r.data?.documentKind === docKindFilter);
    } else if (docKindFilter === 'none') {
      list = list.filter(
        (r) => r.data?.documentKind !== 'ORDER' && r.data?.documentKind !== 'INVOICE',
      );
    }
    const total = list.length;
    const capped = list.slice(0, PREVIEW_DISPLAY_CAP);
    return {
      rows: capped,
      totalShown: total,
      isTruncated: total > PREVIEW_DISPLAY_CAP,
    };
  }, [preview.previewRows, errorsOnly, category, docKindFilter]);

  const s = preview.stats;

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {preview.warnings?.length ? (
        <Alert>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {(ordersSectionEnabled || invoicesSectionEnabled) && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Fichier configuré avec :</span>
          {ordersSectionEnabled ? (
            <Badge variant="secondary">Données commande</Badge>
          ) : null}
          {invoicesSectionEnabled ? (
            <Badge variant="secondary">Données facture</Badge>
          ) : null}
        </div>
      )}

      {s.errorRows > 0 ? (
        <BudgetImportPreviewRemediation
          preview={preview}
          options={options}
          envelopes={envelopes}
          onCreateEnvelope={onCreateEnvelope}
          onSelectDefaultEnvelope={onSelectDefaultEnvelope}
          onRefreshPreview={onRefreshPreview}
          onEditConfiguration={onEditConfiguration}
          onSwitchToUpsert={onSwitchToUpsert}
          refreshing={isLoading}
        />
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border border-input"
            checked={errorsOnly}
            onChange={(e) => setErrorsOnly(e.target.checked)}
          />
          Erreurs uniquement
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Regrouper par :</span>
          {(Object.keys(CATEGORY_LABELS) as PreviewErrorCategory[]).map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={category === c ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </Button>
          ))}
        </div>
      </div>

      {showDocKindFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Type document :</span>
          {(Object.keys(DOC_KIND_FILTER_LABELS) as PreviewDocumentKindFilter[]).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={docKindFilter === k ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setDocKindFilter(k)}
            >
              {DOC_KIND_FILTER_LABELS[k]}
            </Button>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Les groupes sont dérivés côté interface à partir des motifs API
        {showDocKindFilters
          ? ' ; le filtre CD/FA utilise documentKind renvoyé par la normalisation.'
          : ' (pas de blocs commandes/factures distincts dans la réponse).'}
      </p>

      {isTruncated ? (
        <Alert>
          <AlertDescription>
            Affichage des {PREVIEW_DISPLAY_CAP} premières lignes sur {totalShown}
            {errorsOnly ? ' (après filtre)' : ''}. Utilisez les filtres pour cibler les lignes.
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
                <TableCell className="text-xs">{previewStatusLabel(r.status)}</TableCell>
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
          Retour à la configuration
        </Button>
        <Button type="button" onClick={onContinue} disabled={isLoading}>
          Passer à l’exécution
        </Button>
      </div>
    </div>
  );
}
