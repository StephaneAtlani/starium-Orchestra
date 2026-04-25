/** Base URL API (sans slash final). */
export function getStariumApiBaseUrl(): string {
  if (typeof process === 'undefined') return '';
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
}

export function stariumApiPath(path: string): string {
  const base = getStariumApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
