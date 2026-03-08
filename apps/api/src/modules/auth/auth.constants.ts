export const JWT_ACCESS_EXPIRATION = 'JWT_ACCESS_EXPIRATION';
export const JWT_REFRESH_EXPIRATION = 'JWT_REFRESH_EXPIRATION';

export function parseExpiration(
  value: string | number | undefined,
  defaultSeconds: number,
): number {
  return Math.max(60, Number(value) || defaultSeconds);
}
