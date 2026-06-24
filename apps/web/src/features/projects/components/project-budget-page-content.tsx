import type { ProjectDetail } from '../types/project.types';
import { ProjectBudgetSection } from './project-budget-section';
import { ProjectBudgetSynthesis } from './project-budget-synthesis';

export function ProjectBudgetPageContent({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectDetail;
}) {
  return (
    <div id="project-budget" className="flex flex-col gap-[18px]">
      <ProjectBudgetSynthesis projectId={projectId} project={project} variant="page" />

      <div className="starium-proj-budget-manage">
        <h3 className="mb-4 text-sm font-bold text-[color:var(--brand-ink)]">
          Gestion des liaisons budgétaires
        </h3>
        <ProjectBudgetSection projectId={projectId} embedded />
      </div>
    </div>
  );
}
