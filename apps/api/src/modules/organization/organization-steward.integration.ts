import type { PrismaService } from '../../prisma/prisma.service';
import { assertStewardHumanResource } from './steward-resource.helpers';

export async function resolveStewardResourceIdForWrite(
  prisma: PrismaService,
  clientId: string,
  stewardResourceId: string | null | undefined,
): Promise<string | null | undefined> {
  if (stewardResourceId === undefined) return undefined;
  const next = stewardResourceId?.trim() || null;
  if (next) {
    await assertStewardHumanResource(prisma, clientId, next);
  }
  return next;
}
