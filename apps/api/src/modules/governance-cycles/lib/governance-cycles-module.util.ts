import { PrismaService } from '../../../prisma/prisma.service';

const GOVERNANCE_CYCLES_MODULE_CODE = 'governance_cycles';

export async function isGovernanceCyclesModuleActive(
  prisma: PrismaService,
  clientId: string,
): Promise<boolean> {
  const mod = await prisma.module.findUnique({
    where: { code: GOVERNANCE_CYCLES_MODULE_CODE },
    include: {
      clientModules: {
        where: { clientId, status: 'ENABLED' },
        select: { id: true },
      },
    },
  });
  if (!mod?.isActive) return false;
  return mod.clientModules.length > 0;
}
