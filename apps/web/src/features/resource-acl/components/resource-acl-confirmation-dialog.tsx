'use client';

import React, { useId, useState } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangleIcon } from 'lucide-react';

const CONFIRMATION_PHRASE = 'JE COMPRENDS LE RISQUE';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
  /** Override la phrase à saisir (défaut : `JE COMPRENDS LE RISQUE`). */
  confirmationPhrase?: string;
}

/**
 * Dialog de confirmation à double cran : l'utilisateur doit saisir la phrase
 * exacte pour activer le bouton « Confirmer ». Réutilisé pour :
 * - première entrée sans s'auto-ajouter (Règle UX 1) ;
 * - suppression dernière capacité ADMIN (Règle UX 2/3) ;
 * - retour mode public.
 */
export function ResourceAclConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  isPending = false,
  confirmationPhrase = CONFIRMATION_PHRASE,
}: Props) {
  const formId = useId();
  const [phrase, setPhrase] = useState('');

  const isPhraseOk = phrase.trim() === confirmationPhrase;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setPhrase('');
  }

  return (
    <StariumModal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      icon={AlertTriangleIcon}
      size="lg"
      contentClassName="sm:max-w-lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={!isPhraseOk || isPending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        <section className="space-y-2 rounded-lg border border-border/70 bg-card p-3 shadow-sm sm:p-4">
          <Label htmlFor={`${formId}-phrase`}>
            Pour confirmer, saisissez exactement&nbsp;:&nbsp;
            <span className="font-mono font-semibold">{confirmationPhrase}</span>
          </Label>
          <Input
            id={`${formId}-phrase`}
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
          />
        </section>
      </form>
    </StariumModal>
  );
}

export const RESOURCE_ACL_CONFIRMATION_PHRASE = CONFIRMATION_PHRASE;
