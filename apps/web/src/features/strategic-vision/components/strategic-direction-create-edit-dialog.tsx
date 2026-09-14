'use client';

import { useEffect, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { usePermissions } from '@/hooks/use-permissions';
import { HumanResourceCombobox } from '@/features/teams/work-teams/components/human-resource-combobox';
import {
  useCreateStrategicDirectionMutation,
  useStrategicDirectionsQuery,
  useUpdateStrategicDirectionMutation,
} from '../hooks/use-strategic-vision-queries';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';

const TONES = [
  { value: 'info', label: 'Bleu', bg: 'var(--state-info-bg)', c: 'var(--state-info)' },
  { value: 'gold', label: 'Or', bg: 'var(--brand-gold-050)', c: 'var(--brand-gold-700)' },
  { value: 'purple', label: 'Violet', bg: 'var(--purple-bg)', c: 'var(--purple)' },
  { value: 'teal', label: 'Teal', bg: 'var(--teal-bg)', c: 'var(--teal)' },
] as const;

/** Sentinel Select — parentLabel API = null / absent */
const PARENT_NONE = '__none__';

export function StrategicDirectionCreateEditDialog({
  mode,
  open,
  onOpenChange,
  direction,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: StrategicDirectionDto | null;
  onSuccess?: (direction: StrategicDirectionDto) => void;
}) {
  const { has, isSuccess: permsOk } = usePermissions();
  const canReadResources = permsOk && has('resources.read');
  const canReadDirections = permsOk && has('strategic_vision.read');
  const createDirection = useCreateStrategicDirectionMutation();
  const updateDirection = useUpdateStrategicDirectionMutation();
  const directionsQ = useStrategicDirectionsQuery({
    enabled: open && canReadDirections,
  });

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accentTone, setAccentTone] = useState('info');
  const [parentLabel, setParentLabel] = useState('');
  const [sponsorResourceId, setSponsorResourceId] = useState('');
  const [fteCount, setFteCount] = useState('');
  const [budgetKe, setBudgetKe] = useState('');
  const [isActive, setIsActive] = useState(true);

  const parentOptions = useMemo(() => {
    const rows = directionsQ.data ?? [];
    return rows
      .filter((d) => (mode === 'edit' && direction ? d.id !== direction.id : true))
      .filter((d) => d.isActive)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      );
  }, [directionsQ.data, mode, direction]);

  const parentSelectValue = useMemo(() => {
    const trimmed = parentLabel.trim();
    if (!trimmed) return PARENT_NONE;
    const match = parentOptions.find(
      (d) => d.name.localeCompare(trimmed, 'fr', { sensitivity: 'base' }) === 0,
    );
    return match ? match.id : PARENT_NONE;
  }, [parentLabel, parentOptions]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && direction) {
      setCode(direction.code);
      setName(direction.name);
      setDescription(direction.description ?? '');
      setAccentTone(direction.accentTone ?? 'info');
      setParentLabel(direction.parentLabel?.trim() ?? '');
      setSponsorResourceId(direction.sponsorResourceId ?? '');
      setFteCount(direction.fteCount != null ? String(direction.fteCount) : '');
      setBudgetKe(
        direction.operatingBudgetCents != null
          ? String(Math.round(direction.operatingBudgetCents / 100_000) || '')
          : '',
      );
      setIsActive(direction.isActive);
    } else if (mode === 'create') {
      setCode('');
      setName('');
      setDescription('');
      setAccentTone('info');
      setParentLabel('');
      setSponsorResourceId('');
      setFteCount('');
      setBudgetKe('');
      setIsActive(true);
    }
  }, [open, mode, direction]);

  const reset = () => {
    setCode('');
    setName('');
    setDescription('');
    setAccentTone('info');
    setParentLabel('');
    setSponsorResourceId('');
    setFteCount('');
    setBudgetKe('');
    setIsActive(true);
  };

  const handleSubmit = async () => {
    const fte = fteCount.trim() === '' ? undefined : parseInt(fteCount, 10);
    const budgetCents =
      budgetKe.trim() === ''
        ? undefined
        : Math.round((parseFloat(budgetKe.replace(',', '.')) || 0) * 100_000);
    const parentPayload = parentLabel.trim() || null;
    try {
      if (mode === 'create') {
        const created = await createDirection.mutateAsync({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          accentTone,
          parentLabel: parentPayload || undefined,
          sponsorResourceId: sponsorResourceId.trim() || undefined,
          fteCount: Number.isFinite(fte) ? fte : undefined,
          operatingBudgetCents: budgetCents,
          sortOrder: 0,
          isActive,
        });
        toast.success('Direction créée.');
        onSuccess?.(created);
      } else if (direction) {
        const updated = await updateDirection.mutateAsync({
          directionId: direction.id,
          body: {
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || null,
            accentTone,
            parentLabel: parentPayload,
            sponsorResourceId: sponsorResourceId.trim() || null,
            fteCount: Number.isFinite(fte) ? fte! : null,
            operatingBudgetCents: budgetCents ?? null,
            sortOrder: direction.sortOrder,
            isActive,
          },
        });
        toast.success('Direction mise à jour.');
        onSuccess?.(updated);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.');
    }
  };

  const pending = createDirection.isPending || updateDirection.isPending;
  const canSubmit = !pending && code.trim().length > 0 && name.trim().length > 0;

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={mode === 'create' ? 'Nouvelle direction' : 'Modifier la direction'}
      description="Identité mock : sigle, teinte, sponsor, rattachement, ETP et budget de fonctionnement."
      icon={Compass}
      accent="blue"
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="starium-form">
        <h3 className="starium-modal-seg-title">Informations</h3>
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-dir-code">
              Code / sigle <span className="text-destructive">*</span>
            </label>
            <input
              id="sv-dir-code"
              className="starium-form-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ex. DSI"
              disabled={pending}
              maxLength={30}
              autoComplete="off"
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-dir-name">
              Nom <span className="text-destructive">*</span>
            </label>
            <input
              id="sv-dir-name"
              className="starium-form-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom métier"
              disabled={pending}
              maxLength={255}
            />
          </div>
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-dir-description">
            Périmètre / description
          </label>
          <textarea
            id="sv-dir-description"
            className="starium-form-textarea min-h-[80px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={pending}
            maxLength={4000}
          />
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="sv-dir-parent">
            Rattachée à
          </label>
          <Select
            value={parentSelectValue}
            onValueChange={(v) => {
              if (v == null || v === PARENT_NONE) {
                setParentLabel('');
                return;
              }
              const selected = parentOptions.find((d) => d.id === v);
              setParentLabel(selected?.name ?? '');
            }}
            disabled={pending || directionsQ.isLoading}
          >
            <SelectTrigger
              id="sv-dir-parent"
              className="starium-form-input min-h-11 w-full"
              aria-busy={directionsQ.isLoading}
            >
              <SelectValue placeholder="Aucune">
                {parentSelectValue === PARENT_NONE
                  ? 'Aucune'
                  : displayLabel(
                      parentOptions.find((d) => d.id === parentSelectValue)?.name,
                      'Aucune',
                    )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PARENT_NONE}>Aucune</SelectItem>
              {parentOptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {displayLabel(d.name, 'Direction')}
                  {d.code ? ` (${displayLabel(d.code, 'code')})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {directionsQ.isError ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              Impossible de charger la liste des directions.
            </p>
          ) : null}
        </div>
        {canReadResources ? (
          <HumanResourceCombobox
            id="sv-dir-sponsor"
            label="Sponsor / directeur·rice"
            dialogOpen={open}
            value={sponsorResourceId}
            onChange={setSponsorResourceId}
            fallbackLabel={direction?.sponsorLabel ?? null}
            disabled={pending}
          />
        ) : (
          <Alert>
            <AlertTitle>Catalogue ressources indisponible</AlertTitle>
            <AlertDescription>
              Permission <code className="text-xs">resources.read</code> requise pour sélectionner
              un sponsor.
            </AlertDescription>
          </Alert>
        )}
        <fieldset className="starium-form-field">
          <legend className="starium-form-label">Teinte</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Teinte de la direction">
            {TONES.map((t) => {
              const selected = accentTone === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  disabled={pending}
                  className={cn(
                    'min-h-11 rounded-full border px-3 text-sm font-semibold',
                    selected
                      ? 'border-[color:var(--brand-gold)]'
                      : 'border-border',
                  )}
                  style={{ background: t.bg, color: t.c }}
                  aria-pressed={selected}
                  onClick={() => setAccentTone(t.value)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-dir-fte">
              Effectif (ETP)
            </label>
            <input
              id="sv-dir-fte"
              type="number"
              min={0}
              className="starium-form-input"
              value={fteCount}
              onChange={(event) => setFteCount(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="sv-dir-budget">
              Budget de fonctionnement (k€)
            </label>
            <input
              id="sv-dir-budget"
              type="number"
              min={0}
              className="starium-form-input"
              value={budgetKe}
              onChange={(event) => setBudgetKe(event.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm sm:min-h-9">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={pending}
          />
          Direction active
        </label>
      </div>
    </StariumModal>
  );
}
