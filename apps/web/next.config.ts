import type { NextConfig } from 'next';
import {
  PUBLIC_HTML_CACHE_HEADER,
  PUBLIC_HTML_ROUTES,
  SECURITY_HEADERS,
} from './src/lib/security-headers';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: [
    '@starium-orchestra/budget-exercise-calendar',
    '@starium-orchestra/rbac-permissions',
  ],
  async redirects() {
    return [
      // Anciennes routes assignments → Ressources (pas de pages /teams/assignments).
      // Ne pas rediriger /teams/collaborators : écrans admin annuaire (RFC-FE-TEAM-002).
      { source: '/teams/assignments', destination: '/resources', permanent: false },
      { source: '/teams/assignments/:path*', destination: '/resources', permanent: false },
      {
        source: '/projects/:projectId/staffing',
        destination: '/projects/:projectId',
        permanent: false,
      },
      {
        source: '/projects/:projectId/staffing/:path*',
        destination: '/projects/:projectId',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // INTERNAL_API_URL : URL atteignable depuis le serveur Next (ex. http://api:3001 en Docker).
    // afterFiles : appliqué après les routes `app/` — `app/api/auth/microsoft/callback/route.ts` reste prioritaire.
    const apiUrl =
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001';
    return {
      afterFiles: [
        { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      ],
    };
  },
  async headers() {
    const publicRouteHeaders = PUBLIC_HTML_ROUTES.map((source) => ({
      source,
      headers: [...SECURITY_HEADERS, PUBLIC_HTML_CACHE_HEADER],
    }));

    return [
      ...publicRouteHeaders,
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
