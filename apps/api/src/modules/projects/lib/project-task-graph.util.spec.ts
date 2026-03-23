import type { PrismaService } from '../../../prisma/prisma.service';
import {
  wouldTaskDependencyCreateCycle,
  wouldTaskParentCreateCycle,
} from './project-task-graph.util';

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

function prismaWithParentChain(
  rows: Record<string, { parentTaskId: string | null }>,
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
          return row ? { parentTaskId: row.parentTaskId } : null;
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

  describe('wouldTaskParentCreateCycle', () => {
    it('retourne false si pas de parent', async () => {
      const prisma = prismaWithParentChain({});
      await expect(
        wouldTaskParentCreateCycle(prisma, clientId, projectId, 't1', null),
      ).resolves.toBe(false);
    });

    it('retourne true si la tâche est son propre parent', async () => {
      const prisma = prismaWithParentChain({});
      await expect(
        wouldTaskParentCreateCycle(prisma, clientId, projectId, 't1', 't1'),
      ).resolves.toBe(true);
    });

    it('retourne true si le parent est un descendant (cycle)', async () => {
      const prisma = prismaWithParentChain({
        t2: { parentTaskId: 't1' },
        t1: { parentTaskId: null },
      });
      await expect(
        wouldTaskParentCreateCycle(prisma, clientId, projectId, 't1', 't2'),
      ).resolves.toBe(true);
    });

    it('retourne false si hiérarchie valide', async () => {
      const prisma = prismaWithParentChain({
        t2: { parentTaskId: null },
      });
      await expect(
        wouldTaskParentCreateCycle(prisma, clientId, projectId, 't1', 't2'),
      ).resolves.toBe(false);
    });
  });
});
