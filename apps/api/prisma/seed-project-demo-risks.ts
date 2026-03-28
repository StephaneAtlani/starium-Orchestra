import {
  PrismaClient,
  ProjectRiskImpact,
  ProjectRiskProbability,
  ProjectRiskStatus,
} from "@prisma/client";

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

type OwnerKey = "a" | "b" | null;

type DemoRiskSeed = {
  title: string;
  description?: string;
  probability: ProjectRiskProbability;
  impact: ProjectRiskImpact;
  status: ProjectRiskStatus;
  /** Jours par rapport à `now` (seed), ou null */
  reviewDateOffsetDays?: number | null;
  actionPlan?: string | null;
  owner?: OwnerKey;
};

function resolveOwner(
  key: OwnerKey | undefined,
  ownerA: string,
  ownerB: string,
): string | null {
  if (key === "a") return ownerA;
  if (key === "b") return ownerB;
  return null;
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
      probability: ProjectRiskProbability.LOW,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 45,
      owner: "a",
    },
    {
      title: "Résistance au changement MFA",
      description: "Adoption hétérogène des équipes métiers et helpdesk.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 21,
      owner: "b",
    },
    {
      title: "Tests de charge IdP",
      description: "Campagne de perf reportée ; mitigation par pilotes ciblés.",
      probability: ProjectRiskProbability.LOW,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.MITIGATED,
      reviewDateOffsetDays: -14,
      actionPlan: "Pilotes régionaux, monitoring renforcé.",
      owner: "a",
    },
    {
      title: "Secrets applicatifs IdP — rotation retardée",
      description:
        "Jeux de secrets proches expiration ; rotation non planifiée (démo criticité max).",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 14,
      owner: "a",
    },
  ],
  "02": [
    {
      title: "Charge equipe data",
      description: "Capacité limitée sur la brique lakehouse vs feuille de route.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 30,
      owner: "b",
    },
    {
      title: "Qualité données source",
      description: "Écarts de qualité sur les flux entrants ; dette DQ.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 60,
      owner: "a",
    },
    {
      title: "Conformité accès données",
      description: "Cartographie des droits à actualiser avant prod.",
      probability: ProjectRiskProbability.LOW,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 90,
      owner: "b",
    },
    {
      title: "Indisponibilité lakehouse — zone sensible",
      description: "RTO non tenu sur brique sensible ; escalade exploitation (démo).",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 18,
      owner: "b",
    },
  ],
  "03": [
    {
      title: "Dépendance mainframe historique",
      description: "Composants legacy encore en lecture seule post cut-over.",
      probability: ProjectRiskProbability.LOW,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.CLOSED,
      reviewDateOffsetDays: -120,
      owner: "a",
    },
    {
      title: "Retard migration clôture",
      description: "Glissement initial absorbé ; clôturé avec plan de stabilité.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.CLOSED,
      reviewDateOffsetDays: -90,
      owner: "b",
    },
    {
      title: "Vulnérabilité résiduelle — non clôturée post cut-over",
      description:
        "Projet terminé mais risque critique encore ouvert (cas limite tests synthèse).",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: -30,
      owner: "a",
    },
  ],
  "04": [
    {
      title: "Arbitrage budget non tranché",
      description: "Phase 2 bloquée en attente finance / métier.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 7,
      owner: "a",
    },
    {
      title: "Perte de compétences fonctionnelles",
      description: "Turnover MOA ; risque de perte de mémoire métier.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 14,
      owner: "b",
    },
    {
      title: "Blocage arbitrage CODIR — gel budget phase 2",
      description: "Décision attendue ; risque de standstill prolongé.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 5,
      owner: "b",
    },
  ],
  "05": [
    {
      title: "Fenetre de maintenance refusee par metier",
      description: "Créneaux durcissement non validés ; exposition prolongée.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 10,
      owner: "a",
    },
    {
      title: "Scope creep module finance",
      description: "Demandes hors périmètre cyber vs besoins finance.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 21,
      owner: "b",
    },
    {
      title: "Alignement SOC / SIEM",
      description: "Intégration journaux en cours de stabilisation.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.MITIGATED,
      reviewDateOffsetDays: -7,
      actionPlan: "Ateliers SOC, parsing normalisé.",
      owner: "a",
    },
    {
      title: "Surface ransomware — segmentation incomplète",
      description: "Zones non isolées ; propagation latérale possible.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 9,
      owner: "b",
    },
  ],
  "06": [
    {
      title: "Performance tunnel sous charge",
      description: "Point de contention checkout identifié en tests.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 5,
      owner: "b",
    },
    {
      title: "Dépendance prestataire front",
      description: "Livrables UI dépendants d’un intégrateur externe.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 20,
      owner: "a",
    },
    {
      title: "Perte transactions — pic charge checkout",
      description: "Tests de charge insuffisants ; risque rejet massif de paiements.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 4,
      owner: "b",
    },
  ],
  "07": [
    {
      title: "Coupure opérateur le jour J",
      description: "Fenêtre de bascule unique ; plan de rollback validé.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 3,
      owner: "a",
    },
    {
      title: "Formation support incomplète",
      description: "Matériel de formation en retard vs go-live.",
      probability: ProjectRiskProbability.LOW,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 12,
      owner: "b",
    },
    {
      title: "Bascule opérateur — rollback non validé en prod",
      description: "Plan B non rejoué sur environnement représentatif.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 2,
      owner: "a",
    },
  ],
  "08": [
    {
      title: "Dette agents sur parc serveurs",
      description: "Couverture APM incomplète sur un segment du parc.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 15,
      owner: "b",
    },
    {
      title: "Alertes non corrélées",
      description: "Bruit dans les alertes ; tuning des corrélations en cours.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 7,
      owner: "a",
    },
    {
      title: "SLA observabilité — non atteint sur périmètre critique",
      description: "Trou aveugle sur flux métier ; détection incident dégradée.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 11,
      owner: "b",
    },
  ],
  "09": [
    {
      title: "Délais API éditeur",
      description: "Roadmap éditeur vs besoins intégration partenaire.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 30,
      owner: "a",
    },
    {
      title: "Absence RACI projet",
      description: "Responsabilité projet non rattachée au compte Starium (démo).",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: null,
      owner: null,
    },
    {
      title: "Pénalités éditeur — SLA intégration non tenu",
      description: "Retard roadmap API vs fenêtre projet partenaire.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 25,
      owner: "b",
    },
  ],
  "10": [
    {
      title: "Conformité usage IA interne",
      description: "Cadre juridique / RGPD pour corpus internes.",
      probability: ProjectRiskProbability.MEDIUM,
      impact: ProjectRiskImpact.MEDIUM,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 60,
      owner: "b",
    },
    {
      title: "Jeux de données sensibles",
      description: "Anonymisation et cloisonnement des environnements de test.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.LOW,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 45,
      owner: "a",
    },
    {
      title: "Fuite données sensibles — corpus IA / RGPD",
      description: "Jeux de test mal anonymisés ; exposition personnelle possible.",
      probability: ProjectRiskProbability.HIGH,
      impact: ProjectRiskImpact.HIGH,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 40,
      owner: "b",
    },
  ],
};

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

    const seeds = RISKS_BY_SUFFIX[suffix];
    for (const seed of seeds) {
      const existing = await prisma.projectRisk.findFirst({
        where: { projectId: project.id, title: seed.title },
        select: { id: true },
      });
      if (existing) continue;

      const reviewDate =
        seed.reviewDateOffsetDays == null
          ? null
          : addDaysUtc(now, seed.reviewDateOffsetDays);

      await prisma.projectRisk.create({
        data: {
          clientId,
          projectId: project.id,
          title: seed.title,
          description: seed.description ?? null,
          probability: seed.probability,
          impact: seed.impact,
          status: seed.status,
          reviewDate,
          actionPlan: seed.actionPlan ?? null,
          ownerUserId: resolveOwner(seed.owner, ownerUserIdA, ownerUserIdB),
        },
      });
    }
  }
}
