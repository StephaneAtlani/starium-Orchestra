import { Link2 } from 'lucide-react';
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

      <section
        className="starium-proj-budget-manage"
        aria-labelledby="project-budget-links-heading"
      >
        <header className="starium-proj-budget-manage__head">
          <div className="starium-bcat-ico starium-bcat-ico--gold" aria-hidden>
            <Link2 strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 id="project-budget-links-heading" className="starium-bud-chart-title">
              Gestion des liaisons budgétaires
            </h3>
            <p className="starium-bud-chart-sub">
              Imputez le projet sur des lignes budgétaires et suivez engagements et réalisé au
              périmètre projet.
            </p>
          </div>
        </header>
        <ProjectBudgetSection projectId={projectId} embedded />
      </section>
    </div>
  );
}
