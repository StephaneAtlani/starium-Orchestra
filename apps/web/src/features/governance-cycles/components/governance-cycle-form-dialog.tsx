'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import {
  GOVERNANCE_CYCLE_CADENCE_OPTIONS,
  GOVERNANCE_CYCLE_STATUS_OPTIONS,
} from '../lib/governance-cycle-labels';
import type { GovernanceCycleResponseDto } from '../types/governance-cycle.types';
import {
  createGovernanceCycleSchema,
  getFirstZodError,
  updateGovernanceCycleSchema,
  type CreateGovernanceCycleFormValues,
} from '../schemas/governance-cycle.schemas';
import {
  getApiErrorMessage,
  useCreateGovernanceCycleMutation,
  useUpdateGovernanceCycleMutation,
} from '../hooks/use-governance-cycles';

function suggestCycleCodeFromName(name: string): string {
  const raw = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  if (raw.length >= 2) return `CYC-${raw}`;
  return `CYC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function cycleToFormValues(cycle?: GovernanceCycleResponseDto): CreateGovernanceCycleFormValues {
  return {
    name: cycle?.name ?? '',
    code: cycle?.code ?? '',
    description: cycle?.description ?? '',
    cadence: cycle?.cadence ?? 'QUARTERLY',
    status: cycle?.status ?? 'DRAFT',
    startDate: cycle?.startDate?.slice(0, 10) ?? '',
    endDate: cycle?.endDate?.slice(0, 10) ?? '',
    sponsorLabel: cycle?.sponsorLabel ?? '',
    objectiveSummary: cycle?.objectiveSummary ?? '',
    decisionSummary: cycle?.decisionSummary ?? '',
  };
}

export function GovernanceCycleFormDialog({
  open,
  onOpenChange,
  mode,
  cycle,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  cycle?: GovernanceCycleResponseDto;
  onSuccess?: (cycle: GovernanceCycleResponseDto) => void;
}) {
  const [form, setForm] = useState<CreateGovernanceCycleFormValues>(() => cycleToFormValues(cycle));
  const [codeFollowsName, setCodeFollowsName] = useState(mode === 'create');
  const createMutation = useCreateGovernanceCycleMutation();
  const updateMutation = useUpdateGovernanceCycleMutation(cycle?.id ?? '');
  const pending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(cycleToFormValues(cycle));
      setCodeFollowsName(mode === 'create');
    }
  }, [open, cycle, mode]);

  function updateField<K extends keyof CreateGovernanceCycleFormValues>(
    key: K,
    value: CreateGovernanceCycleFormValues[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && codeFollowsName && mode === 'create') {
        next.code = suggestCycleCodeFromName(String(value));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const schema = mode === 'create' ? createGovernanceCycleSchema : updateGovernanceCycleSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      const result =
        mode === 'create'
          ? await createMutation.mutateAsync(parsed.data as CreateGovernanceCycleFormValues)
          : await updateMutation.mutateAsync(parsed.data);
      toast.success(mode === 'create' ? 'Cycle créé' : 'Cycle mis à jour');
      onOpenChange(false);
      onSuccess?.(result);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const formId = 'governance-cycle-form';

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nouveau cycle de pilotage' : 'Modifier le cycle'}
      contentClassName="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cycle-name">Nom</Label>
            <Input
              id="cycle-name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-code">Code</Label>
            <Input
              id="cycle-code"
              value={form.code ?? ''}
              onChange={(e) => {
                setCodeFollowsName(false);
                updateField('code', e.target.value);
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select
                value={form.cadence}
                onValueChange={(v) =>
                  updateField('cadence', v as CreateGovernanceCycleFormValues['cadence'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOVERNANCE_CYCLE_CADENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={form.status ?? 'DRAFT'}
                onValueChange={(v) =>
                  updateField('status', v as CreateGovernanceCycleFormValues['status'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOVERNANCE_CYCLE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cycle-start">Début</Label>
              <Input
                id="cycle-start"
                type="date"
                value={form.startDate ?? ''}
                onChange={(e) => updateField('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle-end">Fin</Label>
              <Input
                id="cycle-end"
                type="date"
                value={form.endDate ?? ''}
                onChange={(e) => updateField('endDate', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-sponsor">Sponsor</Label>
            <Input
              id="cycle-sponsor"
              value={form.sponsorLabel ?? ''}
              onChange={(e) => updateField('sponsorLabel', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cycle-description">Description</Label>
            <textarea
              id="cycle-description"
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.description ?? ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
            />
          </div>
        </form>
    </StariumModal>
  );
}
