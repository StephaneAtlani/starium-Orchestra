import { NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ResourceHumanRow = {
  id: string;
  name: string;
  firstName: string | null;
  email: string | null;
};

/** Libellé affichage pour une Resource HUMAN (nom + prénom). */
export function resourceHumanDisplayName(r: {
  name: string;
  firstName: string | null;
}): string {
  const n = [r.firstName?.trim(), r.name.trim()].filter(Boolean).join(' ').trim();
  return n || r.name.trim();
}

/** Vérifie que la ressource existe, est scopée client et `type = HUMAN`. */
export async function assertResourceHuman(
  prisma: PrismaService,
  clientId: string,
  resourceId: string,
): Promise<ResourceHumanRow> {
  const r = await prisma.resource.findFirst({
    where: { id: resourceId, clientId, type: ResourceType.HUMAN },
    select: { id: true, name: true, firstName: true, email: true },
  });
  if (!r) {
    throw new NotFoundException('Ressource Humaine introuvable');
  }
  return r;
}
