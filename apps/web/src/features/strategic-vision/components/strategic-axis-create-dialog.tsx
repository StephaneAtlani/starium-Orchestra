'use client';

import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import { useCreateStrategicAxisMutation } from '../hooks/use-strategic-vision-queries';
import { buildAxisNameWithLogo } from '../lib/strategic-vision-tabs-view';
import { getFirstZodError, strategicAxisFormSchema } from '../schemas/strategic-vision.schemas';
import {
  isStrategicAxisFormSubmittable,
  StrategicAxisFormFields,
  type StrategicAxisFormValues,
} from './strategic-axis-form-fields';
import { strategicAxisColorToModalAccent } from '../lib/strategic-axis-modal-accent';

const EMPTY_FORM: StrategicAxisFormValues = {
  logo: '',
  color: 'auto',
  name: '',
  description: '',
};

export function StrategicAxisCreateDialog({
  visionId,
  visionTitle,
  open,
  onOpenChange,
}: {
  visionId: string | null;
  visionTitle: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createAxis = useCreateStrategicAxisMutation();
  const [form, setForm] = useState<StrategicAxisFormValues>(EMPTY_FORM);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSave = async () => {
    if (!visionId) return;
    const parsed = strategicAxisFormSchema.safeParse({
      name: form.name,
      description: form.description,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await createAxis.mutateAsync({
        visionId,
        name: buildAxisNameWithLogo({
          logo: form.logo,
          title: parsed.data.name,
          color: form.color,
        }),
        description: parsed.data.description?.trim() || undefined,
      });
      toast.success('Axe stratégique créé.');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible.');
    }
  };

  const canSubmit =
    Boolean(visionId) && isStrategicAxisFormSubmittable(form) && !createAxis.isPending;

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
      title="Nouvel axe stratégique"
      description="Créez un axe rattaché à la vision active."
      icon={Crosshair}
      accent={strategicAxisColorToModalAccent(form.color)}
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
            {createAxis.isPending ? 'Création…' : 'Créer'}
          </Button>
        </>
      }
    >
      <StrategicAxisFormFields
        idPrefix="sv-create-axis"
        visionTitle={visionTitle}
        values={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
      />
    </StariumModal>
  );
}
