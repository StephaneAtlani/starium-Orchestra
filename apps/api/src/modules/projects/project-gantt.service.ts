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

    const [phases, tasks, milestones] = await Promise.all([
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

    const taskByPhase = new Map<string, typeof tasks>();
    const ungroupedTasks: typeof tasks = [];
    for (const task of tasks) {
      if (!task.phaseId) {
        ungroupedTasks.push(task);
        continue;
      }
      const list = taskByPhase.get(task.phaseId) ?? [];
      list.push(task);
      taskByPhase.set(task.phaseId, list);
    }

    const computeDerived = (phaseTasks: typeof tasks) => {
      if (phaseTasks.length === 0) {
        return {
          derivedStartDate: null,
          derivedEndDate: null,
          derivedDurationDays: null,
          derivedProgress: null,
        };
      }
      let minStart: number | null = null;
      let maxEnd: number | null = null;
      let sumProgress = 0;
      for (const t of phaseTasks) {
        sumProgress += t.progress ?? 0;
        if (t.plannedStartDate) {
          const s = t.plannedStartDate.getTime();
          minStart = minStart === null ? s : Math.min(minStart, s);
        }
        if (t.plannedEndDate) {
          const e = t.plannedEndDate.getTime();
          maxEnd = maxEnd === null ? e : Math.max(maxEnd, e);
        }
      }
      const derivedDurationDays =
        minStart !== null && maxEnd !== null
          ? Math.max(0, Math.ceil((maxEnd - minStart) / 86400000))
          : null;
      return {
        derivedStartDate: minStart !== null ? new Date(minStart).toISOString() : null,
        derivedEndDate: maxEnd !== null ? new Date(maxEnd).toISOString() : null,
        derivedDurationDays,
        derivedProgress: Math.max(
          0,
          Math.min(100, Math.round(sumProgress / phaseTasks.length)),
        ),
      };
    };

    return {
      projectId,
      phases: phases.map((phase) => {
        const phaseTasks = taskByPhase.get(phase.id) ?? [];
        const derived = computeDerived(phaseTasks);
        return {
          id: phase.id,
          name: phase.name,
          sortOrder: phase.sortOrder,
          ...derived,
          tasks: phaseTasks.map((t) => ({
            id: t.id,
            phaseId: t.phaseId,
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
        };
      }),
      tasks: tasks.map((t) => ({
        id: t.id,
        phaseId: t.phaseId,
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
      ungroupedTasks: ungroupedTasks.map((t) => ({
        id: t.id,
        phaseId: null,
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
