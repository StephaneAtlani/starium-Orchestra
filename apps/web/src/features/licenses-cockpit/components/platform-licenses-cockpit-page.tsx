'use client';

import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/context/auth-context';
import { useAssignPlatformLicense } from '@/features/licenses/hooks/use-assign-platform-license';
import { usePlatformLicenseUsage } from '@/features/licenses/hooks/use-platform-license-usage';
import { usePlatformSubscriptions } from '@/features/licenses/hooks/use-platform-subscriptions';
import { LicenseBillingDistribution } from './license-billing-distribution';
import { LicenseCockpitFilters, initialFilters } from './license-cockpit-filters';
import { LicenseCockpitKpiCards } from './license-cockpit-kpi-cards';
import { LicenseCockpitTable, type CockpitQuickAction } from './license-cockpit-table';
import { LicenseExpirationAlerts } from './license-expiration-alerts';
import { applyCockpitFilters } from '../lib/apply-filters';
import { canUsePlatformLicenseQuickActions } from '../lib/license-quick-actions-policy';
import { usePlatformClientUsers } from '../hooks/use-platform-client-users';

interface Props {
  clientId: string;
}

export function PlatformLicensesCockpitPage({ clientId }: Props) {
  const { user } = useAuth();
  const usersQ = usePlatformClientUsers(clientId);
  const usageQ = usePlatformLicenseUsage(clientId);
  const subscriptionsQ = usePlatformSubscriptions(clientId);
  const assignMutation = useAssignPlatformLicense(clientId);
  const [filters, setFilters] = useState(initialFilters);

  const canQuickAction = canUsePlatformLicenseQuickActions(user);
  const firstActiveSubscriptionId =
    usageQ.data?.subscriptions.find((s) => s.status === 'ACTIVE')?.id ?? null;

  const members = useMemo(() => usersQ.data ?? [], [usersQ.data]);
  const filtered = useMemo(
    () => applyCockpitFilters(members, filters),
    [members, filters],
  );

  const quickActions: CockpitQuickAction[] = canQuickAction
    ? [
        {
          label: 'Évaluation 30 j',
          variant: 'outline',
          isAvailable: (m) => m.licenseBillingMode !== 'EVALUATION',
          onRun: (m) =>
            assignMutation.mutate({
              userId: m.id,
              payload: {
                licenseType: 'READ_WRITE',
                licenseBillingMode: 'EVALUATION',
                licenseAssignmentReason: 'Évaluation depuis cockpit',
              },
            }),
        },
        {
          label: 'Convertir en facturable',
          variant: 'default',
          isAvailable: (m) =>
            !!firstActiveSubscriptionId &&
            (m.licenseBillingMode === 'EVALUATION' ||
              m.licenseBillingMode === 'NON_BILLABLE') &&
            m.licenseType === 'READ_WRITE',
          onRun: (m) =>
            firstActiveSubscriptionId &&
            assignMutation.mutate({
              userId: m.id,
              payload: {
                licenseType: 'READ_WRITE',
                licenseBillingMode: 'CLIENT_BILLABLE',
                subscriptionId: firstActiveSubscriptionId,
              },
            }),
        },
        {
          label: 'Révoquer',
          variant: 'destructive',
          isAvailable: (m) => m.licenseType !== 'READ_ONLY',
          onRun: (m) =>
            assignMutation.mutate({
              userId: m.id,
              payload: {
                licenseType: 'READ_ONLY',
                licenseBillingMode: 'NON_BILLABLE',
              },
            }),
        },
      ]
    : [];

  return (
    <PageContainer>
      <PageHeader
        title="Cockpit licences (plateforme)"
        description="Vue plateforme des licences d'un client. Les écrans CRUD plateforme RFC-ACL-007 restent disponibles."
      />

      <div className="mb-4">
        <LicenseCockpitKpiCards members={members} usage={usageQ.data} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LicenseBillingDistribution members={members} />
        <LicenseExpirationAlerts members={members} />
      </div>

      <div className="mb-4">
        <LicenseCockpitFilters
          filters={filters}
          onChange={setFilters}
          subscriptions={subscriptionsQ.data ?? []}
        />
      </div>

      {usersQ.isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {usersQ.isError && (
        <p className="text-sm text-destructive">
          {(usersQ.error as Error)?.message ?? 'Erreur de chargement'}
        </p>
      )}

      {!usersQ.isLoading && !usersQ.isError && (
        <LicenseCockpitTable
          members={filtered}
          quickActions={quickActions}
          actionsBusy={assignMutation.isPending}
          showActions={canQuickAction}
        />
      )}

      {!canQuickAction && (
        <p className="mt-4 text-xs text-muted-foreground">
          Actions désactivées : rôle Administrateur plateforme requis. Le
          backend reste source de vérité (dette technique RFC-ACL-010 —
          fallback rôle tant qu&apos;aucune permission dédiée n&apos;est
          exposée par l&apos;API).
        </p>
      )}
    </PageContainer>
  );
}
