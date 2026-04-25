import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isAllowedInternalPageRoute } from './chatbot-internal-routes.allowlist';

export type ChatbotStructuredLink = {
  label: string;
  route: string;
  type: 'INTERNAL_PAGE' | 'MODULE';
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export async function parseAndValidateStructuredLinks(
  prisma: PrismaService,
  raw: unknown,
): Promise<ChatbotStructuredLink[] | null> {
  if (raw == null) return null;
  if (!Array.isArray(raw)) {
    throw new BadRequestException('structuredLinks doit être un tableau');
  }
  const out: ChatbotStructuredLink[] = [];
  for (const item of raw) {
    if (!isPlainObject(item)) {
      throw new BadRequestException('structuredLinks : élément invalide');
    }
    const label = item.label;
    const route = item.route;
    const type = item.type;
    if (typeof label !== 'string' || label.length === 0) {
      throw new BadRequestException('structuredLinks : label requis');
    }
    if (typeof route !== 'string' || route.length === 0) {
      throw new BadRequestException('structuredLinks : route requise');
    }
    if (route.includes('://') || route.toLowerCase().startsWith('http')) {
      throw new BadRequestException('structuredLinks : URL externe interdite');
    }
    if (type !== 'INTERNAL_PAGE' && type !== 'MODULE') {
      throw new BadRequestException('structuredLinks : type invalide');
    }
    if (type === 'INTERNAL_PAGE') {
      if (!isAllowedInternalPageRoute(route)) {
        throw new BadRequestException(
          `structuredLinks : route interne non autorisée (${route})`,
        );
      }
    } else {
      const mod = await prisma.module.findUnique({
        where: { code: route },
        select: { id: true, isActive: true },
      });
      if (!mod?.isActive) {
        throw new BadRequestException(
          `structuredLinks : module inconnu ou inactif (${route})`,
        );
      }
    }
    out.push({ label, route, type });
  }
  return out.length ? out : null;
}

export function filterStructuredLinksForResponse(
  links: ChatbotStructuredLink[] | null,
): ChatbotStructuredLink[] {
  return links ?? [];
}
