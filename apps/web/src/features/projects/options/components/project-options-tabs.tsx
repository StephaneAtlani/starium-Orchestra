'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectMicrosoftSettings } from './project-microsoft-settings';
import { ProjectSyncSettings } from './project-sync-settings';
import { ProjectPlanningBucketsSettings } from './project-planning-buckets-settings';

type Props = {
  projectId: string;
};

export function ProjectOptionsTabs({ projectId }: Props) {
  return (
    <Tabs defaultValue="planning" className="w-full min-w-0">
      <TabsList variant="line" className="h-auto min-h-9 w-full flex-wrap justify-start gap-0 p-0">
        <TabsTrigger value="planning">Planning</TabsTrigger>
        <TabsTrigger value="microsoft">Microsoft 365</TabsTrigger>
        <TabsTrigger value="sync">Synchronisation</TabsTrigger>
      </TabsList>
      <TabsContent value="planning" className="mt-6 min-w-0">
        <ProjectPlanningBucketsSettings projectId={projectId} />
      </TabsContent>
      <TabsContent value="microsoft" className="mt-6 min-w-0">
        <ProjectMicrosoftSettings projectId={projectId} />
      </TabsContent>
      <TabsContent value="sync" className="mt-6 min-w-0">
        <ProjectSyncSettings projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
