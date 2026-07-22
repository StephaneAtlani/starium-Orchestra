/**
 * Liste blanche des relations User / UserEmailIdentity couvertes par le script de réconciliation.
 * Empreinte DMMF : à recalculer lors de l’ajout d’une relation Prisma vers User.
 */
export const RECONCILE_USER_FK_WHITELIST: Array<{
  model: string;
  field: string;
  strategy: string;
}> = [
  { model: 'ClientUser', field: 'userId', strategy: 'TRANSFERT' },
  { model: 'UserRole', field: 'userId', strategy: 'TRANSFERT' },
  { model: 'UserEmailIdentity', field: 'userId', strategy: 'FUSION' },
  { model: 'RefreshToken', field: 'userId', strategy: 'SUPPR' },
  { model: 'Collaborator', field: 'userId', strategy: 'TRANSFERT' },
  { model: 'Notification', field: 'userId', strategy: 'TRANSFERT' },
  { model: 'ProjectRequest', field: 'requesterUserId', strategy: 'BLOQUER' },
  { model: 'ChatbotKnowledgeEntry', field: 'createdByUserId', strategy: 'BLOQUER' },
  { model: 'ChatbotKnowledgeEntry', field: 'updatedByUserId', strategy: 'BLOQUER' },
  { model: 'SecurityLog', field: 'userId', strategy: 'NULL' },
];

export const RECONCILE_USER_FK_DMMF_FINGERPRINT =
  'placeholder-update-after-dmmf-extraction';

export function validateFkWhitelistAgainstDmmf(
  dmmfPairs: string[],
): { valid: boolean; fingerprint: string; missing: string[] } {
  const whitelistPairs = RECONCILE_USER_FK_WHITELIST.map(
    (e) => `${e.model}.${e.field}`,
  ).sort();
  const sortedDmmf = [...dmmfPairs].sort();
  const missing = sortedDmmf.filter((p) => !whitelistPairs.includes(p));
  return {
    valid: missing.length === 0,
    fingerprint: RECONCILE_USER_FK_DMMF_FINGERPRINT,
    missing,
  };
}
