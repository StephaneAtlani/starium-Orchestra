'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumberFr } from '@/lib/currency-format';

/** Seuils de lisibilité de la note : sous 3 on alerte, au-dessus de 4 on valorise. */
function ratingToneClass(rating: number): string {
  if (rating >= 4) return 'text-[color:var(--state-success)]';
  if (rating >= 3) return 'text-[color:var(--brand-gold-700)]';
  return 'text-destructive';
}

/**
 * Évaluation fournisseur sur 5. L'étoile est décorative : la valeur chiffrée et le
 * libellé accessible portent l'information (jamais la couleur seule).
 */
export function SupplierRating({
  rating,
  className,
}: {
  rating: number | null;
  className?: string;
}) {
  if (rating == null) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        Non évalué
      </span>
    );
  }

  const formatted = formatNumberFr(rating, { minFraction: 1, maxFraction: 1 });

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', className)}
    >
      <Star className={cn('size-3.5 fill-current', ratingToneClass(rating))} aria-hidden />
      <span className="tabular-nums">{formatted}</span>
      <span className="sr-only">sur 5</span>
    </span>
  );
}
