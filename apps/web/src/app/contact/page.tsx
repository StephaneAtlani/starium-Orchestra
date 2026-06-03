import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/public/public-page-shell';

export const metadata: Metadata = {
  title: 'Contact — Starium Orchestra',
  description: 'Coordonnées et demandes relatives à Starium Orchestra.',
};

export default function ContactPage() {
  return (
    <PublicPageShell
      title="Contact"
      description="Coordonnées pour les demandes relatives à l’accès et au support."
    >
      <p>
        Pour toute demande concernant l’accès à Starium Orchestra, le support
        utilisateur ou les questions légales, contactez l’éditeur du site via les
        coordonnées publiées ci-dessous.
      </p>
      <p className="font-medium text-muted-foreground">
        Informations à compléter par l’éditeur du site.
      </p>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Support applicatif</h2>
        <p>Adresse email ou canal de support dédié aux utilisateurs autorisés.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Demandes administratives</h2>
        <p>
          Contact pour les demandes d’habilitation, de création de compte ou de
          révocation d’accès.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Données personnelles</h2>
        <p>
          Point de contact pour les exercices de droits RGPD (voir aussi la{' '}
          <a
            href="/politique-confidentialite"
            className="text-primary underline-offset-4 hover:underline"
          >
            Politique de confidentialité
          </a>
          ).
        </p>
      </section>
    </PublicPageShell>
  );
}
