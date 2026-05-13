import type { OrgScopeReasonCode } from '../../common/organization/organization-scope.types';

const ORG_REASON_FR: Partial<Record<OrgScopeReasonCode, string>> = {
  ALL_RBAC_OVERRIDE: 'Accès élargi (permission lecture totale ou équivalent).',
  ALL_OVERRIDE: 'Accès élargi (override).',
  OWN_SELF_MATCH: 'Correspondance « propriété » (ressource liée à votre fiche personne).',
  OWN_NO_RESOURCE_LINK: 'Compte non relié à une ressource personne (HUMAN).',
  OWN_NO_HINT: 'Indice de propriété absent sur la ressource.',
  OWN_MISMATCH: 'La ressource n’est pas rattachée à votre fiche personne.',
  SCOPE_DESCENDANT_MATCH: 'Périmètre organisationnel : unité propriétaire dans votre sous-arbre.',
  SCOPE_DIRECT_MATCH: 'Périmètre organisationnel : unité propriétaire parmi vos rattachements.',
  SCOPE_NO_MEMBERSHIPS: 'Aucune unité organisationnelle active pour votre fiche personne.',
  SCOPE_NO_RESOURCE_LINK: 'Compte non relié à une ressource personne pour le périmètre.',
  SCOPE_OUT_OF_SUBTREE: 'L’unité propriétaire de la ressource est hors de votre périmètre.',
  SCOPE_OWNER_ORG_UNIT_INACTIVE: 'L’unité propriétaire est inactive, archivée ou introuvable.',
  MISSING_OWNER_ORG_UNIT: 'Aucune unité organisationnelle propriétaire sur la ressource.',
};

const ENGINE_REASON_FALLBACK: Record<string, string> = {
  ACCESS_DENIED_LICENSE: 'Licence ou abonnement insuffisant pour la lecture.',
  ACCESS_DENIED_RBAC: 'Permission métier (RBAC) insuffisante pour la lecture.',
  ACCESS_DENIED_MODULE_DISABLED: 'Module désactivé ou masqué pour ce profil.',
  ACCESS_DENIED_ACL_POLICY: 'Politique d’accès ressource (RESTRICTIVE / SHARING).',
  ACCESS_DENIED_ORG_SCOPE: 'Périmètre organisationnel : lecture refusée.',
  ACCESS_DENIED_RESOURCE_NOT_FOUND: 'Ressource introuvable dans ce contexte.',
  ACCESS_ALLOWED_BY_READ_ALL: 'Lecture autorisée (permission lecture totale).',
  ACCESS_ALLOWED_BY_SCOPE: 'Lecture autorisée (périmètre organisationnel).',
  ACCESS_ALLOWED_BY_OWN: 'Lecture autorisée (propriété / rattachement).',
  ACCESS_ALLOWED_BY_SHARING_ACL: 'Lecture autorisée (partage explicite sur la ressource).',
  ACCESS_ALLOWED_BY_LEGACY_PERMISSION: 'Lecture autorisée (permission héritée / consolidée).',
};

export function messageForOrgScopeReason(code: OrgScopeReasonCode): string {
  return ORG_REASON_FR[code] ?? `Contexte organisationnel : ${code}.`;
}

export function messageForAccessDecisionReasonCode(code: string): string {
  return ENGINE_REASON_FALLBACK[code] ?? `Décision d’accès : ${code}.`;
}

export function joinAccessDecisionReasonsFr(codes: readonly string[]): string {
  if (codes.length === 0) {
    return 'Accès refusé par le moteur de décision (RFC-018).';
  }
  return codes.map((c) => messageForAccessDecisionReasonCode(c)).join(' ');
}
