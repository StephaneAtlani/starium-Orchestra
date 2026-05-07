'use client';

import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { usePlatformLicenseUsage } from '../hooks/use-platform-license-usage';

function statusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Actif';
    case 'SUSPENDED':
      return 'Suspendu';
    case 'CANCELED':
      return 'Annulé';
    case 'EXPIRED':
      return 'Expiré';
    default:
      return 'Brouillon';
  }
}

export function PlatformClientLicensesPage({ clientId }: { clientId: string }) {
  const usageQ = usePlatformLicenseUsage(clientId);

  return (
    <PageContainer>
      <PageHeader
        title="Licences client"
        description="Vue plateforme sur la consommation des licences du client."
      />

      {usageQ.isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {usageQ.isError && (
        <p className="text-sm text-destructive">
          {(usageQ.error as Error)?.message ?? 'Erreur de chargement'}
        </p>
      )}
      {usageQ.data && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">RW billables utilisés</div>
            <div className="text-2xl font-semibold">
              {usageQ.data.totalReadWriteBillableUsed}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-medium">Répartition par abonnement</h3>
            <div className="space-y-2 text-sm">
              {usageQ.data.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span>{statusLabel(sub.status)}</span>
                  <span>
                    {sub.readWriteBillableUsed} / {sub.readWriteSeatsLimit}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Dépendance connue : aucun endpoint plateforme existant ne liste les membres
            d&apos;un client via `/api/platform/clients/:clientId/users` pour permettre
            l&apos;affectation depuis cet écran.
          </p>
        </div>
      )}
    </PageContainer>
  );
}
