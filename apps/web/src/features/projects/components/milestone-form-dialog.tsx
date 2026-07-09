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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton size="lg">
        <DialogHeader>
          <div className="pr-8">
            <DialogTitle className="text-left">
              {editing ? 'Modifier le jalon' : 'Nouveau jalon'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-left">
              {editing
                ? 'Mettre à jour le repère temporel et la liaison éventuelle avec une tâche.'
                : 'Définir un jalon sur la ligne de temps du projet ; liaison avec une tâche optionnelle.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 py-4">
          <MilestoneFormDialogFields form={form} {...fieldsProps} />
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
