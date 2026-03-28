import {
  PrismaClient,
  ProjectRiskCriticality,
  ProjectRiskImpactCategory,
  ProjectRiskStatus,
  ProjectRiskTreatmentStrategy,
} from "@prisma/client";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

type OwnerKey = "a" | "b" | null;

/** Aligné migration RFC : LOW=2, MEDIUM=3, HIGH=4 (échelle 1–5). */
type DemoRiskSeed = {
  title: string;
  description?: string;
  probability: number;
  impact: number;
  status: ProjectRiskStatus;
  /** Jours par rapport à `now` (seed), ou null */
  reviewDateOffsetDays?: number | null;
  mitigationPlan?: string | null;
  owner?: OwnerKey;
  /** Surcharges optionnelles pour une fiche risque EBIOS complète en démo */
  category?: string;
  threatSource?: string;
  businessImpact?: string;
  likelihoodJustification?: string;
  impactCategory?: ProjectRiskImpactCategory;
  contingencyPlan?: string;
  treatmentStrategy?: ProjectRiskTreatmentStrategy;
  residualRiskLevel?: ProjectRiskCriticality;
  residualJustification?: string;
  /** Échéance cible (jours depuis `now`) */
  dueDateOffsetDays?: number;
  /** Date de détection / identification (jours depuis `now`, souvent négatif) */
  detectedAtOffsetDays?: number;
};

const IMPACT_CATEGORY_ROTATION: ProjectRiskImpactCategory[] = [
  ProjectRiskImpactCategory.OPERATIONAL,
  ProjectRiskImpactCategory.FINANCIAL,
  ProjectRiskImpactCategory.LEGAL,
  ProjectRiskImpactCategory.REPUTATION,
];

function defaultTreatmentStrategy(
  status: ProjectRiskStatus,
): ProjectRiskTreatmentStrategy {
  if (status === ProjectRiskStatus.CLOSED) {
    return ProjectRiskTreatmentStrategy.ACCEPT;
  }
  return ProjectRiskTreatmentStrategy.REDUCE;
}

function defaultResidual(
  seed: DemoRiskSeed,
  criticalityLevel: ProjectRiskCriticality,
): { level: ProjectRiskCriticality; justification: string } {
  let level: ProjectRiskCriticality;
  let justification: string;
  if (seed.status === ProjectRiskStatus.CLOSED) {
    level = ProjectRiskCriticality.LOW;
    justification =
      "Risque clôturé : mesures tenues ou acceptation documentée en comité de pilotage.";
  } else if (seed.status === ProjectRiskStatus.MITIGATED) {
    level = ProjectRiskCriticality.MEDIUM;
    justification =
      "Résiduel modéré après plan d'action ; suivi trimestriel dans le registre.";
  } else if (
    criticalityLevel === ProjectRiskCriticality.CRITICAL ||
    criticalityLevel === ProjectRiskCriticality.HIGH
  ) {
    level = ProjectRiskCriticality.MEDIUM;
    justification =
      "Résiduel attendu après exécution du plan de réduction ; revue à la prochaine échéance.";
  } else {
    level = ProjectRiskCriticality.LOW;
    justification =
      "Résiduel faible ; surveillance dans le cadre du pilotage courant.";
  }
  return {
    level: seed.residualRiskLevel ?? level,
    justification: seed.residualJustification ?? justification,
  };
}

function resolveOwner(
  key: OwnerKey | undefined,
  ownerA: string,
  ownerB: string,
): string | null {
  if (key === "a") return ownerA;
  if (key === "b") return ownerB;
  return null;
}

function criticalityFromPI(
  probability: number,
  impact: number,
): { criticalityScore: number; criticalityLevel: ProjectRiskCriticality } {
  const criticalityScore = probability * impact;
  let criticalityLevel: ProjectRiskCriticality;
  if (criticalityScore <= 4) criticalityLevel = "LOW";
  else if (criticalityScore <= 9) criticalityLevel = "MEDIUM";
  else if (criticalityScore <= 16) criticalityLevel = "HIGH";
  else criticalityLevel = "CRITICAL";
  return { criticalityScore, criticalityLevel };
}

