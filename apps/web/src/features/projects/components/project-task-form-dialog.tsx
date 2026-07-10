'use client';

import { ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  TaskFormDialogFields,
  type TaskFormDialogFieldsProps,
} from './task-form-dialog-fields';

export type ProjectTaskFormDialogProps = TaskFormDialogFieldsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  onSubmit: () => void;
  isSubmitting?: boolean;
};

export function ProjectTaskFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isSubmitting = false,
  form,
  ...fieldsProps
}: ProjectTaskFormDialogProps) {
  const canSubmit = form.name.trim().length > 0 && !isSubmitting;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}
      description={
        editing
          ? 'Mettre à jour les informations de la tâche, son planning et ses dépendances.'
          : 'Créer une nouvelle tâche dans le projet.'
      }
      icon={ListTodo}
      accent="sky"
      size="xl"
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
      <TaskFormDialogFields form={form} {...fieldsProps} />
    </StariumModal>
  );
}
