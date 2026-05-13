import type { EffectiveResourceAccessMode, ResourceAccessPolicyMode } from '../api/resource-acl.types';

export const RESOURCE_ACCESS_POLICY_MODE_LABEL: Record<ResourceAccessPolicyMode, string> = {
  DEFAULT: 'Par défaut (historique)',
  RESTRICTIVE: 'Restrictif',
  SHARING: 'Partage explicite',
};

export const RESOURCE_ACCESS_POLICY_MODE_HINT: Record<ResourceAccessPolicyMode, string> = {
  DEFAULT:
    'Sans entrée ACL : accès selon RBAC habituel. Dès qu’une entrée ACL existe, seuls les sujets listés ont accès.',
  RESTRICTIVE:
    'Toute lecture ou écriture exige une entrée ACL explicite. Liste vide : aucun accès via cette couche.',
  SHARING:
    'Le RBAC déjà validé sur la route sert de plancher ; les entrées ACL ajoutent des sujets sans tout bloquer par défaut.',
};
