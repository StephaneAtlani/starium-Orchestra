import {
  ActivityTaxonomyKind,
  PrismaClient,
} from '@prisma/client';

const KINDS_IN_ORDER: ActivityTaxonomyKind[] = [
  ActivityTaxonomyKind.PROJECT,
  ActivityTaxonomyKind.RUN,
  ActivityTaxonomyKind.SUPPORT,
  ActivityTaxonomyKind.TRANSVERSE,
  ActivityTaxonomyKind.OTHER,
];

const DEFAULT_ROW: Record<
  ActivityTaxonomyKind,
  { name: string; sortOrder: number }
> = {
  [ActivityTaxonomyKind.PROJECT]: { name: 'Projet', sortOrder: 0 },
  [ActivityTaxonomyKind.RUN]: { name: 'Run — exploitation', sortOrder: 1 },
  [ActivityTaxonomyKind.SUPPORT]: { name: 'Support', sortOrder: 2 },
  [ActivityTaxonomyKind.TRANSVERSE]: { name: 'Transverse', sortOrder: 3 },
  [ActivityTaxonomyKind.OTHER]: { name: 'Autre', sortOrder: 4 },
};

/**
 * RFC-TEAM-006 — pour chaque kind : si aucune ligne, crée une ligne par défaut.
 * N’altère jamais les lignes existantes (pas de mise à jour rétroactive de isDefaultForKind).
 */
export async function ensureDefaultActivityTypes(
  prisma: PrismaClient,
  clientId: string,
): Promise<void> {
  for (const kind of KINDS_IN_ORDER) {
    const count = await prisma.activityType.count({
      where: { clientId, kind },
    });
    if (count > 0) {
      continue;
    }
    const def = DEFAULT_ROW[kind];
    await prisma.activityType.create({
      data: {
        clientId,
        kind,
        name: def.name,
        sortOrder: def.sortOrder,
        isDefaultForKind: true,
      },
    });
  }
}
