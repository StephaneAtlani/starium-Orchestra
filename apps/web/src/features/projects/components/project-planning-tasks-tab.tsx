'use client';

import { ProjectTaskPlanningSection } from './project-task-planning-section';

export function ProjectPlanningTasksTab({ projectId }: { projectId: string }) {
  return <ProjectTaskPlanningSection projectId={projectId} variant="full-table" />;
}