/** Anciennes lignes seed / placeholders → ré-enrichissement au prochain `prisma db seed`. */
function demoRiskNeedsEnrichment(row: {
  threatSource: string;
  businessImpact: string;
  likelihoodJustification: string | null;
  contingencyPlan: string | null;
}): boolean {
  const ts = row.threatSource.trim();
  const bi = row.businessImpact.trim();
  if (ts === "Démo seed") return true;
  if (bi === "Impact projet démo (données seed).") return true;
  if (!row.likelihoodJustification?.trim()) return true;
  if (!row.contingencyPlan?.trim()) return true;
  return false;
}

function buildDemoRiskFieldData(
  seed: DemoRiskSeed,
  now: Date,
  riskIndex: number,
  ownerUserIdA: string,
  ownerUserIdB: string,
) {
  const reviewDate =
    seed.reviewDateOffsetDays == null
      ? null
      : addDaysUtc(now, seed.reviewDateOffsetDays);

  const { criticalityScore, criticalityLevel } = criticalityFromPI(
    seed.probability,
    seed.impact,
  );
  const residual = defaultResidual(seed, criticalityLevel);

  const defaultMitigation =
    "Réduction : actions de suivi dans le registre risques et revue à l'échéance planifiée.";
  const defaultContingency =
    "Secours : escalade COPIL, réduction de périmètre ou arbitrage budget/délai selon criticité.";
  const impactCategory =
    seed.impactCategory ??
    IMPACT_CATEGORY_ROTATION[riskIndex % IMPACT_CATEGORY_ROTATION.length]!;

  const detectedAt = addDaysUtc(
    now,
    seed.detectedAtOffsetDays ?? -90 - riskIndex * 5,
  );
  const dueDateOffset =
    seed.dueDateOffsetDays ??
    (seed.status === ProjectRiskStatus.CLOSED
      ? -14 - riskIndex
      : 28 + riskIndex * 7);
  const dueDate = addDaysUtc(now, dueDateOffset);

  return {
    description:
      seed.description ??
      "Si un facteur externe se dégrade alors le projet subit un retard.",
    category: seed.category ?? "Pilotage & dépendances",
    threatSource:
      seed.threatSource ??
      "Contexte projet démo (fournisseurs, technique, organisation).",
    businessImpact:
      seed.businessImpact ??
      `Conséquences possibles sur le livrable « ${seed.title} » : délai, coût, qualité ou conformité (données seed).`,
    likelihoodJustification:
      seed.likelihoodJustification ??
      `Score probabilité ${seed.probability}/5 : positionnement issu des ateliers risques et de l'historique incidents du domaine (jeu démo).`,
    impactCategory,
    probability: seed.probability,
    impact: seed.impact,
    criticalityScore,
    criticalityLevel,
    status: seed.status,
    reviewDate,
    mitigationPlan: seed.mitigationPlan ?? defaultMitigation,
    contingencyPlan: seed.contingencyPlan ?? defaultContingency,
    ownerUserId: resolveOwner(seed.owner, ownerUserIdA, ownerUserIdB),
    dueDate,
    detectedAt,
    closedAt: seed.status === ProjectRiskStatus.CLOSED ? now : null,
    treatmentStrategy:
      seed.treatmentStrategy ?? defaultTreatmentStrategy(seed.status),
    residualRiskLevel: residual.level,
    residualJustification: residual.justification,
  };
}

async function nextRiskCodeForProject(
  prisma: PrismaClient,
  projectId: string,
): Promise<string> {
  const existing = await prisma.projectRisk.findMany({
    where: { projectId },
    select: { code: true },
  });
  let maxN = 0;
  for (const r of existing) {
    const m = /^R-(\d+)$/.exec(r.code);
    if (m) maxN = Math.max(maxN, parseInt(m[1]!, 10));
  }
  return `R-${String(maxN + 1).padStart(3, "0")}`;
}

/**
 * Risques métier démo par projet SEED-01 … SEED-10 (titres stables → findFirst + create).
 * Répartition volontaire : au moins un risque OPEN + P×I HIGH/HIGH (criticité « HIGH » calculée) par projet pour tests UI / pilotage.
 */
