import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export type StewardSummaryDto = {
  id: string;
  displayName: string;
  email: string | null;
} | null;

export function toStewardDisplayName(resource: {
  name: string;
  firstName: string | null;
}): string {
  const parts = [resource.firstName?.trim(), resource.name.trim()].filter(Boolean);
  return parts.join(' ') || resource.name.trim();
}

export function toStewardSummary(
  resource:
    | { id: string; name: string; firstName: string | null; email: string | null }
    | null
    | undefined,
): StewardSummaryDto {
  if (!resource) return null;
  return {
    id: resource.id,
    displayName: toStewardDisplayName(resource),
    email: resource.email,
  };
}

export async function assertStewardHumanResource(
  prisma: PrismaService,
  clientId: string,
  resourceId: string,
): Promise<void> {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, clientId },
    select: { id: true, type: true },
  });
  if (!resource) {
    throw new NotFoundException('Ressource humaine introuvable pour ce client');
  }
  if (resource.type !== ResourceType.HUMAN) {
    throw new BadRequestException('Le steward doit être une ressource de type HUMAN');
  }
}

export const STEWARD_RESOURCE_SELECT = {
  id: true,
  name: true,
  firstName: true,
  email: true,
  type: true,
} as const;
