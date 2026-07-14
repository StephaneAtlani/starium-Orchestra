/** Branding entreprise (client actif) pour le compte rendu HTML / e-mail. */

/** Tokens marque Starium (hex) — alignés sur apps/web/src/styles/tokens.css */
export const STARIUM_REPORT_COLORS = {
  ink: '#0e0e10',
  inkMuted: '#26241f',
  headerBg: '#1a1917',
  gold: '#e8a317',
  gold600: '#cc8e0e',
  gold700: '#5f3f00',
  gold100: '#f4d58a',
  gold050: '#fbeab5',
  paper: '#faf9f7',
  surface: '#ffffff',
  surfaceMuted: '#f4f2ee',
  border: '#e9e6e0',
  text: '#0e0e10',
  textMuted: '#5f5a52',
  textOnDark: '#fffffd',
  textOnDarkMuted: '#f4d58a',
  headerTextSoft: '#e8e7e4',
  success: '#1f8a5b',
  successBg: '#e6f4ed',
  warning: '#c77a00',
  warningBg: '#fff1dc',
  danger: '#b42318',
  dangerBg: '#fbe8e6',
} as const;

export const STARIUM_REPORT_LINK_STYLE =
  `color:${STARIUM_REPORT_COLORS.gold600};font-size:13px;text-decoration:none;font-weight:600;`;

const STARIUM_LOGO_PATH = '/brand/logo-horizontal-white.png';
const STARIUM_ICON_PATH = '/brand/icon-starium-white.png';

export function extractClientInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'SO';
  if (words.length === 1) {
    const w = words[0]!;
    return w.slice(0, 2).toUpperCase();
  }
  return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase();
}

/** Logo initiales client (data URI SVG — compatible e-mail / preview). */
export function buildClientInitialsLogoDataUri(name: string): string {
  const initials = extractClientInitials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112" role="img" aria-label="${initials}">
  <rect width="112" height="112" rx="20" fill="#E8A317"/>
  <rect x="3" y="3" width="106" height="106" rx="18" fill="#0e0e10"/>
  <text x="56" y="56" dominant-baseline="central" text-anchor="middle" fill="#fffffd" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="40" font-weight="700">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildAppAbsoluteLink(
  path: string,
  appBaseUrl?: string | null,
): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = appBaseUrl?.trim().replace(/\/$/, '');
  return base ? `${base}${normalized}` : normalized;
}

export function resolveReportClientLogoUrl(input: {
  clientName: string;
  clientLogoUrl?: string | null;
  appBaseUrl?: string | null;
}): string {
  const custom = input.clientLogoUrl?.trim();
  if (custom) {
    if (/^https?:\/\//i.test(custom) || custom.startsWith('data:')) {
      return custom;
    }
    return buildAppAbsoluteLink(custom, input.appBaseUrl);
  }
  return buildClientInitialsLogoDataUri(input.clientName);
}

export function resolveStariumReportLogoUrl(appBaseUrl?: string | null): string {
  return buildAppAbsoluteLink(STARIUM_LOGO_PATH, appBaseUrl);
}

export function resolveStariumReportIconUrl(appBaseUrl?: string | null): string {
  return buildAppAbsoluteLink(STARIUM_ICON_PATH, appBaseUrl);
}
