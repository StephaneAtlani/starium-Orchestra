'use client';

import { Plus } from 'lucide-react';

/** CTA unique — le type de point se choisit dans la modale de création. */
export function ProjectReviewCreateSplitButton({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: () => void;
}) {
  return (
    <button
      type="button"
      className="starium-btn starium-btn-primary min-h-11"
      disabled={disabled}
      onClick={onCreate}
    >
      <Plus strokeWidth={2.5} aria-hidden />
      Créer un point
    </button>
  );
}
