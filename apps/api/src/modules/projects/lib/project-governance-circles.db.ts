import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_PROJECT_GOVERNANCE_CIRCLES } from './project-governance-circles.defaults';

export async function ensureDefaultGovernanceCirclesForProject(
  db: PrismaService,
  clientId: string,
  projectId: string,
): Promise<void> {
  for (const def of DEFAULT_PROJECT_GOVERNANCE_CIRCLES) {
    const existing = await db.projectGovernanceCircle.findFirst({
      where: { projectId, systemKind: def.systemKind },
    });
    if (existing) continue;
    try {
      await db.projectGovernanceCircle.create({
        data: {
          clientId,
          projectId,
          name: def.name,
          systemKind: def.systemKind,
          sortOrder: def.sortOrder,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        continue;
      }
      throw e;
    }
  }
}

export async function assertGovernanceCircleIdsBelongToProject(
  db: PrismaService,
  clientId: string,
  projectId: string,
  circleIds: string[],
): Promise<void> {
  if (circleIds.length === 0) return;
  await ensureDefaultGovernanceCirclesForProject(db, clientId, projectId);
  const unique = [...new Set(circleIds)];
  const count = await db.projectGovernanceCircle.count({
    where: { clientId, projectId, id: { in: unique } },
  });
  if (count !== unique.length) {
    throw new BadRequestException(
      'Un ou plusieurs cercles de gouvernance sont invalides pour ce projet',
    );
  }
}
