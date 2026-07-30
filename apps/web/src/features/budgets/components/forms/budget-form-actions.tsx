'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

interface BudgetFormActionsProps {
  cancelHref?: string;
  onCancel?: () => void;
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
  onCancel,
  submitLabel = 'Enregistrer',
  isSubmitting = false,
  disableSubmit = false,
}: BudgetFormActionsProps) {
  const submitDisabled = isSubmitting || disableSubmit;
  const cancelClass = cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    'min-h-11 sm:min-h-9',
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
      ) : cancelHref ? (
        <Link
          href={cancelHref}
          className={cn(cancelClass, isSubmitting && 'pointer-events-none opacity-50')}
          aria-disabled={isSubmitting}
        >
          Annuler
        </Link>
      ) : null}
      <Button
        type="submit"
        size="sm"
        className="min-h-11 sm:min-h-9"
        disabled={submitDisabled}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Enregistrement…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
