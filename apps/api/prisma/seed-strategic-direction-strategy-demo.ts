import {
  PrismaClient,
  StrategicDirectionStrategyStatus,
} from "@prisma/client";

function projectCodePrefix(slug: string): string {
  const map: Record<string, string> = {
    "neotech-ai": "NEO",
    "batipro-groupe": "BAT",
    "medisys-sante": "MED",
    "globaltrans-france": "GTF",
    "globaltrans-germany": "GTG",
    "industria-group": "IND",
  };
  return map[slug] ?? slug.replace(/-/g, "").toUpperCase().slice(0, 5);
}

type SeedDirection = {
  code: string;
  name: string;
  description: string;
  accentTone: string;
  parentLabel: string;
  ownerLabel: string;
  fteCount: number;
  /** euros → stockés en cents */
  operatingBudgetEur: number;
  sortOrder: number;
};

type SeedStrategy = {
  title: string;
  horizonLabel: string;
  horizonStartYear: number;
  horizonYearCount: number;
  ambition: string;
  context: string;
  statement: string;
  status: StrategicDirectionStrategyStatus;
  approvedAt?: Date;
  submittedAt?: Date;
  ownAxes: Array<{ id: string; name: string; tone: string }>;
  /** contributions relatives ax1..ax4 → mappées sur les vrais ids vision */
  alignPct: number[];
  budgetsByYearEur: Record<string, number>;
  majorInitiatives: Array<{
    id: string;
    title: string;
    ownerLabel: string;
    budgetEur: number;
    progressPct: number;
    lane: number;
    startMonthOffset: number;
    endMonthOffset: number;
    strategicAxisIndexes: number[];
    milestones?: Array<{ monthOffset: number; label: string }>;
    linkedProjectNames?: string[];
  }>;
  expectedOutcomes: Array<{
    title: string;
    ownerLabel?: string;
    target: string;
    current: string;
    progressPct: number;
  }>;
  risks: Array<{
    name: string;
    probability?: string;
    impact?: string;
    ownerLabel?: string;
    level: string;
  }>;
  kpis: Array<{ label: string; value: string; detail?: string }>;
  contentBlocks: Array<{ kind: string; title: string; body?: string }>;
};

