import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/public/public-page-shell';

export const metadata: Metadata = {
  title: 'Mentions légales — Starium Orchestra',
  description: 'Mentions légales de la plateforme Starium Orchestra.',
};

export default function MentionsLegalesPage() {
  return (
    <PublicPageShell
      title="Mentions légales"
      description="Informations légales relatives à l’accès et à l’utilisation de Starium Orchestra."
    >
      <p>
        La présente page regroupe les mentions légales applicables au site et à
        l’application Starium Orchestra.
      </p>
      <p className="font-medium text-muted-foreground">
        Informations à compléter par l’éditeur du site.
      </p>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Éditeur du site</h2>
        <p>Raison sociale, forme juridique, capital, siège social.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Directeur de la publication</h2>
        <p>Nom et qualité du responsable de publication.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Hébergement</h2>
        <p>
          Identité de l’hébergeur, adresse et moyens de contact de l’hébergeur.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p>
          Pour toute question relative aux mentions légales, utilisez la page{' '}
          <a href="/contact" className="text-primary underline-offset-4 hover:underline">
            Contact
          </a>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
