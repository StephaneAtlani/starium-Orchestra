'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBudgetsQuery } from '../hooks/use-budgets-query';
import { firstDisplayLabel } from '@/lib/display-label';
import { EMPTY_SELECT_VALUE } from '../budget-import/budget-import-field-labels';
import { IMPORT_PURPOSE_LABELS } from './import-purpose-labels';
import type {
  BudgetImportMappingDto,
  BudgetImportPurpose,
  BudgetImportSourceType,
  CreateBudgetImportMappingPayload,
  UpdateBudgetImportMappingPayload,
} from '../types/budget-imports.types';

export interface ImportProfileFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: BudgetImportMappingDto | null;
  busy?: boolean;
  onSubmitCreate: (payload: CreateBudgetImportMappingPayload) => Promise<void>;
  onSubmitUpdate: (id: string, payload: UpdateBudgetImportMappingPayload) => Promise<void>;
}

export function ImportProfileFormModal({
  open,
  onOpenChange,
  mode,
  initial,
  busy,
  onSubmitCreate,
  onSubmitUpdate,
}: ImportProfileFormModalProps) {
  const { data: budgetsData } = useBudgetsQuery({ limit: 100, page: 1 }, { enabled: open });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<BudgetImportSourceType>('CSV');
  const [importPurpose, setImportPurpose] = useState<BudgetImportPurpose>('MIXED');
  const [defaultBudgetId, setDefaultBudgetId] = useState(EMPTY_SELECT_VALUE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setSourceType(initial.sourceType);
      setImportPurpose(initial.importPurpose ?? 'MIXED');
      setDefaultBudgetId(initial.defaultBudgetId ?? EMPTY_SELECT_VALUE);
    } else {
      setName('');
      setDescription('');
      setSourceType('CSV');
      setImportPurpose('MIXED');
      setDefaultBudgetId(EMPTY_SELECT_VALUE);
    }
    setError(null);
  }, [open, mode, initial]);

  const budgetOptions = useMemo(
    () =>
      (budgetsData?.items ?? []).map((b) => ({
        id: b.id,
        label: firstDisplayLabel([b.name, b.code], 'Budget'),
      })),
    [budgetsData?.items],
  );

  const defaultBudgetLabel =
    defaultBudgetId === EMPTY_SELECT_VALUE
      ? 'Aucun budget par défaut'
      : (budgetOptions.find((o) => o.id === defaultBudgetId)?.label ?? 'Budget');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom du profil est obligatoire.');
      return;
    }
    setError(null);
    const budgetValue =
      defaultBudgetId === EMPTY_SELECT_VALUE ? null : defaultBudgetId;
    try {
      if (mode === 'create') {
        await onSubmitCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          sourceType,
          importPurpose,
          defaultBudgetId: budgetValue,
          mappingConfig: { fields: {} },
        });
      } else if (initial) {
        await onSubmitUpdate(initial.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          importPurpose,
          defaultBudgetId: budgetValue,
        });
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nouveau profil d’import' : 'Modifier le profil'}
      description="Métadonnées du profil. Le mapping des colonnes se configure dans le wizard."
      icon={Settings2}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="space-y-2">
          <Label htmlFor="import-profile-name">Nom</Label>
          <Input
            id="import-profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 sm:min-h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="import-profile-desc">Description</Label>
          <Textarea
            id="import-profile-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        {mode === 'create' ? (
          <div className="space-y-2">
            <Label htmlFor="import-profile-source">Type de fichier</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => setSourceType((v as BudgetImportSourceType) ?? 'CSV')}
            >
              <SelectTrigger id="import-profile-source" className="min-h-11 w-full sm:min-h-9">
                <SelectValue>{sourceType === 'XLSX' ? 'Excel (.xlsx)' : 'CSV'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="XLSX">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="import-profile-purpose">Finalité</Label>
          <Select
            value={importPurpose}
            onValueChange={(v) => setImportPurpose((v as BudgetImportPurpose) ?? 'MIXED')}
          >
            <SelectTrigger id="import-profile-purpose" className="min-h-11 w-full sm:min-h-9">
              <SelectValue>{IMPORT_PURPOSE_LABELS[importPurpose]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(IMPORT_PURPOSE_LABELS) as BudgetImportPurpose[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {IMPORT_PURPOSE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="import-profile-budget">Budget par défaut</Label>
          <Select
            value={defaultBudgetId}
            onValueChange={(v) => setDefaultBudgetId(v ?? EMPTY_SELECT_VALUE)}
          >
            <SelectTrigger id="import-profile-budget" className="min-h-11 w-full sm:min-h-9">
              <SelectValue>{defaultBudgetLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Aucun budget par défaut</SelectItem>
              {budgetOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </StariumModal>
  );
}