/** Seed mock `STG_SEED` (strategie.js) — DSI + DAF. */
const MOCK_PACKS: Array<{ direction: SeedDirection; strategy: SeedStrategy }> = [
  {
    direction: {
      code: "DSI",
      name: "Direction des Systèmes d'Information",
      description:
        "Infrastructure et exploitation, applications métiers, cybersécurité, data et gouvernance IT du groupe.",
      accentTone: "info",
      parentLabel: "Direction Générale",
      ownerLabel: "Claire Dubois",
      fteCount: 78,
      operatingBudgetEur: 12_400_000,
      sortOrder: 1,
    },
    strategy: {
      title: "Schéma directeur SI 2026-2028",
      horizonLabel: "2026 → 2028",
      horizonStartYear: 2026,
      horizonYearCount: 3,
      ambition:
        "Devenir le partenaire de transformation des métiers : un socle IT sécurisé et industrialisé, des produits numériques livrés en continu, une donnée exploitable par tous.",
      context:
        "Le SI groupe doit absorber la croissance, réduire la dette technique et répondre aux exigences DORA / cyber sans freiner le time-to-market métier.",
      statement:
        "Socle cloud industrialisé, produits numériques continus, données gouvernées, cybersécurité by design.",
      status: StrategicDirectionStrategyStatus.APPROVED,
      approvedAt: new Date("2026-05-02T10:00:00.000Z"),
      ownAxes: [
        { id: "own-1", name: "Socle & exploitation", tone: "info" },
        { id: "own-2", name: "Produits & data", tone: "purple" },
        { id: "own-3", name: "Cyber & conformité", tone: "gold" },
        { id: "own-4", name: "Compétences IT", tone: "teal" },
      ],
      alignPct: [90, 85, 70, 55],
      budgetsByYearEur: { "2026": 4_200_000, "2027": 4_600_000, "2028": 3_600_000 },
      majorInitiatives: [
        {
          id: "c1",
          title: "Migration Cloud hybride",
          ownerLabel: "Marc Dupont",
          budgetEur: 3_200_000,
          progressPct: 62,
          lane: 0,
          startMonthOffset: 0,
          endMonthOffset: 14,
          strategicAxisIndexes: [0, 1],
          linkedProjectNames: ["Migration Cloud"],
          milestones: [
            { monthOffset: 5, label: "Bascule du socle" },
            { monthOffset: 14, label: "Décommissionnement DC" },
          ],
        },
        {
          id: "c2",
          title: "Refonte Portail Client",
          ownerLabel: "Sophie Leroy",
          budgetEur: 1_800_000,
          progressPct: 48,
          lane: 1,
          startMonthOffset: 3,
          endMonthOffset: 17,
          strategicAxisIndexes: [1],
          linkedProjectNames: ["Refonte Portail Client"],
          milestones: [{ monthOffset: 11, label: "MEP v1" }],
        },
        {
          id: "c3",
          title: "Plateforme Data & BI",
          ownerLabel: "Julien Tan",
          budgetEur: 2_400_000,
          progressPct: 15,
          lane: 1,
          startMonthOffset: 12,
          endMonthOffset: 28,
          strategicAxisIndexes: [0, 1],
          milestones: [{ monthOffset: 20, label: "Premier domaine métier" }],
        },
        {
          id: "c4",
          title: "Conformité DORA",
          ownerLabel: "Alice Bernard",
          budgetEur: 900_000,
          progressPct: 70,
          lane: 2,
          startMonthOffset: 0,
          endMonthOffset: 11,
          strategicAxisIndexes: [2],
          linkedProjectNames: ["Conformité DORA"],
          milestones: [{ monthOffset: 11, label: "Attestation régulateur" }],
        },
        {
          id: "c5",
          title: "SOC & détection 24/7",
          ownerLabel: "Alice Bernard",
          budgetEur: 1_500_000,
          progressPct: 20,
          lane: 2,
          startMonthOffset: 9,
          endMonthOffset: 23,
          strategicAxisIndexes: [2],
        },
        {
          id: "c6",
          title: "Archivage & conformité légale",
          ownerLabel: "Alice Bernard",
          budgetEur: 600_000,
          progressPct: 0,
          lane: 2,
          startMonthOffset: 18,
          endMonthOffset: 30,
          strategicAxisIndexes: [2],
        },
        {
          id: "c7",
          title: "Académie IT interne",
          ownerLabel: "Claire Dubois",
          budgetEur: 400_000,
          progressPct: 35,
          lane: 3,
          startMonthOffset: 6,
          endMonthOffset: 24,
          strategicAxisIndexes: [3],
          milestones: [{ monthOffset: 12, label: "Première promotion" }],
        },
      ],
      expectedOutcomes: [
        {
          title: "Disponibilité des services critiques",
          ownerLabel: "Marc Dupont",
          target: "99,9 % de disponibilité",
          current: "99,72 %",
          progressPct: 78,
        },
        {
          title: "Réduire la dette technique de 30 %",
          ownerLabel: "Julien Tan",
          target: "-30 % de composants obsolètes",
          current: "-13 %",
          progressPct: 45,
        },
        {
          title: "Sécurité by design sur tous les cadrages",
          ownerLabel: "Alice Bernard",
          target: "100 % des projets",
          current: "62 %",
          progressPct: 60,
        },
        {
          title: "Time-to-market des évolutions < 6 semaines",
          ownerLabel: "Sophie Leroy",
          target: "6 semaines",
          current: "11 semaines",
          progressPct: 35,
        },
      ],
      risks: [
        {
          name: "Pénurie de compétences cloud",
          probability: "Élevée",
          impact: "Fort",
          ownerLabel: "CD",
          level: "danger",
        },
        {
          name: "Dépendance à un intégrateur unique",
          probability: "Moyenne",
          impact: "Fort",
          ownerLabel: "MD",
          level: "warning",
        },
        {
          name: "Retard réglementaire DORA",
          probability: "Moyenne",
          impact: "Critique",
          ownerLabel: "AB",
          level: "danger",
        },
        {
          name: "Adhésion métier à la plateforme data",
          probability: "Faible",
          impact: "Moyen",
          ownerLabel: "JT",
          level: "info",
        },
      ],
      kpis: [
        { label: "Disponibilité", value: "99,72 %", detail: "cible 99,9 %" },
        { label: "Coût IT / CA", value: "3,1 %", detail: "médiane secteur 3,4 %" },
        { label: "Satisfaction interne", value: "7,8/10", detail: "+0,6 vs 2025" },
        { label: "Incidents majeurs", value: "4", detail: "12 mois glissants" },
      ],
      contentBlocks: [
        {
          kind: "text",
          title: "Principes directeurs",
          body: "1 — Cloud d'abord, exceptions documentées et arbitrées en comité d'architecture.\n2 — Une seule source de vérité par domaine de données.\n3 — Sécurité intégrée au cadrage, jamais en contrôle final.\n4 — Aucun nouveau développement sans propriétaire métier identifié.",
        },
        {
          kind: "image",
          title: "Architecture cible 2028",
          body: "Schéma d’architecture applicative et d’infrastructure cible",
        },
        {
          kind: "text",
          title: "Trajectoire de décommissionnement",
          body: "37 applications au périmètre. 12 décommissionnées d'ici fin 2026, 18 d'ici 2027, le solde intégré au socle cible. Chaque sortie est conditionnée à la reprise des données et à l'accord du métier propriétaire.",
        },
      ],
    },
  },
  {
    direction: {
      code: "DAF",
      name: "Direction Administrative et Financière",
      description:
        "Contrôle de gestion, comptabilité, trésorerie, achats et pilotage de la performance économique du groupe.",
      accentTone: "teal",
      parentLabel: "Direction Générale",
      ownerLabel: "Pierre Moreau",
      fteCount: 34,
      operatingBudgetEur: 4_100_000,
      sortOrder: 2,
    },
    strategy: {
      title: "Schéma directeur Finance 2026-2028",
      horizonLabel: "2026 → 2028",
      horizonStartYear: 2026,
      horizonYearCount: 3,
      ambition:
        "Faire de la fonction finance un copilote des métiers : une clôture rapide et fiable, des processus dématérialisés de bout en bout, une vision de la performance disponible en continu.",
      context:
        "La finance doit industrialiser ses processus (e-invoicing, ERP) tout en renforçant le contrôle interne et le pilotage de la dette.",
      statement:
        "Clôture accélérée, facturation dématérialisée, ERP consolidé, pilotage de performance en continu.",
      status: StrategicDirectionStrategyStatus.SUBMITTED,
      submittedAt: new Date("2026-06-18T10:00:00.000Z"),
      ownAxes: [
        { id: "own-1", name: "Pilotage de la performance", tone: "info" },
        { id: "own-2", name: "Industrialisation des processus", tone: "gold" },
        { id: "own-3", name: "Maîtrise des risques financiers", tone: "teal" },
      ],
      alignPct: [60, 40, 65, 20],
      budgetsByYearEur: { "2026": 1_100_000, "2027": 1_500_000, "2028": 800_000 },
      majorInitiatives: [
        {
          id: "d1",
          title: "Refonte du cycle budgétaire",
          ownerLabel: "Pierre Moreau",
          budgetEur: 350_000,
          progressPct: 55,
          lane: 0,
          startMonthOffset: 0,
          endMonthOffset: 9,
          strategicAxisIndexes: [0],
          milestones: [
            { monthOffset: 9, label: "Budget 2027 en nouveau format" },
          ],
        },
        {
          id: "d2",
          title: "Dématérialisation facture fournisseur",
          ownerLabel: "Nadia Cherif",
          budgetEur: 500_000,
          progressPct: 40,
          lane: 1,
          startMonthOffset: 2,
          endMonthOffset: 16,
          strategicAxisIndexes: [0, 2],
          milestones: [{ monthOffset: 10, label: "Obligation e-invoicing" }],
        },
        {
          id: "d3",
          title: "Consolidation ERP finance",
          ownerLabel: "Nadia Cherif",
          budgetEur: 2_100_000,
          progressPct: 10,
          lane: 1,
          startMonthOffset: 12,
          endMonthOffset: 32,
          strategicAxisIndexes: [1],
          milestones: [{ monthOffset: 24, label: "Bascule entité pilote" }],
        },
        {
          id: "d4",
          title: "Contrôle interne & conformité",
          ownerLabel: "Hugo Petit",
          budgetEur: 300_000,
          progressPct: 25,
          lane: 2,
          startMonthOffset: 6,
          endMonthOffset: 22,
          strategicAxisIndexes: [2],
        },
        {
          id: "d5",
          title: "Pilotage de la dette & trésorerie",
          ownerLabel: "Pierre Moreau",
          budgetEur: 200_000,
          progressPct: 0,
          lane: 0,
          startMonthOffset: 14,
          endMonthOffset: 26,
          strategicAxisIndexes: [0],
        },
        {
          id: "d6",
          title: "Plateforme data finance",
          ownerLabel: "Hugo Petit",
          budgetEur: 450_000,
          progressPct: 0,
          lane: 0,
          startMonthOffset: 16,
          endMonthOffset: 30,
          strategicAxisIndexes: [0, 1],
        },
      ],
      expectedOutcomes: [
        {
          title: "Clôture mensuelle en 5 jours ouvrés",
          ownerLabel: "Pierre Moreau",
          target: "5 jours",
          current: "9 jours",
          progressPct: 40,
        },
        {
          title: "90 % des factures fournisseurs dématérialisées",
          ownerLabel: "Nadia Cherif",
          target: "90 %",
          current: "51 %",
          progressPct: 52,
        },
        {
          title: "Écart prévision / réalisé budgétaire < 3 %",
          ownerLabel: "Hugo Petit",
          target: "3 %",
          current: "6,8 %",
          progressPct: 30,
        },
      ],
      risks: [
        {
          name: "Retard e-invoicing réglementaire",
          probability: "Moyenne",
          impact: "Critique",
          ownerLabel: "NC",
          level: "danger",
        },
        {
          name: "Qualité des données de gestion",
          probability: "Élevée",
          impact: "Moyen",
          ownerLabel: "HP",
          level: "warning",
        },
        {
          name: "Charge de la double tenue pendant l’ERP",
          probability: "Élevée",
          impact: "Fort",
          ownerLabel: "NC",
          level: "danger",
        },
      ],
      kpis: [
        { label: "Délai de clôture", value: "9 j", detail: "cible 5 j" },
        { label: "Factures dématérialisées", value: "51 %", detail: "cible 90 %" },
        { label: "Écart budgétaire", value: "6,8 %", detail: "cible < 3 %" },
        { label: "Coût fonction finance", value: "0,9 % du CA", detail: "stable" },
      ],
      contentBlocks: [
        {
          kind: "text",
          title: "Principes directeurs",
          body: "1 — Une donnée financière saisie une seule fois, à la source.\n2 — Pas de nouvel outil sans suppression d'un existant.\n3 — Le contrôle de gestion accompagne les métiers, il ne les contrôle pas à distance.\n4 — Conformité réglementaire traitée en anticipation, jamais en rattrapage.",
        },
        {
          kind: "image",
          title: "Cartographie des processus finance",
          body: "Schéma des flux comptables et budgétaires cibles",
        },
      ],
    },
  },
];

