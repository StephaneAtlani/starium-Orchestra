import { ProjectRequestType } from '@prisma/client';

/** Déduit un type CDC (seuils / exempt) depuis les libellés de catégorie portefeuille. */
export function inferProjectRequestTypeFromCategoryNames(
  categoryName: string,
  parentName?: string | null,
): ProjectRequestType {
  const haystack = `${parentName ?? ''} ${categoryName}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (/(reglement|conform|rgpd|dora|legal|jurid)/.test(haystack)) {
    return ProjectRequestType.REGULATORY;
  }
  if (/(infra|reseau|network|cloud|plateforme|ops)/.test(haystack)) {
    return ProjectRequestType.INFRASTRUCTURE;
  }
  if (/(transform|metier|business)/.test(haystack)) {
    return ProjectRequestType.TRANSFORMATION;
  }
  if (/(produit|innovation|offre|experiment)/.test(haystack)) {
    return ProjectRequestType.PRODUCT;
  }
  return ProjectRequestType.EVOLUTION;
}
