import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientAccessModelHelpPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Modèle d’accès"
        description="Référence produit : ce qui est en production aujourd’hui vs la cible organisationnelle (RFC-ORG-001)."
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Modèle opérationnel actuel (RFC-ACL-014)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-3 text-muted-foreground">
            <p>
              Les droits effectifs combinent jusqu’à <strong>six contrôles</strong> : licence
              utilisateur, abonnement client (si facturable), module activé pour le client,
              visibilité module pour le profil, permissions RBAC (<code>permissionCodes</code> via{' '}
              <code>GET /api/me/permissions</code>), puis ACL ressource lorsque la ressource est en
              mode restreint.
            </p>
            <p>
              Le diagnostic <code>GET /api/access-diagnostics/effective-rights/me</code> (paramètres{' '}
              <code>intent</code>, <code>resourceType</code>, <code>resourceId</code>) est prévu pour
              être appelé <strong>à la demande</strong> (popover « Pourquoi ce niveau d’accès ? », panneau
              d’erreur), pas sur chaque rendu de page.
            </p>
            <p>
              L’écran d’administration des entrées ACL s’intitule <strong>Accès à la ressource</strong>{' '}
              (bouton et dialogue). Les niveaux ACL restent affichés comme READ / WRITE / ADMIN.
            </p>
            <p>
              Le champ <code>roles[]</code> renvoyé par <code>GET /api/me/permissions</code> est{' '}
              <strong>strictement informatif</strong> ; l’interface ne doit pas en déduire les droits :
              seule la liste <code>permissionCodes</code> fait foi pour masquer ou afficher les actions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modèle cible (RFC-ORG-001 et au-delà)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-3 text-muted-foreground">
            <p>
              Le socle organisationnel (<code>OrgUnit</code>, <code>OrgGroup</code>, rattachements
              ressource Humaine) peut être déployé en admin indépendamment du moteur d’accès décrit
              ci-dessus.
            </p>
            <p>
              Les notions futures <code>read_scope</code>, <code>write_scope</code>,{' '}
              <code>manage_acl_scope</code> et périmètres métier ne sont <strong>pas</strong> appliquées
              dans le moteur tant qu’elles ne sont pas branchées explicitement dans l’autorisation.
            </p>
            <p>
              <Link
                href="/client/administration/access-model"
                className="text-primary underline-offset-4 hover:underline"
              >
                Cockpit modèle d&apos;accès
              </Link>
              {' '}
              ·{' '}
              <Link href="/client/administration" className="text-primary underline-offset-4 hover:underline">
                Administration client
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
