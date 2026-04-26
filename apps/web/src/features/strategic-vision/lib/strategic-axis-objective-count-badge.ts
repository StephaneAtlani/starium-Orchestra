export function getObjectiveCountLabel(count: number): string {
  return count === 1 ? '1 objectif classé' : `${count} objectifs classés`;
}

/** Métadonnée : texte secondaire, sans pilule ni couleur d’axe. */
export const objectiveCountMetaClassName =
  'text-xs font-normal tabular-nums leading-snug text-muted-foreground';
