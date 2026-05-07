'use client';

import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { useAssignClientLicense } from '@/features/licenses/hooks/use-assign-client-license';
import { useClientLicenseUsage } from '@/features/licenses/hooks/use-client-license-usage';
import { LicenseBillingDistribution } from './license-billing-distribution';
import { LicenseCockpitFilters, initialFilters } from './license-cockpit-filters';
import { LicenseCockpitKpiCards } from './license-cockpit-kpi-cards';
import { LicenseCockpitTable, type CockpitQuickAction } from './license-cockpit-table';
import { LicenseExpirationAlerts } from './license-expiration-alerts';
import type { CockpitMember } from '../api/licenses-cockpit';
import { applyCockpitFilters } from '../lib/apply-filters';
import { canUseClientLicenseQuickActions } from '../lib/license-quick-actions-policy';

function toCockpitMember(raw: unknown): CockpitMember {
  const m = raw as Partial<CockpitMember>;
  return {
    id: String(m.id),
    email: String(m.email ?? ''),
    firstName: m.firstName ?? null,
    lastName: m.lastName ?? null,
    role: String(m.role ?? 'CLIENT_USER'),
    status: String(m.status ?? 'ACTIVE'),
    licenseType: String(m.licenseType ?? 'READ_ONLY'),
    licenseBillingMode: String(m.licenseBillingMode ?? 'NON_BILLABLE'),
    subscriptionId: (m.subscriptionId as string | null) ?? null,
    licenseStartsAt: (m.licenseStartsAt as string | null) ?? null,
    licenseEndsAt: (m.licenseEndsAt as string | null) ?? null,
    licenseAssignmentReason:
      (m.licenseAssignmentReason as string | null) ?? null,
  };
}

export function LicensesCockpitPage() {
  const { activeClient } = useActiveClient();
  const membersQ = useClientMembers();
  const usageQ = useClientLicenseUsage();
  const assignMutation = useAssignClientLicense();
  const [filters, setFilters] = useState(initialFilters);

  const canQuickAction = canUseClientLicenseQuickActions(activeClient);
  const firstActiveSubscriptionId =
    usageQ.data?.subscriptions.find((s) => s.status === 'ACTIVE')?.id ?? null;

  const members = useMemo<CockpitMember[]>(
    () => (membersQ.data ?? []).map(toCockpitMember),
    [membersQ.data],
  );
  const filtered = useMemo(
    () => applyCockpitFilters(members, filters),
    [members, filters],
  );

  const quickActions: CockpitQuickAction[] = canQuickAction
    ? [
        {
          label: 'Lecture seule',
          variant: 'outline',
          isAvailable: (m) =>
            m.licenseType !== 'READ_ONLY' ||
            m.licenseBillingMode !== 'NON_BILLABLE',
          onRun: (m) =>
            assignMutation.mutate({
              userId: m.id,
              payload: {
                licenseType: 'READ_ONLY',
                licenseBillingMode: 'NON_BILLABLE',
              },
            }),
        },
        {
          label: 'Lecture/Écriture',
          variant: 'default',
          isAvailable: (m) =>
            !!firstActiveSubscriptionId &&
            !(
              m.licenseType === 'READ_WRITE' &&
              m.licenseBillingMode === 'CLIENT_BILLABLE'
            ),
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
      ]
    : [];

  return (
    <PageContainer>
      <PageHeader
        title="Cockpit licences"
        description="Synthèse opérationnelle des licences du client actif. Conserve les pages d'administration RFC-ACL-007 pour les flux complets."
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
          subscriptions={usageQ.data?.subscriptions ?? []}
        />
      </div>

      {membersQ.isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {membersQ.isError && (
        <p className="text-sm text-destructive">
          {(membersQ.error as Error)?.message ?? 'Erreur de chargement'}
        </p>
      )}

      {!membersQ.isLoading && !membersQ.isError && (
        <LicenseCockpitTable
          members={filtered}
          quickActions={quickActions}
          actionsBusy={assignMutation.isPending}
          showActions={canQuickAction}
        />
      )}

      {!canQuickAction && (
        <p className="mt-4 text-xs text-muted-foreground">
          Actions désactivées : seul le rôle Administrateur du client actif peut
          modifier les licences. Le backend reste source de vérité (dette
          technique RFC-ACL-010 — fallback rôle tant qu&apos;aucune permission
          dédiée n&apos;est exposée par l&apos;API).
        </p>
      )}
    </PageContainer>
  );
}
