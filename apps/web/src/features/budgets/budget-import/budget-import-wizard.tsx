'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { useBudgetDetail } from '../hooks/use-budgets';
import { useBudgetEnvelopesAll } from '../hooks/use-budget-envelopes';
import {
  analyzeImport,
  analyzeImportSheet,
  createBudgetImportMapping,
  deleteBudgetImportMapping,
  executeImport,
  listBudgetImportMappings,
  previewImport,
  updateBudgetImportMapping,
} from '../api/budget-imports.api';
import type {
  AnalyzeResult,
  BudgetImportOptionsConfig,
  ExecuteResult,
  MappingConfig,
  PreviewResult,
} from '../types/budget-imports.types';
import {
  inferEnvelopeImportModeFromMapping,
  validateMappingForPreview,
  type EnvelopeImportMode,
} from './budget-import-mapping-validation';
import { guessMappingFromColumnHeaders } from './budget-import-guess-mapping';
import { BudgetImportUploadStep } from './budget-import-upload-step';
import { BudgetImportMappingStep } from './budget-import-mapping-step';
import { BudgetImportPreviewStep } from './budget-import-preview-step';
import { BudgetImportExecuteStep } from './budget-import-execute-step';
import { budgetDetail } from '../constants/budget-routes';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'execute';

function errMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Une erreur est survenue.';
}

/** Onglet Excel à envoyer au preview / execute (aligné sur l’analyse). */
function sheetNameForImportPayload(ar: AnalyzeResult): string | undefined {
  if (ar.sourceType !== 'XLSX') return undefined;
  return ar.activeSheetName ?? ar.sheetNames?.[0];
}

export interface BudgetImportWizardProps {
  budgetId: string;
}

