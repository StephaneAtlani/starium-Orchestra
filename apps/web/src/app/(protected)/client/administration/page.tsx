import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';

export default function ClientAdministrationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Administration"
        description="Gestion des membres et des rôles du client."
      />
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
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
      </div>
    </PageContainer>
  );
}
