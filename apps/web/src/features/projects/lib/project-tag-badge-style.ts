import type { CSSProperties } from 'react';

/** Pastille étiquette projet — couleur configurée ou gris ardoise. */
export function projectTagBadgeStyle(
  color: string | null | undefined,
): CSSProperties {
  const background = (color ?? '').trim() || '#64748B';
  return {
    backgroundColor: background,
    borderColor: background,
    color: '#FFFFFF',
  };
}
