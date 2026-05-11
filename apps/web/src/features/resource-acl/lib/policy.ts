/**
 * Policy V1 — édition ACL strictement réservée au CLIENT_ADMIN du client actif.
 *
 * - Source unique de vérité côté UI : `activeClient.role === 'CLIENT_ADMIN'`.
 *   Pas de fallback `restricted`, `permissions[]`, ou ACL.
 * - Le backend (`ClientAdminGuard`) reste source de vérité absolue ; l'UI ne fait que
 *   masquer/désactiver.
 * - Override `canEdit` : **réducteur uniquement**. Voir `resolveEffectiveCanEdit`.
 *
 * Dette technique : drop-in vers la permission `acl.manage` quand exposée backend.
 */

export interface CanEditResourceAclInput {
  activeClientRole: string | undefined;
}

export function canEditResourceAcl(input: CanEditResourceAclInput): boolean {
  return input.activeClientRole === 'CLIENT_ADMIN';
}

/**
 * Combine la policy par défaut avec un override fourni par l'hôte.
 * - `override === undefined` → policy par défaut.
 * - `override === false` → force `false` (cas budget-line readonly).
 * - `override === true` → ne peut **pas** élargir au-delà de la policy par défaut
 *   (un non-`CLIENT_ADMIN` reste à `false`).
 */
export function resolveEffectiveCanEdit(input: {
  activeClientRole: string | undefined;
  override?: boolean;
}): boolean {
  const defaultPolicy = canEditResourceAcl({
    activeClientRole: input.activeClientRole,
  });
  if (input.override === false) return false;
  return defaultPolicy && (input.override ?? true);
}
