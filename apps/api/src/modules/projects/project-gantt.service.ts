import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';

/** RFC-PROJ-011 — Gantt-ready : uniquement ProjectTask + ProjectMilestone (pas d’activités). */
@Injectable()
export class ProjectGanttService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async getGanttPayload(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);

    const [tasks, milestones] = await Promise.all([
      this.prisma.projectTask.findMany({
        where: { clientId, projectId },
        orderBy: [
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

    return {
      projectId,
      tasks: tasks.map((t) => ({
        id: t.id,
        parentTaskId: t.parentTaskId,
        dependsOnTaskId: t.dependsOnTaskId,
        dependencyType: t.dependencyType,
        name: t.name,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        plannedStartDate: t.plannedStartDate?.toISOString() ?? null,
        plannedEndDate: t.plannedEndDate?.toISOString() ?? null,
        actualStartDate: t.actualStartDate?.toISOString() ?? null,
        actualEndDate: t.actualEndDate?.toISOString() ?? null,
        sortOrder: t.sortOrder,
        createdAt: t.createdAt.toISOString(),
      })),
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        targetDate: m.targetDate.toISOString(),
        linkedTaskId: m.linkedTaskId,
        sortOrder: m.sortOrder,
      })),
    };
  }
}
