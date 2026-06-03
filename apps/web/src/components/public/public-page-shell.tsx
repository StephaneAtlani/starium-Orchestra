import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PublicPageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function PublicPageShell({
  title,
  description,
  children,
  className,
}: PublicPageShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/30 via-background to-primary/16 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <nav className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Connexion
          </Link>
        </nav>
        <Card className={cn('p-6 md:p-8', className)}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="text-base">{description}</CardDescription>
            ) : null}
          </CardHeader>
          <div className="space-y-4 text-sm leading-relaxed text-foreground">
            {children}
          </div>
        </Card>
        <PublicFooter />
      </div>
    </main>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <Link href="/mentions-legales" className="hover:text-foreground">
        Mentions légales
      </Link>
      <Link href="/politique-confidentialite" className="hover:text-foreground">
        Politique de confidentialité
      </Link>
      <Link href="/contact" className="hover:text-foreground">
        Contact
      </Link>
    </footer>
  );
}

export const primaryCtaClassName =
  'inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90';

export const outlineLinkClassName =
  'text-sm text-primary underline-offset-4 hover:underline';
