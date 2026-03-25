'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectDetail } from '@/features/projects/types/project.types';
import { ProjectGeneralSettings } from './project-general-settings';
import { ProjectMicrosoftSettings } from './project-microsoft-settings';
import { ProjectSyncSettings } from './project-sync-settings';
import { ProjectPlanningBucketsSettings } from './project-planning-buckets-settings';

type Props = {
  project: ProjectDetail;
};

export function ProjectOptionsTabs({ project }: Props) {
  return (
    <Tabs defaultValue="general" className="w-full min-w-0">
      <TabsList variant="line" className="h-auto min-h-9 w-full flex-wrap justify-start gap-0 p-0">
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="planning">Planning</TabsTrigger>
        <TabsTrigger value="microsoft">Microsoft 365</TabsTrigger>
        <TabsTrigger value="sync">Synchronisation</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-6 min-w-0">
        <ProjectGeneralSettings project={project} />
      </TabsContent>
      <TabsContent value="planning" className="mt-6 min-w-0">
        <ProjectPlanningBucketsSettings projectId={project.id} />
      </TabsContent>
      <TabsContent value="microsoft" className="mt-6 min-w-0">
        <ProjectMicrosoftSettings projectId={project.id} />
      </TabsContent>
      <TabsContent value="sync" className="mt-6 min-w-0">
        <ProjectSyncSettings projectId={project.id} />
      </TabsContent>
    </Tabs>
  );
}
