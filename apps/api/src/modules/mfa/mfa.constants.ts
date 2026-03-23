/** Durée de validité d’un challenge MFA login. */
export const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000;

/** Intervalle minimum entre deux envois d’OTP email (fallback). */
export const MFA_EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;

/** Tentatives max par challenge avant blocage. */
export const MFA_MAX_ATTEMPTS = 5;

/** Nombre de codes de secours générés à l’activation TOTP. */
export const MFA_RECOVERY_CODE_COUNT = 8;

export const MFA_TOTP_ISSUER = 'Starium Orchestra';
