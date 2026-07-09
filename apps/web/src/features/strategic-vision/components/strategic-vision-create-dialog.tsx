'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import { useCreateStrategicVisionMutation } from '../hooks/use-strategic-vision-queries';
import { getFirstZodError, strategicVisionFormSchema } from '../schemas/strategic-vision.schemas';
import {
  isStrategicVisionFormSubmittable,
  StrategicVisionFormFields,
  type StrategicVisionFormValues,
} from './strategic-vision-form-fields';

const EMPTY_FORM: StrategicVisionFormValues = {
  title: '',
  statement: '',
  horizonLabel: '',
  isActive: false,
};

export function StrategicVisionCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createVision = useCreateStrategicVisionMutation();
  const [form, setForm] = useState<StrategicVisionFormValues>(EMPTY_FORM);

  const reset = () => setForm(EMPTY_FORM);

  const patchForm = (patch: Partial<StrategicVisionFormValues>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleCreate = async () => {
    const parsed = strategicVisionFormSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await createVision.mutateAsync({
        title: parsed.data.title,
        statement: parsed.data.statement,
        horizonLabel: parsed.data.horizonLabel,
        isActive: parsed.data.isActive,
      });
      toast.success('Vision stratégique créée.');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible.');
    }
  };

  const canSubmit = isStrategicVisionFormSubmittable(form) && !createVision.isPending;

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Nouvelle vision"
      description="Créez un brouillon ou une vision à activer immédiatement."
      icon={Sparkles}
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
            onClick={() => void handleCreate()}
          >
            {createVision.isPending ? 'Création…' : 'Créer la vision'}
          </Button>
        </>
      }
    >
      <StrategicVisionFormFields
        idPrefix="sv-create-vision"
        values={form}
        onChange={patchForm}
        activeCheckboxLabel="Activer immédiatement en production"
      />
    </StariumModal>
  );
}
