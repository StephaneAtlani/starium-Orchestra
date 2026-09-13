import { parsePwBlockIdFromNotes } from './prepare-workspace-types';

/**
 * Placeholders d’aide à la saisie (champ Brief en préparation).
 * Jamais injectés tels quels dans le mail — le brief mail = texte saisi (`objective`).
 */
export const PW_STD_BRIEF_PLACEHOLDERS: Record<string, string> = {
  presents: 'Ex. Confirmer présence / représentation…',
  objectif: 'Ex. Relire l’objectif et préparer vos attentes…',
  tour: 'Ex. Un point d’actualité ou un risque à partager…',
  actions: 'Ex. Mettre à jour le statut de vos actions ouvertes…',
  avancement: 'Ex. Réalisé, freins, prochaines étapes…',
  planning: 'Ex. Vérifier jalons et dates critiques…',
  arbitrage: 'Ex. Position et éléments de décision…',
};

/** Brief envoyé = uniquement le texte saisi en préparation (`objective`). */
export function resolveAgendaBriefPrepNote(input: {
  objective?: string | null;
}): string | null {
  const text = input.objective?.trim();
  return text || null;
}

export function briefPlaceholderForAgendaNotes(
  notes: string | null | undefined,
): string {
  const blockId = parsePwBlockIdFromNotes(notes);
  if (blockId && PW_STD_BRIEF_PLACEHOLDERS[blockId]) {
    return PW_STD_BRIEF_PLACEHOLDERS[blockId];
  }
  return 'Ce que le porteur / les participants doivent préparer avant la séance…';
}
