/** Fallback documenté si `NEXT_PUBLIC_OFFICIAL_SITE_URL` n’est pas définie au build. */
export const OFFICIAL_SITE_URL_FALLBACK = 'https://app.starium.fr';

export function getOfficialSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_OFFICIAL_SITE_URL?.trim();
  return configured && configured.length > 0
    ? configured
    : OFFICIAL_SITE_URL_FALLBACK;
}
