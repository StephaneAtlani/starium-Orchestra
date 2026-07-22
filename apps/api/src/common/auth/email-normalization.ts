import { normalizeEmail } from '../../modules/me/email-identity.util';

/** Règles de normalisation documentées (Lot 5). Pas de règle Gmail implicite. */
export function normalizeEmailForRegistry(email: string): string {
  return normalizeEmail(email);
}
