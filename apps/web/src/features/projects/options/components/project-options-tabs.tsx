'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectMicrosoftSettings } from './project-microsoft-settings';
import { ProjectSyncSettings } from './project-sync-settings';
import { ProjectPlanningBucketsSettings } from './project-planning-buckets-settings';
import { ProjectGovernanceCirclesSettings } from './project-governance-circles-settings';
import { ProjectDangerZoneSettings } from './project-danger-zone-settings';

type Props = {
  projectId: string;
  projectName: string;
  projectCode: string | null;
};

export function ProjectOptionsTabs({ projectId, projectName, projectCode }: Props) {
  return (
    <Tabs defaultValue="planning" className="w-full min-w-0">
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
