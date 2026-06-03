import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/public/public-page-shell';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Starium Orchestra',
  description:
    'Politique de confidentialité et traitement des données personnelles.',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <PublicPageShell
      title="Politique de confidentialité"
      description="Cadre général relatif à la protection des données personnelles."
    >
      <p>
        Starium Orchestra est une application privée réservée aux utilisateurs
        autorisés. Cette page décrit, à titre informatif, les grands principes
        applicables au traitement des données personnelles.
      </p>
      <p className="font-medium text-muted-foreground">
        Informations à compléter par l’éditeur du site.
      </p>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Responsable du traitement</h2>
        <p>Identité et coordonnées du responsable du traitement.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Finalités et bases légales</h2>
        <p>
          Description des finalités des traitements (accès à la plateforme,
          gestion des comptes, support) et des bases légales associées.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Durées de conservation</h2>
        <p>Durées de conservation par catégorie de données.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Droits des personnes</h2>
        <p>
          Modalités d’exercice des droits (accès, rectification, effacement,
          opposition, limitation, portabilité) et voies de recours auprès de la
          CNIL.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p>
          Point de contact dédié aux demandes relatives aux données personnelles
          : voir la page{' '}
          <a href="/contact" className="text-primary underline-offset-4 hover:underline">
            Contact
          </a>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
