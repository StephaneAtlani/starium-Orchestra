import type { ResourceAffiliation, ResourceListItem, ResourceType } from '@/services/resources';

/** Libellés UI (valeurs API inchangées : HUMAN, MATERIAL, LICENSE). */
export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  HUMAN: 'Humaine',
  MATERIAL: 'Matériel',
  LICENSE: 'Licence',
};

export const RESOURCE_AFFILIATION_LABEL: Record<ResourceAffiliation, string> = {
  INTERNAL: 'Interne',
  EXTERNAL: 'Externe',
};

/** Affichage liste / fiche : « Prénom Nom » pour les ressources Humaine si prénom renseigné. */
export function formatResourceDisplayName(r: ResourceListItem): string {
  const fn = r.firstName?.trim();
  if (r.type === 'HUMAN' && fn) {
    return `${fn} ${r.name}`.trim();
  }
  return r.name;
}
