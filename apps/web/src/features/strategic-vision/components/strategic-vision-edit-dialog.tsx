'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import type { StrategicVisionDto } from '../types/strategic-vision.types';
import { useUpdateStrategicVisionMutation } from '../hooks/use-strategic-vision-queries';
import { getFirstZodError, strategicVisionFormSchema } from '../schemas/strategic-vision.schemas';
import {
  isStrategicVisionFormSubmittable,
  StrategicVisionFormFields,
  type StrategicVisionFormValues,
} from './strategic-vision-form-fields';

function valuesFromVision(vision: StrategicVisionDto): StrategicVisionFormValues {
  return {
    title: vision.title,
    statement: vision.statement,
    horizonLabel: vision.horizonLabel,
    isActive: vision.isActive,
  };
}

export function StrategicVisionEditDialog({
  vision,
  open,
  onOpenChange,
}: {
  vision: StrategicVisionDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateVision = useUpdateStrategicVisionMutation();
  const [form, setForm] = useState<StrategicVisionFormValues>({
    title: '',
    statement: '',
    horizonLabel: '',
    isActive: true,
  });

  useEffect(() => {
    if (!vision) return;
    setForm(valuesFromVision(vision));
  }, [vision]);

  const patchForm = (patch: Partial<StrategicVisionFormValues>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleSave = async () => {
    if (!vision) return;
    const parsed = strategicVisionFormSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await updateVision.mutateAsync({
        visionId: vision.id,
        body: {
          title: parsed.data.title,
          statement: parsed.data.statement,
          horizonLabel: parsed.data.horizonLabel,
          isActive: parsed.data.isActive,
        },
      });
      toast.success('Vision stratégique mise à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  const canSubmit = isStrategicVisionFormSubmittable(form) && !updateVision.isPending;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier la vision"
      description={vision?.title ?? 'Mise à jour du titre, de l’énoncé, de l’horizon et du statut.'}
      icon={Sparkles}
      accent="gold"
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canSubmit}
            onClick={() => void handleSave()}
          >
            {updateVision.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <StrategicVisionFormFields
        idPrefix="sv-edit-vision"
        values={form}
        onChange={patchForm}
        activeCheckboxLabel="Vision en production"
      />
    </StariumModal>
  );
}
