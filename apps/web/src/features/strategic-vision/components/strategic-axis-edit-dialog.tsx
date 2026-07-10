'use client';

import { useEffect, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { toast } from '@/lib/toast';
import type { StrategicAxisDto } from '../types/strategic-vision.types';
import { useUpdateStrategicAxisMutation } from '../hooks/use-strategic-vision-queries';
import {
  buildAxisNameWithLogo,
  splitAxisLogoAndTitle,
} from '../lib/strategic-vision-tabs-view';
import { getFirstZodError, strategicAxisFormSchema } from '../schemas/strategic-vision.schemas';
import { isStrategicAxisIconKey } from './strategic-axis-icons';
import {
  isStrategicAxisFormSubmittable,
  StrategicAxisFormFields,
  type StrategicAxisFormValues,
} from './strategic-axis-form-fields';
import { strategicAxisColorToModalAccent } from '../lib/strategic-axis-modal-accent';

export function StrategicAxisEditDialog({
  axis,
  open,
  onOpenChange,
}: {
  axis: StrategicAxisDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAxis = useUpdateStrategicAxisMutation();
  const [form, setForm] = useState<StrategicAxisFormValues>({
    logo: '',
    color: 'auto',
    name: '',
    description: '',
  });

  useEffect(() => {
    if (!axis) return;
    const parsed = splitAxisLogoAndTitle(axis.name);
    setForm({
      logo: parsed.logo && isStrategicAxisIconKey(parsed.logo) ? parsed.logo : '',
      color: parsed.color,
      name: parsed.title,
      description: axis.description ?? '',
    });
  }, [axis]);

  const handleSave = async () => {
    if (!axis) return;
    const parsed = strategicAxisFormSchema.safeParse({
      name: form.name,
      description: form.description,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }
    try {
      await updateAxis.mutateAsync({
        axisId: axis.id,
        body: {
          name: buildAxisNameWithLogo({
            logo: form.logo,
            title: parsed.data.name,
            color: form.color,
          }),
          description: parsed.data.description?.trim() ? parsed.data.description : null,
        },
      });
      toast.success('Axe stratégique mis à jour.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible.');
    }
  };

  const canSubmit = isStrategicAxisFormSubmittable(form) && !updateAxis.isPending;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier l'axe stratégique"
      description={axis?.name ? splitAxisLogoAndTitle(axis.name).title : 'Mise à jour du nom et de la description.'}
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
            {updateAxis.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <StrategicAxisFormFields
        idPrefix="sv-edit-axis"
        values={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
      />
    </StariumModal>
  );
}
