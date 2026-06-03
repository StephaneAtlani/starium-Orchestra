import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  outlineLinkClassName,
  primaryCtaClassName,
  PublicFooter,
} from '@/components/public/public-page-shell';
import { getOfficialSiteUrl } from '@/lib/public-site';

export const metadata: Metadata = {
  title: 'Starium Orchestra',
  description:
    'Plateforme privée de pilotage opérationnel pour directions, CODIR et DSI.',
};

export default function HomePage() {
  const officialSiteUrl = getOfficialSiteUrl();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/30 via-background to-primary/16 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="p-8 md:p-10">
          <CardHeader className="px-0 pt-0 text-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Starium
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Starium Orchestra
            </CardTitle>
            <CardDescription className="mx-auto mt-3 max-w-lg text-base">
              Plateforme privée de pilotage opérationnel pour directions, CODIR et
              DSI.
            </CardDescription>
          </CardHeader>
          <div className="mt-6 space-y-6 text-center">
            <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Application privée réservée aux utilisateurs autorisés.
            </p>
            <div>
              <Link href="/login" className={primaryCtaClassName}>
                Accéder à la connexion
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
              <a
                href={officialSiteUrl}
                className={outlineLinkClassName}
                rel="noopener noreferrer"
              >
                Site officiel
              </a>
              <Link href="/mentions-legales" className={outlineLinkClassName}>
                Mentions légales
              </Link>
              <Link
                href="/politique-confidentialite"
                className={outlineLinkClassName}
              >
                Politique de confidentialité
              </Link>
              <Link href="/contact" className={outlineLinkClassName}>
                Contact
              </Link>
            </div>
          </div>
        </Card>
        <div className="mt-8 flex justify-center">
          <PublicFooter />
        </div>
      </div>
    </main>
  );
}
