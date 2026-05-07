'use client';

import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { useAssignClientLicense } from '../hooks/use-assign-client-license';
import { useClientLicenseUsage } from '../hooks/use-client-license-usage';

function memberLabel(m: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return name || m.email;
}

function licenseLabel(type: string, mode: string): string {
  if (type === 'READ_ONLY' && mode === 'NON_BILLABLE') return 'Lecture seule';
  if (type === 'READ_WRITE' && mode === 'CLIENT_BILLABLE') {
    return 'Lecture/Écriture (facturable)';
  }
  return 'Licence spéciale (plateforme)';
}

export function ClientLicensesAdminPage() {
  const { activeClient } = useActiveClient();
  const membersQ = useClientMembers();
  const usageQ = useClientLicenseUsage();
  const assignMutation = useAssignClientLicense();

  const firstActiveSubscriptionId =
    usageQ.data?.subscriptions.find((s) => s.status === 'ACTIVE')?.id ?? null;
  const canWrite = activeClient?.role === 'CLIENT_ADMIN';

  return (
    <PageContainer>
      <PageHeader
        title="Licences"
        description="Affectez les licences des membres du client actif. Les licences spéciales restent réservées plateforme."
      />
      <p className="mb-3 text-xs text-muted-foreground">
        Dépendance RBAC : aucun code permission dédié `licenses` exposé côté API ;
        l&apos;UI applique donc un verrouillage en écriture basé sur `CLIENT_ADMIN`.
      </p>

      {usageQ.data && (
        <div className="mb-4 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">
            Consommation RW facturable (client actif)
          </div>
          <div className="text-2xl font-semibold">
            {usageQ.data.totalReadWriteBillableUsed}
          </div>
        </div>
      )}

      {membersQ.isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {membersQ.isError && (
        <p className="text-sm text-destructive">
          {(membersQ.error as Error)?.message ?? 'Erreur de chargement'}
        </p>
      )}

      {(membersQ.data?.length ?? 0) > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Licence</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersQ.data?.map((m) => {
              const currentType = String(m.licenseType ?? 'READ_ONLY');
              const currentMode = String(m.licenseBillingMode ?? 'NON_BILLABLE');
              const currentLabel = licenseLabel(currentType, currentMode);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{memberLabel(m)}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{currentLabel}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || assignMutation.isPending}
                        onClick={() =>
                          assignMutation.mutate({
                            userId: m.id,
                            payload: {
                              licenseType: 'READ_ONLY',
                              licenseBillingMode: 'NON_BILLABLE',
                            },
                          })
                        }
                      >
                        Lecture seule
                      </Button>
                      <Button
                        size="sm"
                        disabled={
                          !canWrite ||
                          assignMutation.isPending ||
                          !firstActiveSubscriptionId
                        }
                        onClick={() =>
                          assignMutation.mutate({
                            userId: m.id,
                            payload: {
                              licenseType: 'READ_WRITE',
                              licenseBillingMode: 'CLIENT_BILLABLE',
                              subscriptionId: firstActiveSubscriptionId,
                            },
                          })
                        }
                      >
                        Lecture/Écriture
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {!canWrite && (
        <p className="mt-4 text-xs text-muted-foreground">
          Écriture désactivée côté UI : rôle client admin requis.
        </p>
      )}
    </PageContainer>
  );
}
