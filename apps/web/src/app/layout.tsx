import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ActiveClientProvider } from '../context/active-client-context';
import { ThemeProvider } from '../context/theme-context';

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
        <ThemeProvider>
          <AuthProvider>
            <ActiveClientProvider>{children}</ActiveClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