const RISKS_BY_SUFFIX: Record<string, DemoRiskSeed[]> = {
  "01": [
    {
      title: "Dependance fournisseur IdP",
      description: "Single vendor sur le socle SSO ; plan B fournisseur à maintenir.",
      probability: 2,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 45,
      owner: "a",
    },
    {
      title: "Résistance au changement MFA",
      description: "Adoption hétérogène des équipes métiers et helpdesk.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 21,
      owner: "b",
    },
    {
      title: "Tests de charge IdP",
      description: "Campagne de perf reportée ; mitigation par pilotes ciblés.",
      probability: 2,
      impact: 3,
      status: ProjectRiskStatus.MITIGATED,
      reviewDateOffsetDays: -14,
      mitigationPlan: "Pilotes régionaux, monitoring renforcé.",
      owner: "a",
    },
    {
      title: "Secrets applicatifs IdP — rotation retardée",
      description:
        "Jeux de secrets proches expiration ; rotation non planifiée (démo criticité max).",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 14,
      owner: "a",
    },
  ],
  "02": [
    {
      title: "Charge equipe data",
      description: "Capacité limitée sur la brique lakehouse vs feuille de route.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 30,
      owner: "b",
    },
    {
      title: "Qualité données source",
      description: "Écarts de qualité sur les flux entrants ; dette DQ.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 60,
      owner: "a",
    },
    {
      title: "Conformité accès données",
      description: "Cartographie des droits à actualiser avant prod.",
      probability: 2,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 90,
      owner: "b",
    },
    {
      title: "Indisponibilité lakehouse — zone sensible",
      description: "RTO non tenu sur brique sensible ; escalade exploitation (démo).",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 18,
      owner: "b",
    },
  ],
  "03": [
    {
      title: "Dépendance mainframe historique",
      description: "Composants legacy encore en lecture seule post cut-over.",
      probability: 2,
      impact: 2,
      status: ProjectRiskStatus.CLOSED,
      reviewDateOffsetDays: -120,
      owner: "a",
    },
    {
      title: "Retard migration clôture",
      description: "Glissement initial absorbé ; clôturé avec plan de stabilité.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.CLOSED,
      reviewDateOffsetDays: -90,
      owner: "b",
    },
    {
      title: "Vulnérabilité résiduelle — non clôturée post cut-over",
      description:
        "Projet terminé mais risque critique encore ouvert (cas limite tests synthèse).",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: -30,
      owner: "a",
    },
  ],
  "04": [
    {
      title: "Arbitrage budget non tranché",
      description: "Phase 2 bloquée en attente finance / métier.",
      probability: 4,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 7,
      owner: "a",
    },
    {
      title: "Perte de compétences fonctionnelles",
      description: "Turnover MOA ; risque de perte de mémoire métier.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 14,
      owner: "b",
    },
    {
      title: "Blocage arbitrage CODIR — gel budget phase 2",
      description: "Décision attendue ; risque de standstill prolongé.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 5,
      owner: "b",
    },
  ],
  "05": [
    {
      title: "Fenetre de maintenance refusee par metier",
      description: "Créneaux durcissement non validés ; exposition prolongée.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 10,
      owner: "a",
    },
    {
      title: "Scope creep module finance",
      description: "Demandes hors périmètre cyber vs besoins finance.",
      probability: 3,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 21,
      owner: "b",
    },
    {
      title: "Alignement SOC / SIEM",
      description: "Intégration journaux en cours de stabilisation.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.MITIGATED,
      reviewDateOffsetDays: -7,
      mitigationPlan: "Ateliers SOC, parsing normalisé.",
      owner: "a",
    },
    {
      title: "Surface ransomware — segmentation incomplète",
      description: "Zones non isolées ; propagation latérale possible.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 9,
      owner: "b",
    },
  ],
  "06": [
    {
      title: "Performance tunnel sous charge",
      description: "Point de contention checkout identifié en tests.",
      probability: 4,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 5,
      owner: "b",
    },
    {
      title: "Dépendance prestataire front",
      description: "Livrables UI dépendants d’un intégrateur externe.",
      probability: 3,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 20,
      owner: "a",
    },
    {
      title: "Perte transactions — pic charge checkout",
      description: "Tests de charge insuffisants ; risque rejet massif de paiements.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 4,
      owner: "b",
    },
  ],
  "07": [
    {
      title: "Coupure opérateur le jour J",
      description: "Fenêtre de bascule unique ; plan de rollback validé.",
      probability: 3,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 3,
      owner: "a",
    },
    {
      title: "Formation support incomplète",
      description: "Matériel de formation en retard vs go-live.",
      probability: 2,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 12,
      owner: "b",
    },
    {
      title: "Bascule opérateur — rollback non validé en prod",
      description: "Plan B non rejoué sur environnement représentatif.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 2,
      owner: "a",
    },
  ],
  "08": [
    {
      title: "Dette agents sur parc serveurs",
      description: "Couverture APM incomplète sur un segment du parc.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 15,
      owner: "b",
    },
    {
      title: "Alertes non corrélées",
      description: "Bruit dans les alertes ; tuning des corrélations en cours.",
      probability: 4,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 7,
      owner: "a",
    },
    {
      title: "SLA observabilité — non atteint sur périmètre critique",
      description: "Trou aveugle sur flux métier ; détection incident dégradée.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 11,
      owner: "b",
    },
  ],
  "09": [
    {
      title: "Délais API éditeur",
      description: "Roadmap éditeur vs besoins intégration partenaire.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 30,
      owner: "a",
    },
    {
      title: "Absence RACI projet",
      description: "Responsabilité projet non rattachée au compte Starium (démo).",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: null,
      owner: null,
    },
    {
      title: "Pénalités éditeur — SLA intégration non tenu",
      description: "Retard roadmap API vs fenêtre projet partenaire.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 25,
      owner: "b",
    },
  ],
  "10": [
    {
      title: "Conformité usage IA interne",
      description: "Cadre juridique / RGPD pour corpus internes.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 60,
      owner: "b",
    },
    {
      title: "Jeux de données sensibles",
      description: "Anonymisation et cloisonnement des environnements de test.",
      probability: 4,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 45,
      owner: "a",
    },
    {
      title: "Fuite données sensibles — corpus IA / RGPD",
      description: "Jeux de test mal anonymisés ; exposition personnelle possible.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 40,
      owner: "b",
    },
  ],
};

