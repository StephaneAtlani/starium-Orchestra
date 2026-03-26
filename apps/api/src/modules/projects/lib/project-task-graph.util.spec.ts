import type { PrismaService } from '../../../prisma/prisma.service';
import { wouldTaskDependencyCreateCycle } from './project-task-graph.util';

function prismaWithDependencyChain(
  rows: Record<string, { dependsOnTaskId: string | null }>,
): PrismaService {
  return {
    projectTask: {
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { id: string; clientId: string; projectId: string };
        }) => {
          const row = rows[where.id];
          return row ? { dependsOnTaskId: row.dependsOnTaskId } : null;
        },
      ),
    },
  } as unknown as PrismaService;
}


describe('project-task-graph.util', () => {
  const clientId = 'c1';
  const projectId = 'p1';

  describe('wouldTaskDependencyCreateCycle', () => {
    it('retourne false si pas de prédécesseur', async () => {
      const prisma = prismaWithDependencyChain({});
      await expect(
        wouldTaskDependencyCreateCycle(prisma, clientId, projectId, 't1', null),
      ).resolves.toBe(false);
    });

    it('retourne true si auto-dépendance', async () => {
      const prisma = prismaWithDependencyChain({});
      await expect(
        wouldTaskDependencyCreateCycle(prisma, clientId, projectId, 't1', 't1'),
      ).resolves.toBe(true);
    });

    it('retourne true si le prédécesseur mène à la tâche courante (cycle)', async () => {
      const prisma = prismaWithDependencyChain({
        t2: { dependsOnTaskId: 't1' },
        t1: { dependsOnTaskId: null },
      });
      await expect(
        wouldTaskDependencyCreateCycle(prisma, clientId, projectId, 't1', 't2'),
      ).resolves.toBe(true);
    });

    it('retourne false si chaîne sans cycle', async () => {
      const prisma = prismaWithDependencyChain({
        t2: { dependsOnTaskId: null },
      });
      await expect(
        wouldTaskDependencyCreateCycle(prisma, clientId, projectId, 't1', 't2'),
      ).resolves.toBe(false);
    });
  });
});
