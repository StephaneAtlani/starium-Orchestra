'use client';

import { useMemo, useState } from 'react';
import { Layers, Plus, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import type { BudgetImportOptionsConfig, PreviewResult } from '../types/budget-imports.types';
import type { BudgetEnvelope } from '../types/budget-management.types';
import { EMPTY_SELECT_VALUE } from './budget-import-field-labels';
import {
  countMissingEnvelopeWithoutCode,
  countNoMatchUpdateOnly,
  extractMissingEnvelopeGaps,
  type MissingEnvelopeGap,
} from './budget-import-preview-envelope-gaps';

const ENVELOPE_TYPE_LABELS: Record<string, string> = {
  RUN: 'RUN',
  BUILD: 'BUILD',
  TRANSVERSE: 'Transverse',
};

const ENVELOPE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé',
};

function envelopeLabel(e: BudgetEnvelope): string {
  if (e.code?.trim() && e.name?.trim()) {
    return `${e.code} — ${e.name}`;
  }
  return e.name?.trim() || e.code?.trim() || 'Enveloppe';
}

export interface BudgetImportPreviewRemediationProps {
  preview: PreviewResult;
  options: BudgetImportOptionsConfig;
  envelopes: BudgetEnvelope[];
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
  refreshing?: boolean;
}

type CreateDraft = {
  name: string;
  code: string;
  description: string;
  type: string;
  status: string;
  /** Si true, l’enveloppe créée devient l’enveloppe par défaut puis l’aperçu est recalculé. */
  setAsDefault: boolean;
};