/** Crée / enrichit les risques pour un projet déjà résolu (suffix = « 01 » … « 10 »). */
async function syncRisksForSeedProject(
  prisma: PrismaClient,
  clientId: string,
  projectId: string,
  suffix: string,
  now: Date,
  ownerUserIdA: string,
  ownerUserIdB: string,
): Promise<void> {
  const seeds = RISKS_BY_SUFFIX[suffix];
  if (!seeds) return;

  for (let riskIndex = 0; riskIndex < seeds.length; riskIndex++) {
    const seed = seeds[riskIndex]!;
    const fieldData = buildDemoRiskFieldData(
      seed,
      now,
      riskIndex,
      ownerUserIdA,
      ownerUserIdB,
    );

    const existing = await prisma.projectRisk.findFirst({
      where: { projectId, title: seed.title },
      select: {
        id: true,
        threatSource: true,
        businessImpact: true,
        likelihoodJustification: true,
        contingencyPlan: true,
      },
    });
    if (existing) {
      if (demoRiskNeedsEnrichment(existing)) {
        await prisma.projectRisk.update({
          where: { id: existing.id },
          data: fieldData,
        });
      }
      continue;
    }

    const riskCode = await nextRiskCodeForProject(prisma, projectId);

    await prisma.projectRisk.create({
      data: {
        clientId,
        projectId,
        code: riskCode,
        title: seed.title,
        ...fieldData,
      },
    });
  }
}

/**
 * Crée les risques démo manquants (idempotent : clé projectId + title).
 */
export async function ensureDemoProjectRisks(
  prisma: PrismaClient,
  clientId: string,
  prefix: string,
  now: Date,
  ownerUserIdA: string,
  ownerUserIdB: string,
): Promise<void> {
  for (const suffix of Object.keys(RISKS_BY_SUFFIX)) {
    const code = `${prefix}-SEED-${suffix}`;
    const project = await prisma.project.findFirst({
      where: { clientId, code },
      select: { id: true },
    });
    if (!project) continue;

    await syncRisksForSeedProject(
      prisma,
      clientId,
      project.id,
      suffix,
      now,
      ownerUserIdA,
      ownerUserIdB,
    );
  }

  /** Projets *-SEED-xx* encore sans aucun risque (seed interrompu, restauration DB, etc.) */
  const orphans = await prisma.project.findMany({
    where: {
      clientId,
      code: { startsWith: `${prefix}-SEED-` },
      projectRisks: { none: {} },
    },
    select: { id: true, code: true },
  });
  for (const op of orphans) {
    const m = /-SEED-(\d{2})$/.exec(op.code);
    if (!m) continue;
    const suf = m[1]!;
    if (!RISKS_BY_SUFFIX[suf]) continue;
    await syncRisksForSeedProject(
      prisma,
      clientId,
      op.id,
      suf,
      now,
      ownerUserIdA,
      ownerUserIdB,
    );
  }
}
