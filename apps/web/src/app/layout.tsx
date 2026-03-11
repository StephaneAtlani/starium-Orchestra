import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ActiveClientProvider } from '../context/active-client-context';

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
          <ActiveClientProvider>{children}</ActiveClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
