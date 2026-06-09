type HeaderEntry = { key: string; value: string };

function buildConnectSrc(): string {
  const sources = new Set<string>(["'self'"]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return Array.from(sources).join(' ');
  }
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      sources.add(parsed.origin);
    }
  } catch {
    // URL relative ou invalide : rewrites /api via même origine
  }
  return Array.from(sources).join(' ');
}

export function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === 'development';
  // Next.js dev (react-refresh / webpack) requiert unsafe-eval ; interdit en prod.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    `connect-src ${buildConnectSrc()}`,
  ];
  if (!isDev) {
    directives.push('upgrade-insecure-requests');
  }
  return directives.join('; ');
}

export const SECURITY_HEADERS: HeaderEntry[] = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy(),
  },
];

export const PUBLIC_HTML_CACHE_HEADER: HeaderEntry = {
  key: 'Cache-Control',
  value: 'no-store, no-cache, max-age=0, must-revalidate',
};

/** Routes HTML publiques : pas de cache long (déploiement / contenu légal). */
export const PUBLIC_HTML_ROUTES = [
  '/',
  '/login',
  '/mentions-legales',
  '/politique-confidentialite',
  '/contact',
] as const;
