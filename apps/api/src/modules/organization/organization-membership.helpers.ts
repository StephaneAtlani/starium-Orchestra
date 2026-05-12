import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrgGroupStatus, OrgUnitStatus, Prisma, ResourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export async function assertHumanResourceForOrgMembership(
  prisma: PrismaService,
  clientId: string,
  resourceId: string,
): Promise<{ id: string; name: string; type: ResourceType; email: string | null; clientId: string }> {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, clientId },
    select: { id: true, name: true, type: true, email: true, clientId: true },
  });
  if (!resource) {
    throw new NotFoundException('Ressource introuvable pour ce client');
  }
  if (resource.type !== ResourceType.HUMAN) {
    throw new BadRequestException('Seules les ressources de type HUMAN peuvent être rattachées à l’organisation');
  }
  return resource;
}

export async function assertOrgUnitActive(
  prisma: PrismaService,
  clientId: string,
  orgUnitId: string,
): Promise<{ id: string; clientId: string; status: OrgUnitStatus }> {
  const u = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, clientId },
    select: { id: true, clientId: true, status: true },
  });
  if (!u) throw new NotFoundException('Unité organisationnelle introuvable');
  if (u.status === OrgUnitStatus.ARCHIVED) {
    throw new BadRequestException('Impossible de modifier les rattachements d’une unité archivée');
  }
  return u;
}

export async function assertOrgGroupActive(
  prisma: PrismaService,
  clientId: string,
  groupId: string,
): Promise<{ id: string; clientId: string; status: OrgGroupStatus }> {
  const g = await prisma.orgGroup.findFirst({
    where: { id: groupId, clientId },
    select: { id: true, clientId: true, status: true },
  });
  if (!g) throw new NotFoundException('Groupe métier introuvable');
  if (g.status === OrgGroupStatus.ARCHIVED) {
    throw new BadRequestException('Impossible de modifier les rattachements d’un groupe archivé');
  }
  return g;
}

/** Email du compte applicatif lié (même email que la fiche Resource HUMAN sur ce client), si présent. */
export async function resolveLinkedUserEmailForResource(
  prisma: PrismaService,
  clientId: string,
  resource: { type: ResourceType; email: string | null },
): Promise<string | null> {
  if (resource.type !== ResourceType.HUMAN || !resource.email?.trim()) {
    return null;
  }
  const cu = await prisma.clientUser.findFirst({
    where: {
      clientId,
      user: { email: { equals: resource.email.trim(), mode: 'insensitive' } },
    },
    select: { user: { select: { email: true } } },
  });
  return cu?.user.email ?? null;
}

export function isPrismaUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}
