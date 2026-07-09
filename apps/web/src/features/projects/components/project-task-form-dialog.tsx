'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton size="xl">
        <DialogHeader>
          <div className="pr-8">
            <DialogTitle className="text-left">
              {editing ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-left">
              {editing
                ? 'Mettre à jour les informations de la tâche, son planning et ses dépendances.'
                : 'Créer une nouvelle tâche dans le projet.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 py-4">
          <TaskFormDialogFields form={form} {...fieldsProps} />
        </DialogBody>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
