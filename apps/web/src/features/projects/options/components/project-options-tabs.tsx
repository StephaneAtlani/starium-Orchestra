'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectMicrosoftSettings } from './project-microsoft-settings';
import { ProjectSyncSettings } from './project-sync-settings';
import { ProjectPlanningBucketsSettings } from './project-planning-buckets-settings';
import { ProjectGovernanceCirclesSettings } from './project-governance-circles-settings';
import { ProjectDangerZoneSettings } from './project-danger-zone-settings';

const TAB_VALUES = ['planning', 'team', 'microsoft', 'sync', 'danger'] as const;
type TabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: TabValue = 'planning';

function parseTab(raw: string | null): TabValue {
  if (raw && TAB_VALUES.includes(raw as TabValue)) {
    return raw as TabValue;
  }
  return DEFAULT_TAB;
}

type Props = {
  projectId: string;
  projectName: string;
  projectCode: string | null;
};

export function ProjectOptionsTabs({ projectId, projectName, projectCode }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = useMemo(
    () => parseTab(searchParams.get('tab')),
    [searchParams],
  );

  const onTabChange = useCallback(
    (value: string) => {
      const next = parseTab(value);
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_TAB) {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full min-w-0">
      <TabsList variant="line" className="w-full shrink-0">
        <TabsTrigger value="planning">Planning</TabsTrigger>
        <TabsTrigger value="team">Équipe</TabsTrigger>
        <TabsTrigger value="microsoft">Microsoft 365</TabsTrigger>
        <TabsTrigger value="sync">Synchronisation</TabsTrigger>
        <TabsTrigger value="danger">Zone dangereuse</TabsTrigger>
      </TabsList>
      <TabsContent value="planning" className="mt-6 min-w-0">
        <ProjectPlanningBucketsSettings projectId={projectId} />
      </TabsContent>
      <TabsContent value="team" className="mt-6 min-w-0">
        <ProjectGovernanceCirclesSettings projectId={projectId} />
      </TabsContent>
      <TabsContent value="microsoft" className="mt-6 min-w-0">
        <ProjectMicrosoftSettings projectId={projectId} />
      </TabsContent>
      <TabsContent value="sync" className="mt-6 min-w-0">
        <ProjectSyncSettings projectId={projectId} />
      </TabsContent>
      <TabsContent value="danger" className="mt-6 min-w-0">
        <ProjectDangerZoneSettings
          projectId={projectId}
          projectName={projectName}
          projectCode={projectCode}
        />
      </TabsContent>
    </Tabs>
  );
}

export { parseTab as parseProjectOptionsTab, TAB_VALUES as PROJECT_OPTIONS_TAB_VALUES };
