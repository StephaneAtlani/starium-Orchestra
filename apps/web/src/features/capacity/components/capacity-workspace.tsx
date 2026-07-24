'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CalendarDays, Gauge, ListChecks } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import {
  WorkspaceTabBar,
  WorkspaceTabBarPanel,
  type WorkspaceTabBarItem,
} from '@/components/layout/workspace-tab-bar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { CapacityAllocationsPanel } from './capacity-allocations-panel';
import { CapacityDashboardPanel } from './capacity-dashboard-panel';
import { CapacityMembersPanel } from './capacity-members-panel';
import { CapacitySettingsPanel } from './capacity-settings-panel';
import {
  parseCapacityTab,
  type CapacityWorkspaceTab,
} from '../types/capacity.types';

const TAB_ITEMS: WorkspaceTabBarItem[] = [
  { id: 'pilotage', label: 'Pilotage', icon: Gauge },
  { id: 'affectations', label: 'Affectations', icon: ListChecks },
  { id: 'reglages', label: 'Réglages', icon: CalendarDays },
];

export function CapacityWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();

  const canRead = has('capacity.read');
  const canManageSettings = has('capacity.settings.manage');
  const canManageMembers = has('capacity.members.manage');
  const canManageAllocations = has('capacity.allocations.manage');

  const tab = useMemo(
    () => parseCapacityTab(searchParams.get('tab')),
    [searchParams],
  );

  const setTab = useCallback(
    (id: string) => {
      const next = parseCapacityTab(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Capacité des équipes"
          description="Voir qui est disponible, affecter de la charge, régler le calendrier — trois gestes."
        />

        {permsLoading ? <LoadingState rows={2} /> : null}
        {permsError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>Impossible de charger vos permissions.</AlertDescription>
          </Alert>
        ) : null}
        {permsSuccess && !canRead ? (
          <Alert variant="destructive">
            <AlertTitle>Accès refusé</AlertTitle>
            <AlertDescription>Permission capacity.read requise.</AlertDescription>
          </Alert>
        ) : null}

        {permsSuccess && canRead ? (
          <div className="flex flex-col gap-4">
            <WorkspaceTabBar
              items={TAB_ITEMS}
              activeId={tab}
              onSelect={setTab}
              ariaLabel="Sections capacité"
              mobileEyebrow="Capacité"
              selectId="capacity-workspace-tab"
            />
            <WorkspaceTabBarPanel>
              {tab === 'pilotage' ? <CapacityDashboardPanel /> : null}
              {tab === 'affectations' ? (
                <CapacityAllocationsPanel canManage={canManageAllocations} />
              ) : null}
              {tab === 'reglages' ? (
                <CapacityReglagesTab
                  canManageSettings={canManageSettings}
                  canManageMembers={canManageMembers}
                />
              ) : null}
            </WorkspaceTabBarPanel>
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}

function CapacityReglagesTab({
  canManageSettings,
  canManageMembers,
}: {
  canManageSettings: boolean;
  canManageMembers: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Rappel.</strong> L’équipe de capacité =
        WorkTeam principale du collaborateur. Le pilotage additionne la capacité des personnes
        rattachées. Les affectations consomment cette capacité.
      </p>
      <CapacitySettingsPanel canManage={canManageSettings} />
      <CapacityMembersPanel canManage={canManageMembers} />
    </div>
  );
}

export type { CapacityWorkspaceTab };
