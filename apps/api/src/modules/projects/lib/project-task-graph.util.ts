import type { PrismaService } from '../../../prisma/prisma.service';

type ProjectTaskGraphPrisma = Pick<PrismaService, 'projectTask'>;

/**
 * Détection de cycle sur la chaîne dependsOnTaskId (MVP : une seule dépendance par tâche).
 * Si on pose dependsOnTaskId = pred pour taskId, on suit les prédécesseurs depuis pred :
 * si on atteint taskId, c’est un cycle.
 */
export async function wouldTaskDependencyCreateCycle(
  prisma: ProjectTaskGraphPrisma,
  clientId: string,
  projectId: string,
  taskId: string,
  newDependsOnId: string | null,
): Promise<boolean> {
  if (!newDependsOnId) return false;
  if (newDependsOnId === taskId) return true;
  const visited = new Set<string>();
  let current: string | null = newDependsOnId;
  while (current) {
    if (current === taskId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const row: { dependsOnTaskId: string | null } | null =
      await prisma.projectTask.findFirst({
        where: { id: current, clientId, projectId },
        select: { dependsOnTaskId: true },
      });
    if (!row) break;
    current = row.dependsOnTaskId;
  }
  return false;
}

/** Boucle hiérarchique : enfant ne peut pas être ancêtre du parent choisi */
export async function wouldTaskParentCreateCycle(
  prisma: ProjectTaskGraphPrisma,
  clientId: string,
  projectId: string,
  taskId: string,
  newParentId: string | null,
): Promise<boolean> {
  if (!newParentId) return false;
  if (newParentId === taskId) return true;
  const visited = new Set<string>();
  let current: string | null = newParentId;
  while (current) {
    if (current === taskId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const row: { parentTaskId: string | null } | null =
      await prisma.projectTask.findFirst({
        where: { id: current, clientId, projectId },
        select: { parentTaskId: true },
      });
    if (!row) break;
    current = row.parentTaskId;
  }
  return false;
}
