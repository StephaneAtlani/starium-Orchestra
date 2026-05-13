import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@starium-orchestra/budget-exercise-calendar', '@starium-orchestra/rbac-permissions'],
  async redirects() {
    return [
      { source: '/teams/collaborators', destination: '/resources', permanent: false },
      { source: '/teams/collaborators/:path*', destination: '/resources', permanent: false },
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
};

export default nextConfig;
