'use client';

import { useEffect, useState } from 'react';
import { FileStack } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (name: string) => void;
};

export function ProcedureTemplateCreateDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nom obligatoire');
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      icon={FileStack}
      title="Nouveau modèle"
      description="Donnez un nom au modèle. Vous définirez l’outline ensuite."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="procedure-template-create-form"
            className="min-h-11 sm:min-h-9"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Création…' : 'Créer'}
          </Button>
        </>
      }
    >
      <form
        id="procedure-template-create-form"
        className="starium-form"
        onSubmit={handleSubmit}
      >
        <div className="starium-form-field">
          <Label htmlFor="tpl-name">Nom du modèle</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'tpl-name-error' : undefined}
            autoFocus
          />
          {error ? (
            <p id="tpl-name-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </StariumModal>
  );
}
