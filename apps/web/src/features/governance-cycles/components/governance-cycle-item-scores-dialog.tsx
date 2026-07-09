'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import type { GovernanceCycleItemResponseDto } from '../types/governance-cycle.types';
import {
  getFirstZodError,
  patchGovernanceCycleItemEditionSchema,
  type PatchGovernanceCycleItemEditionFormValues,
} from '../schemas/governance-cycle.schemas';
import {
  getApiErrorMessage,
  usePatchGovernanceCycleItemEditionMutation,
} from '../hooks/use-governance-cycles';

const SCORE_FIELDS = [
  { key: 'valueScore' as const, label: 'Valeur' },
  { key: 'alignmentScore' as const, label: 'Alignement' },
  { key: 'budgetScore' as const, label: 'Budget' },
  { key: 'capacityScore' as const, label: 'Capacité' },
  { key: 'riskScore' as const, label: 'Risque' },
];

export function GovernanceCycleItemScoresDialog({
  open,
  onOpenChange,
  cycleId,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  item: GovernanceCycleItemResponseDto | null;
}) {
  const mutation = usePatchGovernanceCycleItemEditionMutation(cycleId);
  const [form, setForm] = useState<PatchGovernanceCycleItemEditionFormValues>({});

  useEffect(() => {
    if (open && item) {
      setForm({
        valueScore: item.valueScore,
        alignmentScore: item.alignmentScore,
        budgetScore: item.budgetScore,
        capacityScore: item.capacityScore,
        riskScore: item.riskScore,
      });
    }
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const parsed = patchGovernanceCycleItemEditionSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await mutation.mutateAsync({ itemId: item.id, body: parsed.data });
      toast.success('Scores mis à jour');
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const formId = 'governance-cycle-item-scores-form';

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier les scores"
      size="md"
      contentClassName="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form={formId} disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Le score global est recalculé par le serveur après enregistrement.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SCORE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={`score-${field.key}`}>{field.label} (1–5)</Label>
                <Input
                  id={`score-${field.key}`}
                  type="number"
                  min={1}
                  max={5}
                  value={form[field.key] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: raw === '' ? null : Number.parseInt(raw, 10),
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </form>
    </StariumModal>
  );
}