export function BudgetImportPreviewRemediation({
  preview,
  options,
  envelopes,
  onCreateEnvelope,
  onSelectDefaultEnvelope,
  onRefreshPreview,
  onEditConfiguration,
  onSwitchToUpsert,
  refreshing = false,
}: BudgetImportPreviewRemediationProps) {
  const gaps = useMemo(
    () => extractMissingEnvelopeGaps(preview.previewRows),
    [preview.previewRows],
  );
  const missingDefaultCount = useMemo(
    () => countMissingEnvelopeWithoutCode(preview.previewRows),
    [preview.previewRows],
  );
  const noMatchUpdateCount = useMemo(
    () => countNoMatchUpdateOnly(preview.previewRows),
    [preview.previewRows],
  );
  const missingEnvelopeTotal = useMemo(
    () => preview.previewRows.filter((r) => r.reason === 'MISSING_ENVELOPE').length,
    [preview.previewRows],
  );

  const [namesByCode, setNamesByCode] = useState<Record<string, string>>({});
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectBusy, setSelectBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateDraft>({
    name: '',
    code: '',
    description: '',
    type: 'RUN',
    status: 'ACTIVE',
    setAsDefault: true,
  });

  const displayName = (code: string, suggested: string) =>
    namesByCode[code] ?? suggested;

  const openCreateModal = (prefill?: Partial<CreateDraft>) => {
    setCreateError(null);
    setDraft({
      name: prefill?.name ?? '',
      code: prefill?.code ?? '',
      description: prefill?.description ?? '',
      type: prefill?.type ?? 'RUN',
      status: prefill?.status ?? 'ACTIVE',
      setAsDefault: prefill?.setAsDefault ?? true,
    });
    setModalOpen(true);
  };

  const openCreateForGap = (gap: MissingEnvelopeGap) => {
    openCreateModal({
      name: displayName(gap.code, gap.suggestedName),
      code: gap.code,
      setAsDefault: false,
    });
  };

  const createOneQuick = async (code: string, suggestedName: string) => {
    setBusyCode(code);
    try {
      await onCreateEnvelope({
        name: displayName(code, suggestedName).trim() || suggestedName,
        code,
        type: 'RUN',
        status: 'ACTIVE',
      });
      toast.success(`Enveloppe « ${code} » créée`);
      await onRefreshPreview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setBusyCode(null);
    }
  };

  const createAll = async () => {
    if (gaps.length === 0) return;
    setBulkBusy(true);
    try {
      for (const gap of gaps) {
        await onCreateEnvelope({
          name: displayName(gap.code, gap.suggestedName).trim() || gap.suggestedName,
          code: gap.code,
          type: 'RUN',
          status: 'ACTIVE',
        });
      }
      toast.success(`${gaps.length} enveloppe(s) créée(s)`);
      await onRefreshPreview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Création groupée impossible');
    } finally {
      setBulkBusy(false);
    }
  };

  const submitCreateModal = async () => {
    if (!draft.name.trim()) {
      setCreateError('Le nom est obligatoire.');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await onCreateEnvelope({
        name: draft.name.trim(),
        code: draft.code.trim() || undefined,
        description: draft.description.trim() || undefined,
        type: draft.type,
        status: draft.status,
      });
      toast.success(`Enveloppe « ${envelopeLabel(created)} » créée`);
      setModalOpen(false);
      if (draft.setAsDefault) {
        onSelectDefaultEnvelope(created.id);
      } else {
        await onRefreshPreview();
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Impossible de créer l’enveloppe.');
    } finally {
      setCreateLoading(false);
    }
  };

  const applyDefaultEnvelope = (envelopeId: string) => {
    if (!envelopeId || envelopeId === EMPTY_SELECT_VALUE) return;
    setSelectBusy(true);
    try {
      onSelectDefaultEnvelope(envelopeId);
      toast.success('Enveloppe cible appliquée — recalcul de l’aperçu…');
    } finally {
      setSelectBusy(false);
    }
  };

  if (
    gaps.length === 0 &&
    missingDefaultCount === 0 &&
    noMatchUpdateCount === 0 &&
    missingEnvelopeTotal === 0
  ) {
    return null;
  }

  const selectedDefault =
    options.defaultEnvelopeId &&
    envelopes.find((e) => e.id === options.defaultEnvelopeId);

  const defaultSelectValue = options.defaultEnvelopeId ?? EMPTY_SELECT_VALUE;
  const defaultSelectLabel =
    defaultSelectValue === EMPTY_SELECT_VALUE
      ? 'Choisir une enveloppe existante'
      : selectedDefault
        ? envelopeLabel(selectedDefault)
        : 'Enveloppe';

  const showEnvelopePicker = missingEnvelopeTotal > 0;

  return (
    <section
      className="space-y-4 rounded-lg border border-border/70 bg-muted/30 p-4"
      aria-labelledby="import-preview-remediation-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="import-preview-remediation-title" className="text-sm font-semibold text-foreground">
            Corriger les erreurs avant import
          </h2>
          <p className="text-sm text-muted-foreground">
            Sélectionnez une enveloppe existante, créez-en une nouvelle, puis recalculez l’aperçu.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9 gap-1.5"
          disabled={refreshing || bulkBusy || !!busyCode || selectBusy}
          onClick={() => void onRefreshPreview()}
        >
          <RefreshCw className="size-4" aria-hidden />
          Recalculer l’aperçu
        </Button>
      </div>

      {showEnvelopePicker ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
          <p className="text-sm font-medium text-foreground">
            Enveloppe cible ({missingEnvelopeTotal} ligne
            {missingEnvelopeTotal > 1 ? 's' : ''} en erreur)
          </p>
          <p className="text-sm text-muted-foreground">
            Les lignes sans code reconnu utilisent cette enveloppe. Un code fichier inconnu bascule
            aussi dessus tant qu’il n’existe pas dans le budget.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="preview-default-envelope">Enveloppe existante</Label>
              <Select
                value={defaultSelectValue}
                onValueChange={(v) => {
                  if (v) applyDefaultEnvelope(v);
                }}
                disabled={
                  refreshing ||
                  selectBusy ||
                  bulkBusy ||
                  !!busyCode ||
                  envelopes.length === 0
                }
              >
                <SelectTrigger id="preview-default-envelope" className="min-h-11 w-full sm:min-h-9">
                  <SelectValue>{defaultSelectLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE} disabled>
                    Choisir une enveloppe existante
                  </SelectItem>
                  {envelopes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {envelopeLabel(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {envelopes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune enveloppe sur ce budget — créez-en une ci-dessous.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="min-h-11 shrink-0 gap-1.5 sm:min-h-9"
              disabled={refreshing || createLoading}
              onClick={() =>
                openCreateModal({
                  name: '',
                  code: gaps[0]?.code ?? '',
                  setAsDefault: true,
                })
              }
            >
              <Plus className="size-4" aria-hidden />
              Créer une enveloppe
            </Button>
          </div>
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Codes fichier introuvables ({gaps.length})
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 sm:min-h-9 gap-1.5"
              disabled={bulkBusy || !!busyCode || refreshing}
              onClick={() => void createAll()}
            >
              <Layers className="size-4" aria-hidden />
              {bulkBusy ? 'Création…' : `Créer les ${gaps.length} codes`}
            </Button>
          </div>
          <ul className="space-y-2">
            {gaps.map((gap) => (
              <li
                key={gap.code}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor={`env-name-${gap.code}`}>
                    Code fichier <span className="font-mono tabular-nums">{gap.code}</span>
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {gap.rowCount} ligne{gap.rowCount > 1 ? 's' : ''}
                    </span>
                  </Label>
                  <Input
                    id={`env-name-${gap.code}`}
                    value={displayName(gap.code, gap.suggestedName)}
                    onChange={(e) =>
                      setNamesByCode((prev) => ({ ...prev, [gap.code]: e.target.value }))
                    }
                    placeholder="Nom de l’enveloppe"
                    className="min-h-11 sm:min-h-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 sm:min-h-9"
                    disabled={busyCode === gap.code || bulkBusy || refreshing}
                    onClick={() => openCreateForGap(gap)}
                  >
                    Détails…
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 sm:min-h-9"
                    disabled={busyCode === gap.code || bulkBusy || refreshing}
                    onClick={() => void createOneQuick(gap.code, gap.suggestedName)}
                  >
                    {busyCode === gap.code ? 'Création…' : 'Créer'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {missingDefaultCount > 0 && !options.defaultEnvelopeId ? (
        <Alert>
          <AlertTitle>Lignes sans code enveloppe</AlertTitle>
          <AlertDescription>
            {missingDefaultCount} ligne{missingDefaultCount > 1 ? 's' : ''} sans code fichier :
            choisissez une enveloppe existante ci-dessus ou créez-en une.
          </AlertDescription>
        </Alert>
      ) : null}

      {noMatchUpdateCount > 0 ? (
        <Alert>
          <AlertTitle>Lignes budgétaires introuvables</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {noMatchUpdateCount} ligne{noMatchUpdateCount > 1 ? 's' : ''} en mode « mise à jour
              seule » sans correspondance existante. Passez en mode création + mise à jour pour
              les créer à l’import.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={refreshing || options.importMode === 'UPSERT'}
                onClick={onSwitchToUpsert}
              >
                Activer création + mise à jour
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={onEditConfiguration}
              >
                Modifier le mapping
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <StariumModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Créer une enveloppe"
        description="L’enveloppe est ajoutée au budget courant, puis l’aperçu peut être recalculé."
        icon={Layers}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={createLoading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={createLoading || !draft.name.trim()}
              onClick={() => void submitCreateModal()}
            >
              {createLoading ? 'Création…' : 'Créer l’enveloppe'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="preview-new-envelope-name">Nom</Label>
            <Input
              id="preview-new-envelope-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ex. RUN - Plateforme"
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preview-new-envelope-code">Code</Label>
            <Input
              id="preview-new-envelope-code"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              placeholder="Ex. ENV-RUN-01 (optionnel si généré)"
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preview-new-envelope-description">Description (optionnel)</Label>
            <Input
              id="preview-new-envelope-description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="preview-new-envelope-type">Type</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => v && setDraft((d) => ({ ...d, type: v }))}
              >
                <SelectTrigger id="preview-new-envelope-type" className="min-h-11 sm:min-h-9">
                  <SelectValue>{ENVELOPE_TYPE_LABELS[draft.type] ?? draft.type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENVELOPE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-new-envelope-status">État</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => v && setDraft((d) => ({ ...d, status: v }))}
              >
                <SelectTrigger id="preview-new-envelope-status" className="min-h-11 sm:min-h-9">
                  <SelectValue>
                    {ENVELOPE_STATUS_LABELS[draft.status] ?? draft.status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENVELOPE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3">
            <input
              id="preview-new-envelope-as-default"
              type="checkbox"
              className="mt-1 size-4 accent-[var(--brand-gold)]"
              checked={draft.setAsDefault}
              onChange={(e) => setDraft((d) => ({ ...d, setAsDefault: e.target.checked }))}
            />
            <Label htmlFor="preview-new-envelope-as-default" className="font-normal leading-snug">
              Utiliser comme enveloppe cible pour les lignes en erreur, puis recalculer l’aperçu
            </Label>
          </div>
          {createError ? (
            <p className="text-sm text-destructive" role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      </StariumModal>
    </section>
  );
}
