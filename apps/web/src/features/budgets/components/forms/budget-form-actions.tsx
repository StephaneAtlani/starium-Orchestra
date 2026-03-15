'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface BudgetFormActionsProps {
  cancelHref: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** Désactiver le bouton Enregistrer (ex. options manquantes) */
  disableSubmit?: boolean;
}

/**
 * Actions partagées des formulaires budget : Annuler (route déterministe) + Enregistrer.
 * Ne pas utiliser router.back() pour l'annulation.
 */
export function BudgetFormActions({
  cancelHref,
  submitLabel = 'Enregistrer',
  isSubmitting = false,
  disableSubmit = false,
}: BudgetFormActionsProps) {
  const submitDisabled = isSubmitting || disableSubmit;
  return (
    <div className="flex items-center gap-2 pt-4">
      <Link
        href={cancelHref}
        className={cn(
          'inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
        )}
        aria-disabled={isSubmitting}
      >
        Annuler
      </Link>
      <Button type="submit" disabled={submitDisabled}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
