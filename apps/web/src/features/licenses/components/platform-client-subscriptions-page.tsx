'use client';

import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { useCreatePlatformSubscription } from '../hooks/use-create-platform-subscription';
import { usePlatformLicenseUsage } from '../hooks/use-platform-license-usage';
import { usePlatformSubscriptions } from '../hooks/use-platform-subscriptions';
import { useTransitionPlatformSubscription } from '../hooks/use-transition-platform-subscription';
import type { SubscriptionStatus } from '../api/licenses';

function toDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function statusLabel(status: SubscriptionStatus): string {
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

export function PlatformClientSubscriptionsPage({
  clientId,
}: {
  clientId: string;
}) {
  const { user } = useAuth();
  const canWrite = user?.platformRole === 'PLATFORM_ADMIN';
  const [seatLimit, setSeatLimit] = useState('5');
  const subscriptionsQ = usePlatformSubscriptions(clientId);
  const usageQ = usePlatformLicenseUsage(clientId);
  const createMutation = useCreatePlatformSubscription(clientId);
  const transitionMutation = useTransitionPlatformSubscription(clientId);

  const usageBySubscription = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of usageQ.data?.subscriptions ?? []) {
      map.set(row.id, row.readWriteBillableUsed);
    }
    return map;
  }, [usageQ.data?.subscriptions]);

  return (
    <PageContainer>
      <PageHeader
        title="Abonnements client"
        description="Pilotage des abonnements du client (quota RW, statut, période)."
      />

      <div className="mb-6 rounded-lg border p-4">
        <div className="mb-3 text-sm font-medium">Créer un abonnement</div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="rw-limit">Sièges READ_WRITE inclus</Label>
            <Input
              id="rw-limit"
              value={seatLimit}
              onChange={(e) => setSeatLimit(e.target.value)}
              className="w-56"
            />
          </div>
          <Button
            type="button"
            onClick={() =>
              createMutation.mutate({
                readWriteSeatsLimit: Math.max(1, Number(seatLimit || 1)),
              })
            }
            disabled={createMutation.isPending || !canWrite}
          >
            Créer
          </Button>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Dépendance RBAC : aucun code permission dédié `licenses/subscriptions`
        exposé côté API ; l&apos;UI applique donc un verrouillage en écriture basé
        sur `PLATFORM_ADMIN`.
      </p>

      {subscriptionsQ.isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {subscriptionsQ.isError && (
        <p className="text-sm text-destructive">
          {(subscriptionsQ.error as Error)?.message ?? 'Erreur de chargement'}
        </p>
      )}
      {!subscriptionsQ.isLoading && (subscriptionsQ.data?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun abonnement pour ce client.
        </p>
      )}

      {(subscriptionsQ.data?.length ?? 0) > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statut</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Fin grâce</TableHead>
              <TableHead>Quota RW</TableHead>
              <TableHead>RW utilisés</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptionsQ.data?.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>{statusLabel(sub.status)}</TableCell>
                <TableCell>{toDate(sub.startsAt)}</TableCell>
                <TableCell>{toDate(sub.endsAt)}</TableCell>
                <TableCell>{toDate(sub.graceEndsAt)}</TableCell>
                <TableCell>{sub.readWriteSeatsLimit}</TableCell>
                <TableCell>{usageBySubscription.get(sub.id) ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        transitionMutation.mutate({
                          subscriptionId: sub.id,
                          action: 'activate',
                        })
                      }
                      disabled={transitionMutation.isPending || !canWrite}
                    >
                      Activer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        transitionMutation.mutate({
                          subscriptionId: sub.id,
                          action: 'suspend',
                        })
                      }
                      disabled={transitionMutation.isPending || !canWrite}
                    >
                      Suspendre
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        transitionMutation.mutate({
                          subscriptionId: sub.id,
                          action: 'cancel',
                        })
                      }
                      disabled={transitionMutation.isPending || !canWrite}
                    >
                      Annuler
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
}
