/** Clés d’injection pour les durées JWT (secondes), fournies par AuthModule depuis la config. */
export const JWT_ACCESS_EXPIRATION = 'JWT_ACCESS_EXPIRATION';
export const JWT_REFRESH_EXPIRATION = 'JWT_REFRESH_EXPIRATION';

/** Parse une durée d’expiration (env ou config) avec minimum 60 s et fallback. */
export function parseExpiration(
  value: string | number | undefined,
  defaultSeconds: number,
): number {
  return Math.max(60, Number(value) || defaultSeconds);
}
