'use client';

import type { ProjectDetail } from '../types/project.types';
import { ProjectHierarchyBreadcrumb } from './project-hierarchy-breadcrumb';

/** Fil d’Ariane seul — au-dessus des onglets workspace (navigation inter-onglets). */
export function ProjectHierarchyStrip({ project }: { project: ProjectDetail }) {
  const ancestorChain = project.ancestorChain ?? [];
  if (ancestorChain.length === 0) return null;

  return (
    <div className="starium-project-hierarchy-strip px-4 md:px-6">
      <ProjectHierarchyBreadcrumb ancestorChain={ancestorChain} />
    </div>
  );
}
