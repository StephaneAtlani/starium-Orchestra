import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';
import {
  buildCanonicalGanttPayload,
  mapProjectTaskToGanttDto,
} from './lib/project-gantt-canonical.builder';
import { buildSanitizedDependsOnMap } from './lib/project-gantt-dependencies.util';

/**
 * RFC-PROJ-011 — Gantt-ready : uniquement ProjectTask + ProjectMilestone (pas d’activités).
 *
 * TODO(dépréciation): après migration frontend complète, retirer les champs legacy suivants
 * de la réponse JSON pour n’exposer que le contrat canonique + métadonnées minimales :
 * - `projectId` racine (redondant avec `project.id`)
 * - `tasks` liste plate si redondante avec `phases[].tasks` + `ungroupedTasks`
 */
@Injectable()
export class ProjectGanttService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async getGanttPayload(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);

    const [projectRow, phases, tasks, milestones] = await Promise.all([
      this.prisma.project.findFirst({
        where: { id: projectId, clientId },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          targetEndDate: true,
          businessProblem: true,
        },
      }),
      this.prisma.projectTaskPhase.findMany({
        where: { clientId, projectId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.projectTask.findMany({
        where: { clientId, projectId },
        orderBy: [
          { phase: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { plannedStartDate: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      this.prisma.projectMilestone.findMany({
        where: { clientId, projectId },
        orderBy: [{ sortOrder: 'asc' }, { targetDate: 'asc' }],
      }),
    ]);

    if (!projectRow) {
      throw new NotFoundException('Project not found');
    }

    const now = new Date();
    const canonical = buildCanonicalGanttPayload(
      projectRow,
      phases,
      tasks,
      milestones,
      now,
    );

    const depMap = buildSanitizedDependsOnMap(tasks);
    const tasksLegacyOrder = tasks.map((t) =>
      mapProjectTaskToGanttDto(t, depMap.get(t.id) ?? null, now),
    );

    return {
      projectId,
      project: canonical.project,
      phases: canonical.phases,
      tasks: tasksLegacyOrder,
      ungroupedTasks: canonical.ungroupedTasks,
      milestones: canonical.milestones,
    };
  }
}
