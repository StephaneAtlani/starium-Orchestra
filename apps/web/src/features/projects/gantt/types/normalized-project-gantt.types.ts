import type { ProjectGanttPayload } from '../../api/projects.api';

/** Payload Gantt après `normalizeProjectGanttPayload` — `project` toujours défini, `isLate` booléens. */
export type NormalizedProjectGanttPayload = ProjectGanttPayload & {
  project: {
    id: string;
    name: string;
    status: string;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    businessProblem: string | null;
  };
};
