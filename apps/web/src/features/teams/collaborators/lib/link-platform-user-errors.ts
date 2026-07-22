import type { ApiFormError } from '../api/collaborators.api';

export type LinkPlatformUserErrorCode =
  | 'MFA_REQUIRED'
  | 'REAUTH_REQUIRED'
  | 'AMBIGUOUS'
  | 'MATCHED_OTHER_USER'
  | 'EMAIL_COLLISION'
  | 'UNKNOWN';

export function parseLinkPlatformUserError(error: unknown): {
  code: LinkPlatformUserErrorCode;
  message: string;
  status?: number;
} {
  const err = error as ApiFormError & { code?: string };
  const codeRaw = typeof err.code === 'string' ? err.code : '';
  const message = err.message?.trim() || 'Échec du rattachement.';

  if (
    codeRaw === 'MFA_REQUIRED' ||
    codeRaw === 'REAUTH_REQUIRED' ||
    codeRaw === 'AMBIGUOUS' ||
    codeRaw === 'MATCHED_OTHER_USER' ||
    codeRaw === 'EMAIL_COLLISION'
  ) {
    return { code: codeRaw, message, status: err.status };
  }

  if (/MFA|deux facteurs|TOTP/i.test(message)) {
    return { code: 'MFA_REQUIRED', message, status: err.status };
  }
  if (/connexion récente|reconnectez/i.test(message)) {
    return { code: 'REAUTH_REQUIRED', message, status: err.status };
  }

  return { code: 'UNKNOWN', message, status: err.status };
}

export function linkPlatformUserErrorTitle(code: LinkPlatformUserErrorCode): string {
  switch (code) {
    case 'MFA_REQUIRED':
      return 'Authentification à deux facteurs requise';
    case 'REAUTH_REQUIRED':
      return 'Reconnexion récente requise';
    case 'AMBIGUOUS':
      return 'Adresse ambiguë';
    case 'MATCHED_OTHER_USER':
      return 'Adresse déjà associée';
    case 'EMAIL_COLLISION':
      return 'Collision d’adresse e-mail';
    default:
      return 'Rattachement impossible';
  }
}

export function linkPlatformUserErrorGuidance(code: LinkPlatformUserErrorCode): string | null {
  switch (code) {
    case 'MFA_REQUIRED':
      return 'Activez le TOTP dans Mon compte → Sécurité, puis réessayez.';
    case 'REAUTH_REQUIRED':
      return 'Déconnectez-vous et reconnectez-vous, puis réessayez dans les 10 minutes.';
    case 'AMBIGUOUS':
      return 'Plusieurs comptes Starium correspondent à cette adresse. Réconciliation nécessaire avant rattachement.';
    case 'MATCHED_OTHER_USER':
      return 'Cette adresse annuaire correspond déjà à un autre compte. Choisissez le bon membre ou corrigez la collision.';
    case 'EMAIL_COLLISION':
      return 'Cette adresse est déjà réservée sur un autre compte.';
    default:
      return null;
  }
}
