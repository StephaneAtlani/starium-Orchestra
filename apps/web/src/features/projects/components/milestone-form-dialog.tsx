'use client';

import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  MilestoneFormDialogFields,
  type MilestoneFormDialogFieldsProps,
} from './milestone-form-dialog-fields';

export type MilestoneFormDialogProps = MilestoneFormDialogFieldsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  onSubmit: () => void;
  isSubmitting?: boolean;
};

export function MilestoneFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting = false,
  form,
  ...fieldsProps
}: MilestoneFormDialogProps) {
  const canSubmit = form.name.trim().length > 0 && !isSubmitting;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Modifier le jalon' : 'Nouveau jalon'}
      description={
        editing
          ? 'Mettre à jour le repère temporel et la liaison éventuelle avec une tâche.'
          : 'Définir un jalon sur la ligne de temps du projet ; liaison avec une tâche optionnelle.'
      }
      icon={Flag}
      size="lg"
      bodyClassName="min-h-0 flex-1 py-4"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={onSubmit}>
            {isSubmitting
              ? editing
                ? 'Enregistrement…'
                : 'Création…'
              : editing
                ? 'Enregistrer'
                : 'Créer'}
          </Button>
        </>
      }
    >
      <MilestoneFormDialogFields form={form} {...fieldsProps} />
    </StariumModal>
  );
}
