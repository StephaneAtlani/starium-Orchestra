'use client';

import { useEffect, useState } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type TeamsChannelTemplateFormValues = {
  displayName: string;
  description: string;
  isPrimary: boolean;
};

export const EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM: TeamsChannelTemplateFormValues = {
  displayName: '',
  description: '',
  isPrimary: false,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialValues: TeamsChannelTemplateFormValues;
  onSubmit: (payload: TeamsChannelTemplateFormValues) => Promise<void>;
  isPending: boolean;
  canEdit: boolean;
  errorMessage?: string | null;
};

export function MicrosoftTeamsChannelTemplateFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  isPending,
  canEdit,
  errorMessage,
}: Props) {
  const [displayName, setDisplayName] = useState(initialValues.displayName);
  const [description, setDescription] = useState(initialValues.description);
  const [isPrimary, setIsPrimary] = useState(initialValues.isPrimary);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialValues.displayName);
    setDescription(initialValues.description);
    setIsPrimary(initialValues.isPrimary);
  }, [open, mode, initialValues]);

  const trimmedDisplayName = displayName.trim();
  const submitDisabled =
    !canEdit || isPending || isSubmitting || trimmedDisplayName.length === 0;

  const handleSubmit = async () => {
    if (submitDisabled) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        displayName: trimmedDisplayName,
        description: description.trim(),
        isPrimary,
      });
      onOpenChange(false);
    } catch {
      // L'orchestrateur gère errorMessage ; le dialogue reste ouvert.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Ajouter un canal par défaut' : 'Modifier le canal par défaut'}
      description="Nom, description et canal principal Microsoft Teams."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending || isSubmitting}
          >
            Annuler
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitDisabled}>
            {isPending || isSubmitting
              ? 'Enregistrement…'
              : mode === 'create'
                ? 'Ajouter'
                : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert" aria-live="polite">
            {errorMessage}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="teams-channel-template-display-name">Nom du canal</Label>
          <Input
            id="teams-channel-template-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Pilotage"
            disabled={!canEdit || isPending || isSubmitting}
            maxLength={50}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="teams-channel-template-description">Description</Label>
          <Input
            id="teams-channel-template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionnel"
            disabled={!canEdit || isPending || isSubmitting}
            maxLength={1000}
          />
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            disabled={!canEdit || isPending || isSubmitting}
          />
          Canal principal Starium (distinct du canal Microsoft « Général »)
        </label>
      </div>
    </StariumModal>
  );
}
