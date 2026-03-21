/**
 * Styles communs pour tableaux cockpit — en-têtes et cellules alignés (px / align cohérents).
 */

import { cn } from '@/lib/utils';

export const cockpitTableHeadRow =
  'border-border bg-muted/40 hover:bg-muted/40';

/** h-auto : surcharge le h-10 par défaut du composant Table pour un padding vertical homogène */
const thBase =
  'h-auto min-h-11 align-middle font-semibold text-muted-foreground';

/** 1re colonne (libellé principal) */
export const cockpitThFirst = cn(
  thBase,
  'min-w-0 py-3 pl-5 pr-3 text-left',
);

/** Colonnes texte (milieu) */
export const cockpitThText = cn(thBase, 'min-w-0 px-3 py-3 text-left');

/** Colonne montant (pas dernière) */
export const cockpitThNum = cn(
  thBase,
  'px-3 py-3 text-right tabular-nums',
);

/** Dernière colonne montant (marge droite tableau) */
export const cockpitThNumLast = cn(
  thBase,
  'py-3 pl-3 pr-5 text-right tabular-nums',
);

/** Dernière colonne alignée à droite (ex. action) */
export const cockpitThEndRight = cn(thBase, 'py-3 pl-3 pr-5 text-right');

/** Dernière colonne alignée à gauche (ex. badge / gravité) */
export const cockpitThEndLeft = cn(thBase, 'py-3 pl-3 pr-5 text-left');

export const cockpitTdFirst =
  'min-w-0 py-2.5 pl-5 pr-3 align-middle font-medium text-foreground';

export const cockpitTdText = 'min-w-0 px-3 py-2.5 align-middle text-muted-foreground';

export const cockpitTdNum =
  'px-3 py-2.5 text-right align-middle tabular-nums text-sm text-foreground';

export const cockpitTdNumLast =
  'py-2.5 pl-3 pr-5 text-right align-middle tabular-nums text-sm text-foreground';

export const cockpitTdEnd = 'py-2.5 pl-3 pr-5 align-middle';

export const cockpitTdEndRight = 'py-2.5 pl-3 pr-5 text-right align-middle';

/** Colonne barre de progression (dernière colonne, largeur fixe type explorateur) */
export const cockpitThProgress = cn(
  thBase,
  'w-[168px] min-w-[140px] py-3 pl-3 pr-5 text-left',
);

export const cockpitTdProgress =
  'w-[168px] min-w-[140px] py-2.5 pl-3 pr-5 align-middle';
