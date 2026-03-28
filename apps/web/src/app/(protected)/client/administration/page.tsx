import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Shield, Cloud, RefreshCw, ListTree } from 'lucide-react';

export default async function ClientAdministrationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Administration"
        description="Gestion des membres, des rôles et des intégrations du client (ex. Microsoft 365)."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
        <Link href="/client/members">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Membres</h3>
                <p className="text-sm text-muted-foreground">
                  Gérer les utilisateurs et leurs rôles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/roles">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Rôles</h3>
                <p className="text-sm text-muted-foreground">
                  Créer et configurer les rôles métier
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/administration/microsoft-365">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Microsoft 365</h3>
                <p className="text-sm text-muted-foreground">
                  Connexion OAuth et tenant pour ce client
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/administration/team-sync">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Synchronisation annuaire</h3>
                <p className="text-sm text-muted-foreground">
                  Preview, exécution sync et verrouillage des collaborators
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/client/administration/risk-taxonomy">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <ListTree className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Taxonomie des risques</h3>
                <p className="text-sm text-muted-foreground">
                  Domaines et types pour les risques projets (réservé admin client)
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}
