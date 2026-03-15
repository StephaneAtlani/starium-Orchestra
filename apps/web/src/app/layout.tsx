import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ActiveClientProvider } from '../context/active-client-context';
import { BrandingProvider } from '../context/branding-context';

export const metadata: Metadata = {
  title: 'Starium Orchestra',
  description: 'Plateforme de pilotage opérationnel',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <ActiveClientProvider>
            <BrandingProvider>{children}</BrandingProvider>
          </ActiveClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