export function BudgetImportWizard({ budgetId }: BudgetImportWizardProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permLoading } = usePermissions();

  const hasRead = has('budgets.read');
  const hasUpdate = has('budgets.update');

  const { data: budget } = useBudgetDetail(budgetId);
  const { data: envelopes = [] } = useBudgetEnvelopesAll(budgetId);

  const { data: mappingsList } = useQuery({
    queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
    queryFn: () => listBudgetImportMappings(authFetch, { limit: 200, offset: 0 }),
    enabled: !!clientId && hasRead,
  });
  const savedMappings = mappingsList?.items ?? [];

  const [step, setStep] = useState<WizardStep>('upload');
  const [fileToken, setFileToken] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [mapping, setMapping] = useState<MappingConfig>({ fields: {} });
  const [options, setOptions] = useState<BudgetImportOptionsConfig>({
    importMode: 'UPSERT',
    trimValues: true,
    ignoreEmptyRows: true,
    dateFormat: 'DD/MM/YYYY',
  });

  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);

  const [mappingName, setMappingName] = useState('');
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [isEditingSaved, setIsEditingSaved] = useState(false);

  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [sheetChangeLoading, setSheetChangeLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);

  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [sheetChangeError, setSheetChangeError] = useState<string | null>(null);
  const [mappingValidationError, setMappingValidationError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const [mappingMutationBusy, setMappingMutationBusy] = useState(false);

  /** Rattachement enveloppe : colonnes fichier vs une enveloppe unique. */
  const [envelopeImportMode, setEnvelopeImportMode] = useState<EnvelopeImportMode>('from_file_columns');

  const budgetCurrency = budget?.currency ?? 'EUR';

  useEffect(() => {
    if (budget?.currency) {
      setOptions((o) => ({
        ...o,
        defaultCurrency: o.defaultCurrency ?? budget.currency,
      }));
    }
  }, [budget?.currency]);

  const patchMapping = useCallback((m: MappingConfig) => {
    setMapping(m);
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
  }, []);

  const patchOptions = useCallback((o: BudgetImportOptionsConfig) => {
    setOptions(o);
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
  }, []);

  const handleEnvelopeImportModeChange = useCallback((mode: EnvelopeImportMode) => {
    setEnvelopeImportMode(mode);
    setMappingValidationError(null);
    setPreviewResult(null);
    setExecuteResult(null);
    if (mode === 'single_envelope') {
      setMapping((prev) => {
        const f = { ...(prev.fields ?? {}) };
        delete f.envelopeCode;
        delete f.envelopeId;
        delete (f as Record<string, string | undefined>).envelope;
        const m = prev.matching;
        let nextMatching = prev.matching;
        if (m?.strategy === 'COMPOSITE' && m.keys?.length) {
          const nextKeys = m.keys.filter(
            (k) => !['envelopeCode', 'envelopeId', 'envelope'].includes(k),
          );
          nextMatching =
            nextKeys.length > 0 ? { strategy: 'COMPOSITE' as const, keys: nextKeys } : { strategy: 'EXTERNAL_ID' };
        }
        return { ...prev, fields: f, matching: nextMatching };
      });
    }
  }, []);

  const resetWizard = useCallback(() => {
    setStep('upload');
    setFileToken(null);
    setAnalyzeResult(null);
    setMapping({ fields: {} });
    setOptions({
      importMode: 'UPSERT',
      trimValues: true,
      ignoreEmptyRows: true,
      defaultCurrency: budget?.currency,
      dateFormat: 'DD/MM/YYYY',
    });
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingName('');
    setSelectedSavedId(null);
    setIsEditingSaved(false);
    setAnalyzeError(null);
    setSheetChangeError(null);
    setMappingValidationError(null);
    setPreviewError(null);
    setExecuteError(null);
    setEnvelopeImportMode('from_file_columns');
  }, [budget?.currency]);

  const handleAnalyzeFile = async (file: File) => {
    setAnalyzeError(null);
    setAnalyzeLoading(true);
    try {
      const r = await analyzeImport(authFetch, file);
      setAnalyzeResult(r);
      setFileToken(r.fileToken);
      setPreviewResult(null);
      setExecuteResult(null);
      setMapping({ fields: guessMappingFromColumnHeaders(r.columns) });
      setStep('mapping');
    } catch (e) {
      setAnalyzeError(errMessage(e));
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleExcelSheetChange = async (sheetName: string) => {
    if (!fileToken || !analyzeResult || analyzeResult.sourceType !== 'XLSX') return;
    const current = sheetNameForImportPayload(analyzeResult);
    if (sheetName === current) return;
    setSheetChangeError(null);
    setSheetChangeLoading(true);
    try {
      const r = await analyzeImportSheet(authFetch, { fileToken, sheetName });
      setAnalyzeResult(r);
      setPreviewResult(null);
      setExecuteResult(null);
      setMapping({ fields: guessMappingFromColumnHeaders(r.columns) });
      setMappingValidationError(null);
    } catch (e) {
      setSheetChangeError(errMessage(e));
    } finally {
      setSheetChangeLoading(false);
    }
  };

  const runPreview = async () => {
    if (!fileToken || !budgetId || !analyzeResult) return;
    const v = validateMappingForPreview(mapping, options, budgetCurrency, envelopeImportMode);
    if (!v.ok) {
      setMappingValidationError(v.message);
      return;
    }
    setMappingValidationError(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const r = await previewImport(authFetch, {
        budgetId,
        fileToken,
        sheetName: sheetNameForImportPayload(analyzeResult),
        mapping,
        options,
      });
      setPreviewResult(r);
      setStep('preview');
    } catch (e) {
      setPreviewError(errMessage(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const runExecute = async () => {
    if (!fileToken || !budgetId || !previewResult || !analyzeResult) return;
    setExecuteError(null);
    setExecuteLoading(true);
    try {
      const r = await executeImport(authFetch, {
        budgetId,
        fileToken,
        sheetName: sheetNameForImportPayload(analyzeResult),
        mapping,
        mappingId: selectedSavedId ?? undefined,
        options,
      });
      setExecuteResult(r);

      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId, { full: true }),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
    } catch (e) {
      setExecuteError(errMessage(e));
    } finally {
      setExecuteLoading(false);
    }
  };

  const onApplySaved = () => {
    const sel = savedMappings.find((m) => m.id === selectedSavedId);
    if (!sel) return;
    const mc = sel.mappingConfig as MappingConfig;
    const oc = (sel.optionsConfig as BudgetImportOptionsConfig | null) ?? {};
    setMapping(mc);
    setEnvelopeImportMode(inferEnvelopeImportModeFromMapping(mc));
    setOptions((prev) => ({
      ...prev,
      ...oc,
      defaultCurrency: oc.defaultCurrency ?? prev.defaultCurrency ?? budgetCurrency,
      importMode: oc.importMode ?? prev.importMode ?? 'UPSERT',
      trimValues: oc.trimValues ?? prev.trimValues ?? true,
      ignoreEmptyRows: oc.ignoreEmptyRows ?? prev.ignoreEmptyRows ?? true,
      dateFormat: oc.dateFormat ?? prev.dateFormat ?? 'DD/MM/YYYY',
      decimalSeparator: oc.decimalSeparator ?? prev.decimalSeparator ?? '.',
    }));
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
    setMappingName(sel.name);
    setIsEditingSaved(false);
  };

  const onEnterEditMode = () => {
    const sel = savedMappings.find((m) => m.id === selectedSavedId);
    if (!sel) return;
    const mc = sel.mappingConfig as MappingConfig;
    const oc = (sel.optionsConfig as BudgetImportOptionsConfig | null) ?? {};
    setMapping(mc);
    setEnvelopeImportMode(inferEnvelopeImportModeFromMapping(mc));
    setOptions((prev) => ({
      ...prev,
      ...oc,
      defaultCurrency: oc.defaultCurrency ?? prev.defaultCurrency ?? budgetCurrency,
      importMode: oc.importMode ?? prev.importMode ?? 'UPSERT',
      dateFormat: oc.dateFormat ?? prev.dateFormat ?? 'DD/MM/YYYY',
      decimalSeparator: oc.decimalSeparator ?? prev.decimalSeparator ?? '.',
    }));
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
    setMappingName(sel.name);
    setIsEditingSaved(true);
  };

  const onSaveAsNew = async () => {
    if (!mappingName.trim() || !analyzeResult) return;
    setMappingMutationBusy(true);
    try {
      await createBudgetImportMapping(authFetch, {
        name: mappingName.trim(),
        sourceType: analyzeResult.sourceType,
        entityType: 'BUDGET_LINES',
        headerRowIndex: 1,
        mappingConfig: mapping,
        optionsConfig: options as Record<string, unknown>,
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
      setIsEditingSaved(false);
    } catch (e) {
      setMappingValidationError(errMessage(e));
    } finally {
      setMappingMutationBusy(false);
    }
  };

  const onUpdateSaved = async () => {
    if (!mappingName.trim() || !selectedSavedId) return;
    setMappingMutationBusy(true);
    try {
      await updateBudgetImportMapping(authFetch, selectedSavedId, {
        name: mappingName.trim(),
        mappingConfig: mapping,
        optionsConfig: options as Record<string, unknown>,
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
    } catch (e) {
      setMappingValidationError(errMessage(e));
    } finally {
      setMappingMutationBusy(false);
    }
  };

  const onDeleteSaved = async () => {
    if (!selectedSavedId) return;
    if (!window.confirm('Supprimer ce mapping enregistré ?')) return;
    setMappingMutationBusy(true);
    try {
      await deleteBudgetImportMapping(authFetch, selectedSavedId);
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
      setSelectedSavedId(null);
      setIsEditingSaved(false);
    } catch (e) {
      setMappingValidationError(errMessage(e));
    } finally {
      setMappingMutationBusy(false);
    }
  };

  if (!permLoading && !hasRead) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Vous n’avez pas les droits de lecture sur les budgets pour utiliser l’import.
        </AlertDescription>
      </Alert>
    );
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'upload', label: 'Fichier' },
    { id: 'mapping', label: 'Correspondance' },
    { id: 'preview', label: 'Aperçu' },
    { id: 'execute', label: 'Import' },
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Étapes du wizard" className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={step === s.id}
            onClick={() => {
              if (s.id === 'upload') setStep('upload');
              if (s.id === 'mapping' && analyzeResult) setStep('mapping');
              if (s.id === 'preview' && previewResult) setStep('preview');
              if (s.id === 'execute' && previewResult) setStep('execute');
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              step === s.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {step === 'upload' ? (
        <BudgetImportUploadStep
          onAnalyzeFile={handleAnalyzeFile}
          isLoading={analyzeLoading}
          errorMessage={analyzeError}
        />
      ) : null}

      {step === 'mapping' && analyzeResult ? (
        <div className="space-y-4">
          {analyzeResult.sourceType === 'XLSX' && (analyzeResult.sheetNames?.length ?? 0) > 0 ? (
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="excel-sheet-select">Onglet Excel à importer</Label>
                <Select
                  value={sheetNameForImportPayload(analyzeResult) ?? analyzeResult.sheetNames![0]!}
                  onValueChange={(v) => {
                    if (v == null || v === '') return;
                    void handleExcelSheetChange(v);
                  }}
                  disabled={sheetChangeLoading}
                >
                  <SelectTrigger id="excel-sheet-select" className="w-full max-w-md">
                    <SelectValue>
                      {sheetNameForImportPayload(analyzeResult) ?? analyzeResult.sheetNames![0]!}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {analyzeResult.sheetNames!.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Les colonnes affichées ci-dessous correspondent à l’onglet choisi. Changer d’onglet relit le
                  fichier et met à jour les en-têtes (sans renvoyer le fichier).
                </p>
                {sheetChangeError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{sheetChangeError}</AlertDescription>
                  </Alert>
                ) : null}
                {sheetChangeLoading ? (
                  <p className="text-xs text-muted-foreground">Lecture de l’onglet…</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <BudgetImportMappingStep
            columns={analyzeResult.columns}
            rowCount={analyzeResult.rowCount}
            excelActiveSheetName={sheetNameForImportPayload(analyzeResult)}
            budgetCurrency={budgetCurrency}
            envelopes={envelopes}
            mapping={mapping}
            options={options}
            onMappingChange={patchMapping}
            onOptionsChange={patchOptions}
            validationMessage={mappingValidationError}
            savedMappings={savedMappings}
            mappingName={mappingName}
            onMappingNameChange={setMappingName}
            selectedSavedId={selectedSavedId}
            onSelectSaved={(id) => {
              setSelectedSavedId(id);
              setIsEditingSaved(false);
            }}
            isEditingSaved={isEditingSaved}
            onApplySaved={onApplySaved}
            onEnterEditMode={onEnterEditMode}
            onSaveAsNew={onSaveAsNew}
            onUpdateSaved={onUpdateSaved}
            onDeleteSaved={onDeleteSaved}
            canMutateMappings={hasUpdate}
            envelopeImportMode={envelopeImportMode}
            onEnvelopeImportModeChange={handleEnvelopeImportModeChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('upload')}>
              Retour
            </Button>
            <Button
              type="button"
              onClick={() => void runPreview()}
              disabled={previewLoading || sheetChangeLoading || !hasRead}
            >
              {previewLoading ? 'Prévisualisation…' : 'Prévisualiser'}
            </Button>
          </div>
          {!hasRead ? (
            <p className="text-xs text-muted-foreground">Lecture budget requise.</p>
          ) : null}
        </div>
      ) : null}

      {step === 'preview' && previewResult ? (
        <BudgetImportPreviewStep
          preview={previewResult}
          errorMessage={previewError}
          isLoading={previewLoading}
          onContinue={() => setStep('execute')}
          onBack={() => setStep('mapping')}
        />
      ) : null}

      {step === 'execute' && previewResult ? (
        <BudgetImportExecuteStep
          previewStats={previewResult.stats}
          executeResult={executeResult}
          isExecuting={executeLoading}
          errorMessage={executeError}
          canExecute={hasUpdate && !!fileToken && !!previewResult}
          readOnlyReason={
            !hasUpdate
              ? 'Droits d’écriture budget requis pour lancer l’import (budgets.update).'
              : null
          }
          budgetDetailHref={budgetDetail(budgetId)}
          onExecute={() => void runExecute()}
          onBack={() => setStep('preview')}
          onResetWizard={resetWizard}
        />
      ) : null}

      <div className="border-t border-border pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={resetWizard}>
          Recommencer depuis le début
        </Button>
      </div>
    </div>
  );
}
