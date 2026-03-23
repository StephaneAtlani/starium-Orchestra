import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // INTERNAL_API_URL : URL atteignable depuis le serveur Next (ex. http://api:3001 en Docker).
    // Ne pas confondre avec NEXT_PUBLIC_* (souvent l’URL vue par le navigateur).
    const apiUrl =
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
