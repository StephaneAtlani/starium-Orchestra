import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TeamSyncSettings } from '@/features/team-sync/components/team-sync-settings';

export default function TeamSyncAdministrationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Synchronisation annuaire"
        description="Provider Microsoft Graph / Entra en MVP, avec prévisualisation, exécution et historisation des jobs."
      />
      <Alert className="mb-4">
        <AlertTitle>Après une sync</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Pour rattacher une fiche ADDS à un compte membre Starium :
            Administration → Membres → Modifier le membre → section « Rattachement ADDS ↔ compte
            membre » (MFA + connexion récente). Pas de lien ADDS ↔ ADDS.
          </p>
          <Link
            href="/client/members"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex min-h-11')}
          >
            Ouvrir Membres
          </Link>
        </AlertDescription>
      </Alert>
      <Alert className="mb-4">
        <AlertTitle>Lecture seule des collaborateurs synchronisés</AlertTitle>
        <AlertDescription>
          Quand la synchronisation est active avec verrouillage, les champs issus de
          l’annuaire sont en lecture seule pour les non admin client. Les champs
          locaux Starium restent éditables selon les droits habituels.
        </AlertDescription>
      </Alert>
      <TeamSyncSettings />
    </PageContainer>
  );
}
