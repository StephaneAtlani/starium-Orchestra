/**
 * Catalogue conformité plateforme (clientId null) — proposé à tous les clients.
 * Idempotent.
 */
import type { PrismaClient } from '@prisma/client';

const PLATFORM_FRAMEWORKS: Array<{
  name: string;
  version: string;
  requirements: Array<{ code: string; title: string; category?: string; description?: string }>;
}> = [
  {
    name: 'ISO 27001',
    version: '2022',
    requirements: [
      {
        code: 'A.5.1',
        title: "Politique de sécurité de l'information",
        category: 'Annexe A',
      },
      {
        code: 'A.8.1',
        title: 'Gestion des actifs',
        category: 'Annexe A',
      },
      {
        code: 'A.12.6',
        title: 'Gestion des vulnérabilités techniques',
        category: 'Technologie',
      },
    ],
  },
  {
    name: 'NIS2',
    version: 'directive',
    requirements: [
      {
        code: 'ART.21',
        title: 'Mesures techniques et organisationnelles',
        category: 'Opérationnel',
        description: 'Article représentatif NIS2 — catalogue plateforme',
      },
    ],
  },
  {
    name: 'RGPD',
    version: '2016/679',
    requirements: [
      {
        code: 'ART.5',
        title: 'Principes relatifs au traitement',
        category: 'Principes',
      },
      {
        code: 'ART.32',
        title: 'Sécurité du traitement',
        category: 'Sécurité',
      },
    ],
  },
];

export async function ensurePlatformComplianceCatalog(
  prisma: PrismaClient,
): Promise<void> {
  for (const fw of PLATFORM_FRAMEWORKS) {
    let framework = await prisma.complianceFramework.findFirst({
      where: { clientId: null, name: fw.name, version: fw.version },
    });
    if (!framework) {
      framework = await prisma.complianceFramework.create({
        data: {
          clientId: null,
          name: fw.name,
          version: fw.version,
          isActive: true,
        },
      });
    } else if (!framework.isActive || framework.archivedAt) {
      framework = await prisma.complianceFramework.update({
        where: { id: framework.id },
        data: { isActive: true, archivedAt: null },
      });
    }

    for (let i = 0; i < fw.requirements.length; i++) {
      const req = fw.requirements[i]!;
      await prisma.complianceRequirement.upsert({
        where: {
          frameworkId_code: { frameworkId: framework.id, code: req.code },
        },
        create: {
          frameworkId: framework.id,
          code: req.code,
          title: req.title,
          description: req.description ?? 'Exigence catalogue plateforme Starium',
          category: req.category ?? null,
          sortOrder: i,
        },
        update: {
          title: req.title,
          description: req.description ?? undefined,
          category: req.category ?? null,
          sortOrder: i,
        },
      });
    }
  }
}
