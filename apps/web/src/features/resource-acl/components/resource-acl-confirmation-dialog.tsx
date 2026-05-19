'use client';

import React, { useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4"
        >
          <DialogHeader className="-mx-4 -mt-4 space-y-2 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
            <div className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-left">
                <AlertTriangleIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-destructive"
                />
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-left leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>

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

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const RESOURCE_ACL_CONFIRMATION_PHRASE = CONFIRMATION_PHRASE;
