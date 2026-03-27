import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TeamSyncSettings } from '@/features/team-sync/components/team-sync-settings';

export default function TeamSyncAdministrationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Synchronisation annuaire"
        description="Provider Microsoft Graph / Entra en MVP, avec prévisualisation, exécution et historisation des jobs."
      />
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
