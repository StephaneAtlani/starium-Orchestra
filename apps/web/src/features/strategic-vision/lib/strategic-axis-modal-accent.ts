import type { StariumModalAccent } from '@/components/layout/starium-modal-accent';
import type { StrategicAxisIconColor } from '../components/strategic-axis-icons';

/** Mappe la couleur d’axe vers l’accent modale Starium. */
export function strategicAxisColorToModalAccent(
  color: StrategicAxisIconColor,
): StariumModalAccent {
  const map: Record<StrategicAxisIconColor, StariumModalAccent> = {
    auto: 'amber',
    primary: 'gold',
    blue: 'blue',
    green: 'emerald',
    amber: 'amber',
    red: 'rose',
    violet: 'violet',
  };
  return map[color];
}
