import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ActiveClientProvider } from '../context/active-client-context';
import { BrandingProvider } from '../context/branding-context';

const manrope = localFont({
  src: '../../public/fonts/Manrope-VariableFont_wght.ttf',
  weight: '200 800',
  display: 'swap',
  variable: '--font-manrope',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

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
    <html lang="fr" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
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