function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

function mapAxisIds(
  indexes: number[],
  visionAxisIds: string[],
): string[] {
  return indexes
    .map((i) => visionAxisIds[i])
    .filter((id): id is string => Boolean(id));
}

function buildAxisContributions(
  alignPct: number[],
  visionAxisIds: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  visionAxisIds.forEach((id, i) => {
    const pct = alignPct[i] ?? 0;
    out[id] = Math.max(0, Math.min(100, pct));
  });
  return out;
}

/**
 * RFC-STRAT-011 — schémas directeurs mock (DSI / DAF) pour alimenter
 * `/strategic-direction-strategy` et le consolidé groupe.
 */
export async function ensureDemoStrategicDirectionStrategies(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
  actorUserId?: string | null,
): Promise<{ directions: number; strategies: number }> {
  const prefix = projectCodePrefix(slug);

  const vision = await prisma.strategicVision.findFirst({
    where: { clientId, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });
  if (!vision) {
    console.warn(
      `⚠️  [${slug}] aucune vision active — seed schémas directeurs ignoré.`,
    );
    return { directions: 0, strategies: 0 };
  }

  const visionAxes = await prisma.strategicAxis.findMany({
    where: { clientId, visionId: vision.id, status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true },
  });
  const visionAxisIds = visionAxes.map((a) => a.id);

  let directionsUpserted = 0;
  let strategiesUpserted = 0;

  for (const pack of MOCK_PACKS) {
    const code = `${prefix}-${pack.direction.code}`;
    const dirData = {
      name: pack.direction.name,
      description: pack.direction.description,
      accentTone: pack.direction.accentTone,
      parentLabel: pack.direction.parentLabel,
      fteCount: pack.direction.fteCount,
      operatingBudgetCents: BigInt(eurToCents(pack.direction.operatingBudgetEur)),
      sortOrder: pack.direction.sortOrder,
      isActive: true,
    };

    let direction = await prisma.strategicDirection.findFirst({
      where: { clientId, code },
      select: { id: true },
    });
    if (direction) {
      await prisma.strategicDirection.update({
        where: { id: direction.id },
        data: dirData,
      });
    } else {
      direction = await prisma.strategicDirection.create({
        data: { clientId, code, ...dirData },
        select: { id: true },
      });
    }
    directionsUpserted += 1;

    const s = pack.strategy;
    const budgetsByYear: Record<string, number> = {};
    for (const [y, eur] of Object.entries(s.budgetsByYearEur)) {
      budgetsByYear[y] = eurToCents(eur);
    }

    const majorInitiatives = s.majorInitiatives.map((c) => ({
      id: c.id,
      title: c.title,
      ownerLabel: c.ownerLabel,
      budgetCents: eurToCents(c.budgetEur),
      progressPct: c.progressPct,
      lane: c.lane,
      startMonthOffset: c.startMonthOffset,
      endMonthOffset: c.endMonthOffset,
      strategicAxisIds: mapAxisIds(c.strategicAxisIndexes, visionAxisIds),
      milestones: c.milestones ?? [],
      linkedProjectNames: c.linkedProjectNames ?? [],
    }));

    const payload = {
      title: s.title,
      horizonLabel: s.horizonLabel,
      horizonStartYear: s.horizonStartYear,
      horizonYearCount: s.horizonYearCount,
      ambition: s.ambition,
      context: s.context,
      statement: s.statement,
      ownerLabel: pack.direction.ownerLabel,
      status: s.status,
      submittedAt: s.submittedAt ?? null,
      submittedByUserId: s.submittedAt ? actorUserId ?? null : null,
      approvedAt: s.approvedAt ?? null,
      approvedByUserId: s.approvedAt ? actorUserId ?? null : null,
      ownAxes: s.ownAxes,
      axisContributions: buildAxisContributions(s.alignPct, visionAxisIds),
      budgetsByYear,
      majorInitiatives,
      expectedOutcomes: s.expectedOutcomes,
      risks: s.risks,
      kpis: s.kpis.map((k) => ({
        label: k.label,
        value: k.value,
        detail: k.detail,
      })),
      contentBlocks: s.contentBlocks,
      rejectionReason: null,
      archivedReason: null,
      archivedAt: null,
    };

    const existing = await prisma.strategicDirectionStrategy.findFirst({
      where: {
        clientId,
        directionId: direction.id,
        alignedVisionId: vision.id,
        NOT: { status: StrategicDirectionStrategyStatus.ARCHIVED },
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });

    let strategyId: string;
    if (existing) {
      await prisma.strategicDirectionStrategy.update({
        where: { id: existing.id },
        data: payload,
      });
      strategyId = existing.id;
    } else {
      const created = await prisma.strategicDirectionStrategy.create({
        data: {
          clientId,
          directionId: direction.id,
          alignedVisionId: vision.id,
          ...payload,
        },
        select: { id: true },
      });
      strategyId = created.id;
    }
    strategiesUpserted += 1;

    await prisma.strategicDirectionStrategyAxisLink.deleteMany({
      where: { clientId, strategyId },
    });
    if (visionAxisIds.length > 0) {
      await prisma.strategicDirectionStrategyAxisLink.createMany({
        data: visionAxisIds.map((strategicAxisId) => ({
          clientId,
          strategyId,
          strategicAxisId,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Enrichir les directions créées par seed-strategic-vision-demo (sans stratégie riche)
  const visionDirs = await prisma.strategicDirection.findMany({
    where: {
      clientId,
      code: { startsWith: `${prefix}-SD-` },
      isActive: true,
    },
    select: { id: true, code: true, name: true, fteCount: true },
  });

  const toneBySuffix: Record<string, string> = {
    DIG: "purple",
    CYB: "gold",
    EFF: "success",
  };

  for (const d of visionDirs) {
    const suffix = d.code.split("-").pop() ?? "DIG";
    await prisma.strategicDirection.update({
      where: { id: d.id },
      data: {
        accentTone: toneBySuffix[suffix] ?? "info",
        parentLabel: "Direction Générale",
        ...(d.fteCount == null ? { fteCount: 12 } : {}),
      },
    });

    const hasStrategy = await prisma.strategicDirectionStrategy.findFirst({
      where: {
        clientId,
        directionId: d.id,
        alignedVisionId: vision.id,
        NOT: { status: StrategicDirectionStrategyStatus.ARCHIVED },
      },
      select: { id: true },
    });
    if (hasStrategy) continue;

    const created = await prisma.strategicDirectionStrategy.create({
      data: {
        clientId,
        directionId: d.id,
        alignedVisionId: vision.id,
        title: `Schéma directeur — ${d.name}`,
        horizonLabel: "2026 → 2028",
        horizonStartYear: 2026,
        horizonYearCount: 3,
        ambition: `Porter l’ambition « ${d.name} » au service de la vision groupe.`,
        context: `Direction stratégique issue du seed vision (${d.code}).`,
        statement: `Priorités ${d.name} alignées sur la vision active.`,
        ownerLabel: "Direction",
        status: StrategicDirectionStrategyStatus.DRAFT,
        ownAxes: [
          { id: "own-1", name: "Transformation", tone: "info" },
          { id: "own-2", name: "Run & industrialisation", tone: "teal" },
        ],
        axisContributions: buildAxisContributions([50, 40, 35, 25], visionAxisIds),
        budgetsByYear: {
          "2026": eurToCents(400_000),
          "2027": eurToCents(500_000),
          "2028": eurToCents(450_000),
        },
        majorInitiatives: [
          {
            id: `${suffix.toLowerCase()}-1`,
            title: `Chantier phare — ${d.name}`,
            ownerLabel: "PMO",
            budgetCents: eurToCents(350_000),
            progressPct: 20,
            lane: 0,
            startMonthOffset: 2,
            endMonthOffset: 18,
            strategicAxisIds: mapAxisIds([0], visionAxisIds),
            milestones: [],
            linkedProjectNames: [],
          },
        ],
        expectedOutcomes: [
          {
            title: "Avancement du chantier phare",
            target: "100 %",
            current: "20 %",
            progressPct: 20,
          },
        ],
        risks: [
          {
            name: "Capacité insuffisante",
            level: "warning",
            probability: "Moyenne",
            impact: "Moyen",
          },
        ],
        kpis: [
          { label: "Avancement", value: "20 %", detail: "chantier phare" },
        ],
        contentBlocks: [
          {
            kind: "text",
            title: "Note seed",
            body: "Schéma directeur minimal généré pour compléter le portefeuille Directions.",
          },
        ],
      },
      select: { id: true },
    });
    strategiesUpserted += 1;
    directionsUpserted += 1;

    if (visionAxisIds.length > 0) {
      await prisma.strategicDirectionStrategyAxisLink.createMany({
        data: visionAxisIds.map((strategicAxisId) => ({
          clientId,
          strategyId: created.id,
          strategicAxisId,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log(
    `🧭 [${slug}] schémas directeurs démo : directions≈${directionsUpserted}, stratégies≈${strategiesUpserted} (vision « ${vision.title} »)`,
  );

  return { directions: directionsUpserted, strategies: strategiesUpserted };
}
