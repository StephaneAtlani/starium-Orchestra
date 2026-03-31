import {
  ComplianceAssessmentStatus,
  PrismaClient,
} from "@prisma/client";

/**
 * Données démo conformité : référentiels ISO 27001 / NIS2, exigences, statuts, une preuve.
 * Idempotent : repose sur des codes stables par client.
 */
export async function ensureDemoCompliance(prisma: PrismaClient, clientId: string): Promise<void> {
  const iso = await prisma.complianceFramework.upsert({
    where: {
      clientId_name_version: {
        clientId,
        name: "ISO 27001",
        version: "2022",
      },
    },
    create: {
      clientId,
      name: "ISO 27001",
      version: "2022",
      isActive: true,
    },
    update: { isActive: true },
  });

  const nis2 = await prisma.complianceFramework.upsert({
    where: {
      clientId_name_version: {
        clientId,
        name: "NIS2",
        version: "directive",
      },
    },
    create: {
      clientId,
      name: "NIS2",
      version: "directive",
      isActive: true,
    },
    update: { isActive: true },
  });

  const isoReqs: Array<{ code: string; title: string; category?: string }> = [
    { code: "A.5.1", title: "Politique de sécurité de l'information", category: "Annexe A" },
    { code: "A.8.1", title: "Gestion des actifs", category: "Annexe A" },
    { code: "A.12.6", title: "Gestion des vulnérabilités techniques", category: "Technologie" },
  ];

  for (let i = 0; i < isoReqs.length; i++) {
    const d = isoReqs[i]!;
    await prisma.complianceRequirement.upsert({
      where: {
        frameworkId_code: { frameworkId: iso.id, code: d.code },
      },
      create: {
        frameworkId: iso.id,
        code: d.code,
        title: d.title,
        description: "Exigence démo Starium Orchestra",
        category: d.category ?? null,
        sortOrder: i,
      },
      update: { title: d.title, sortOrder: i },
    });
  }

  await prisma.complianceRequirement.upsert({
    where: {
      frameworkId_code: { frameworkId: nis2.id, code: "ART.21" },
    },
    create: {
      frameworkId: nis2.id,
      code: "ART.21",
      title: "Mesures techniques et organisationnelles (démo)",
      description: "Article représentatif NIS2 — jeu démo",
      category: "Opérationnel",
      sortOrder: 0,
    },
    update: {},
  });

  const a51 = await prisma.complianceRequirement.findFirstOrThrow({
    where: { frameworkId: iso.id, code: "A.5.1" },
    select: { id: true },
  });

  await prisma.complianceStatus.upsert({
    where: {
      clientId_requirementId: { clientId, requirementId: a51.id },
    },
    create: {
      clientId,
      requirementId: a51.id,
      status: ComplianceAssessmentStatus.PARTIALLY_COMPLIANT,
      lastAssessmentDate: new Date(),
      comment: "Évaluation initiale démo — actions en cours.",
    },
    update: {},
  });

  const a81 = await prisma.complianceRequirement.findFirstOrThrow({
    where: { frameworkId: iso.id, code: "A.8.1" },
    select: { id: true },
  });

  await prisma.complianceStatus.upsert({
    where: {
      clientId_requirementId: { clientId, requirementId: a81.id },
    },
    create: {
      clientId,
      requirementId: a81.id,
      status: ComplianceAssessmentStatus.COMPLIANT,
      lastAssessmentDate: new Date(),
      comment: null,
    },
    update: {},
  });

  const evName = "Politique IS — extrait SharePoint (démo)";
  const existingEv = await prisma.complianceEvidence.findFirst({
    where: { clientId, requirementId: a51.id, name: evName },
    select: { id: true },
  });
  if (!existingEv) {
    await prisma.complianceEvidence.create({
      data: {
        clientId,
        requirementId: a51.id,
        name: evName,
        description: "Lien fictif pour la démonstration produit",
        url: "https://example.com/demo-iso-policy",
      },
    });
  }
}
