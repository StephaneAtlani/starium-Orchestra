import {
  PrismaClient,
  ProjectRiskCriticality,
  ProjectRiskImpactCategory,
  ProjectRiskStatus,
  ProjectRiskTreatmentStrategy,
} from "@prisma/client";
import { resolveRiskTypeIdForLegacyImpact } from "../src/modules/risk-taxonomy/risk-taxonomy-defaults";

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
  complementaryTreatmentMeasures?: string;
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
  const lj = row.likelihoodJustification?.trim() ?? "";
  if (ts === "Démo seed") return true;
  if (bi === "Impact projet démo (données seed).") return true;
  if (lj.includes("jeu démo")) return true;
  if (bi.includes("(données seed)")) return true;
  if (!lj) return true;
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
    "Réduction : plan d’action avec responsable nommé, jalons et suivi dans le registre ; revue à la prochaine échéance de pilotage.";
  const defaultContingency =
    "Secours : escalade au comité de pilotage, réduction de périmètre temporaire, arbitrage délai ou budget selon la criticité.";
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
      `Si les causes du scénario se matérialisent, le livrable « ${seed.title} » subit une dérive de délai, de coût ou de qualité, avec effet sur les utilisateurs ou la conformité.`,
    category: seed.category ?? "Pilotage & dépendances",
    threatSource:
      seed.threatSource ??
      "Environnement projet : dépendances techniques, organisationnelles ou contractuelles non entièrement maîtrisées.",
    businessImpact:
      seed.businessImpact ??
      `Impact possible sur le périmètre « ${seed.title} » : retard de mise en service, surcoût, dégradation du service ou exposition conformité / réputation.`,
    likelihoodJustification:
      seed.likelihoodJustification ??
      `Probabilité ${seed.probability}/5 : positionnement issu de l’atelier risques, de l’historique incidents du domaine et de l’avis du responsable du risque.`,
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
    complementaryTreatmentMeasures:
      seed.complementaryTreatmentMeasures?.trim() ?? null,
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
      category: "Identité & accès",
      description:
        "Si le fournisseur d’identité est indisponible ou dégrade fortement son service, alors l’authentification unique de l’entreprise est compromise et les accès applicatifs sont bloqués ou dégradés.",
      probability: 2,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 45,
      owner: "a",
      threatSource:
        "Concentration sur un fournisseur SaaS IdP ; peu ou pas de secours opérationnel validé sur le périmètre production.",
      businessImpact:
        "Interruption ou ralentissement des connexions, retards sur les applications dépendantes du SSO, risque de non-respect d’engagements internes ou clients.",
      likelihoodJustification:
        "2/5 : historique fournisseur globalement stable, mais incidents sectoriels récents et dépendance structurelle forte sans plan B formalisé.",
      mitigationPlan:
        "Cartographier les applications critiques, documenter un mode dégradé (MFA de secours / procédures manuelles), renégocier SLA et clause de sortie.",
      contingencyPlan:
        "Cellule de crise SI, communication métiers, bascule selon runbook si indisponibilité au-delà du seuil défini.",
    },
    {
      title: "Résistance au changement MFA",
      category: "Adoption & conduite du changement",
      description:
        "Si les équipes métiers et le support ne maîtrisent pas le dispositif MFA, alors le taux d’appels et d’incidents augmente et le déploiement s’étale au-delà de la fenêtre prévue.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 21,
      owner: "b",
      threatSource:
        "Charge support et métiers sous-estimée ; matériel de formation et communication utilisateurs en retard sur certains sites.",
      businessImpact:
        "Saturation du helpdesk, frustration utilisateurs, risque de contournements non sécurisés ou reports de mise en production.",
      likelihoodJustification:
        "3/5 : retours pilotes déjà mitigés ; forte hétérogénéité des populations (bureaux / terrain / prestataires).",
      mitigationPlan:
        "Renforcer FAQ et macros support, sessions de sensibilisation ciblées, pilotes par population avant généralisation.",
      contingencyPlan:
        "Renfort temporaire support N2, fenêtre de déploiement découpée par région, escalade RSSI si dérive du planning.",
    },
    {
      title: "Tests de charge IdP",
      category: "Performance & qualité de service",
      description:
        "Si la campagne de tests de charge n’est pas menée à temps ou est incomplète, alors des goulots d’étranglement restent non détectés avant la montée en charge réelle.",
      probability: 2,
      impact: 3,
      status: ProjectRiskStatus.MITIGATED,
      reviewDateOffsetDays: -14,
      mitigationPlan:
        "Pilotes régionaux avec monitoring renforcé (APM, journaux IdP), scénarios de charge alignés sur les pics métier connus.",
      owner: "a",
      threatSource:
        "Fenêtre de tests reculée par rapport au planning initial ; jeux de données de charge partiellement représentatifs.",
      businessImpact:
        "Risque de timeouts ou refus de connexion aux heures de pointe, impact direct sur la productivité et l’image du projet.",
      likelihoodJustification:
        "2/5 : pilotes en cours avec premiers correctifs ; charge cible encore partiellement couverte par les tests.",
      contingencyPlan:
        "Montée en charge progressive par vague, limitation temporaire des flux non critiques, réserve de capacité côté fournisseur si prévu contractuellement.",
    },
    {
      title: "Secrets applicatifs IdP — rotation retardée",
      category: "Sécurité des secrets",
      description:
        "Si les secrets et certificats proches de l’expiration ne sont pas renouvelés dans les délais, alors une interruption de service ou une exposition sécurité peut survenir au moment du renouvellement forcé.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 14,
      owner: "a",
      threatSource:
        "Rotation des secrets applicatifs non intégrée au run opérationnel ; dépendances multiples entre équipes et fournisseur.",
      businessImpact:
        "Coupure d’authentification sur tout ou partie des applications, incident majeur exploitable si fenêtre de vulnérabilité ; impact conformité (traçabilité, audits).",
      likelihoodJustification:
        "4/5 : plusieurs secrets identifiés en fin de vie ; historique de rotations « last minute » sur d’autres projets du groupe.",
      mitigationPlan:
        "Inventaire des secrets, calendrier de rotation partagé, automatisation ou runbook testé en préproduction.",
      contingencyPlan:
        "Procédure d’urgence de révocation / rotation avec fournisseur, communication incidents, post-mortem obligatoire.",
    },
  ],
  "02": [
    {
      title: "Charge equipe data",
      category: "Ressources & capacité",
      description:
        "Si la capacité disponible sur la plateforme data (lakehouse, pipelines) reste inférieure à la feuille de route, alors les livrables analytiques et les intégrations métiers prennent du retard.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 30,
      owner: "b",
      threatSource:
        "Priorisation concurrente d’autres programmes ; turnover ou indisponibilité de profils clés (data engineer, DBA).",
      businessImpact:
        "Reports de releases, reports de décisions basées sur les données, frustration des métiers finance et opérations.",
      likelihoodJustification:
        "3/5 : backlog déjà chargé ; arbitrages en cours sans capacité supplémentaire budgétée.",
      mitigationPlan:
        "Reprioriser le backlog avec sponsors, externaliser un lot non critique ou étaler les jalons sur le trimestre suivant.",
      contingencyPlan:
        "Livraison minimale viable sur un périmètre réduit, report des cas d’usage secondaires documenté en CODIR.",
    },
    {
      title: "Qualité données source",
      category: "Qualité des données",
      description:
        "Si les flux entrants présentent des écarts, doublons ou règles métier non respectées, alors les tableaux de bord et modèles en aval produisent des résultats inexacts.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 60,
      owner: "a",
      threatSource:
        "Hétérogénéité des systèmes sources, manque de gouvernance DQ historique, contrôles encore partiels sur les pipelines.",
      businessImpact:
        "Décisions erronées, litiges internes sur les chiffres, effort correctif en aval (retraitements, audits).",
      likelihoodJustification:
        "3/5 : incidents DQ déjà observés en recette ; périmètre source large et en mouvement.",
      mitigationPlan:
        "Règles de qualité par domaine, profilage automatisé, data stewards identifiés par flux critique.",
      contingencyPlan:
        "Seuils d’alerte sur indicateurs clés, exclusion temporaire des flux les plus instables des reportings réglementaires.",
    },
    {
      title: "Conformité accès données",
      category: "Conformité & gouvernance",
      description:
        "Si la cartographie des droits d’accès et les habilitations ne sont pas à jour avant la production, alors le risque de violation du besoin d’en connaître ou du RGPD augmente.",
      probability: 2,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 90,
      owner: "b",
      threatSource:
        "Rôles applicatifs et groupes AD/IdP non resynchronisés avec la matrice métier ; revues d’accès encore manuelles.",
      businessImpact:
        "Sanctions réglementaires potentielles, atteinte à la vie privée, obligation de notification d’incident ou de remediation lourde.",
      likelihoodJustification:
        "2/5 : chantier de cadrage engagé ; mais dépendances externes (métiers, juridique) peuvent retarder la validation.",
      mitigationPlan:
        "Ateliers métier / RSSI, rapprochement avec le registre des traitements, tests de contrôle sur échantillon avant go-live.",
      contingencyPlan:
        "Blocage des accès les plus sensibles jusqu’à validation explicite du responsable de domaine.",
    },
    {
      title: "Indisponibilité lakehouse — zone sensible",
      category: "Continuité & exploitation",
      description:
        "Si la plateforme lakehouse ou sa zone sensible subit une panne prolongée, alors les traitements critiques et les obligations de restitution (finances, conformité) ne sont pas tenues dans les RTO attendus.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 18,
      owner: "b",
      threatSource:
        "Architecture encore en consolidation ; sauvegardes et PRA non entièrement rejoués sur le périmètre sensible.",
      businessImpact:
        "Perte de service analytique, impossibilité de produire certains reportings obligatoires, perte de confiance des régulateurs ou du management.",
      likelihoodJustification:
        "4/5 : incidents mineurs déjà constatés en préproduction ; charge croissante sans marge infra documentée.",
      mitigationPlan:
        "Renforcer la redondance sur la zone sensible, exercices de restauration, définition claire des RTO/RPO par cas d’usage.",
      contingencyPlan:
        "Bascule vers jeux de données figés ou extractions de secours, communication planifiée aux parties prenantes.",
    },
  ],
  "03": [
    {
      title: "Dépendance mainframe historique",
      category: "Legacy & interfaçage",
      description:
        "Si les accès lecture seule au mainframe restent nécessaires au-delà du cut-over, alors toute évolution réglementaire ou technique côté legacy peut bloquer des traitements périphériques.",
      probability: 2,
      impact: 2,
      status: ProjectRiskStatus.CLOSED,
      reviewDateOffsetDays: -120,
      owner: "a",
      threatSource:
        "Composants mainframe non remplacés à date ; interfaces batch et files encore partiellement couplées.",
      businessImpact:
        "Coûts de maintien prolongés, complexité des évolutions, risque de dette technique croissante.",
      likelihoodJustification:
        "2/5 : risque clôturé après plan de stabilisation et réduction du périmètre d’appel au mainframe.",
      mitigationPlan:
        "Réduction progressive des dépendances, documentation des flux résiduels, budget de maintien cadré.",
      contingencyPlan:
        "Mode dégradé documenté en cas d’indisponibilité du batch critique.",
    },
    {
      title: "Retard migration clôture",
      category: "Planning & jalons",
      description:
        "Si le glissement initial sur les jalons de migration n’est pas absorbé, alors la fenêtre de coexistence s’allonge et les coûts de double run augmentent.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.CLOSED,
      reviewDateOffsetDays: -90,
      owner: "b",
      threatSource:
        "Complexité sous-estimée sur certains lots ; arbitrages métiers tardifs sur le périmètre de bascule.",
      businessImpact:
        "Surcoût de projet, tension sur les équipes, report des bénéfices attendus de la migration.",
      likelihoodJustification:
        "3/5 : risque clôturé après arbitrage CODIR et plan de stabilité post migration.",
      mitigationPlan:
        "Gel du périmètre, renfort ciblé sur les lots en retard, reporting hebdomadaire jusqu’à clôture.",
      contingencyPlan:
        "Découpage en vagues supplémentaires avec critères de sortie explicites par vague.",
    },
    {
      title: "Vulnérabilité résiduelle — non clôturée post cut-over",
      category: "Sécurité & exploitation",
      description:
        "Si une vulnérabilité connue n’est pas traitée après la bascule, alors l’exposition cyber sur le nouveau socle reste élevée jusqu’à correction.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: -30,
      owner: "a",
      threatSource:
        "Correctifs applicatifs ou middleware non déployés sur l’ensemble des instances ; dette de durcissement post go-live.",
      businessImpact:
        "Compromission possible du périmètre migré, obligation de notification ou de remédiation d’urgence, impact image.",
      likelihoodJustification:
        "4/5 : criticité élevée confirmée par le dernier rapport de tests d’intrusion ; charge corrective concurrente avec stabilisation.",
      mitigationPlan:
        "Plan de patch priorisé avec la RSSI, fenêtres de maintenance négociées, contournements compensatoires (WAF, segmentation).",
      contingencyPlan:
        "Isolement réseau des composants les plus exposés en attendant correctif, escalade sécurité 24/7 si besoin.",
    },
  ],
  "04": [
    {
      title: "Arbitrage budget non tranché",
      category: "Finance & gouvernance",
      description:
        "Si la direction ne tranche pas sur l’enveloppe de la phase 2, alors les travaux sont en attente et les équipes ne peuvent pas engager de commandes ni de ressources.",
      probability: 4,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 7,
      owner: "a",
      threatSource:
        "Conjoncture budgétaire incertaine ; désaccord entre finance et métiers sur le retour sur investissement.",
      businessImpact:
        "Blocage des livrables dépendants de la phase 2, démobilisation partielle des équipes, dérive calendaire.",
      likelihoodJustification:
        "4/5 : plusieurs arbitrages déjà reportés ; échéance CODIR imminente sans décision écrite.",
      mitigationPlan:
        "Dossier de décision chiffré (ROI, risque de ne pas faire), scénario minimal viable pour débloquer un premier lot.",
      contingencyPlan:
        "Phase 2 découpée en tranches avec sorties de valeur à chaque vague, sous réserve d’un budget minimal validé.",
    },
    {
      title: "Perte de compétences fonctionnelles",
      category: "Organisation & ressources humaines",
      description:
        "Si des départs ou des mouvements touchent les référents métier, alors la mémoire des règles et des arbitrages se dilue et les ateliers ralentissent.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 14,
      owner: "b",
      threatSource:
        "Turnover dans la MOA ; documentation fonctionnelle incomplète ou dispersée.",
      businessImpact:
        "Retards sur les validations, risque d’erreurs de paramétrage, besoin de refaire des ateliers.",
      likelihoodJustification:
        "3/5 : un départ clé déjà annoncé ; plan de passation partiellement en place.",
      mitigationPlan:
        "Passation structurée (binômes, enregistrements d’ateliers), compléter la base de connaissance métier.",
      contingencyPlan:
        "Renfort MOA transverse ou consultant métier pour tenir les jalons critiques.",
    },
    {
      title: "Blocage arbitrage CODIR — gel budget phase 2",
      category: "Gouvernance & pilotage",
      description:
        "Si le CODIR ne valide pas le budget de la phase 2 à la date prévue, alors le programme entre en stand-by et les dépendances externes (éditeurs, intégrateurs) sont impactées.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 5,
      owner: "b",
      threatSource:
        "Priorisation concurrente d’autres investissements ; manque de visibilité sur les bénéfices tangibles à court terme.",
      businessImpact:
        "Pénalités contractuelles possibles, perte de créneaux chez les prestataires, dégradation de la confiance des sponsors.",
      likelihoodJustification:
        "4/5 : calendrier CODIR chargé ; aucune résolution lors de la dernière séance.",
      mitigationPlan:
        "Synthèse exécutive pour le CODIR, alignement préalable avec la direction financière, option de phase 2 allégée.",
      contingencyPlan:
        "Mise en sommeil contrôlée avec communication aux fournisseurs, conservation du périmètre déjà livré en maintenance.",
    },
  ],
  "05": [
    {
      title: "Fenetre de maintenance refusee par metier",
      category: "Exploitation & cyber",
      description:
        "Si les créneaux de durcissement et de patch ne sont pas acceptés par les métiers, alors les systèmes restent exposés plus longtemps aux vulnérabilités connues.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 10,
      owner: "a",
      threatSource:
        "Contraintes métier fortes (périodes de clôture, pics d’activité) ; peu de marges pour des interruptions même courtes.",
      businessImpact:
        "Exploitation de failles non corrigées, possible propagation en cas d’incident, non-conformité aux exigences sécurité internes.",
      likelihoodJustification:
        "4/5 : plusieurs refus successifs de fenêtres ; backlog de correctifs en augmentation.",
      mitigationPlan:
        "Calendrier partagé avec les métiers, micro-fenêtres par composant, redémarrages à chaud lorsque possible.",
      contingencyPlan:
        "Compensations : durcissement réseau, règles WAF renforcées, surveillance SOC accrue en période à risque.",
    },
    {
      title: "Scope creep module finance",
      category: "Périmètre & cadrage",
      description:
        "Si des demandes hors périmètre cyber sont ajoutées pour satisfaire la finance, alors les délais et le budget du projet sont dépassés sans validation formelle.",
      probability: 3,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 21,
      owner: "b",
      threatSource:
        "Demandes opportunistes en cours de route ; lien faible avec le périmètre initial validé en comité.",
      businessImpact:
        "Retard sur les livrables initiaux, tension entre équipes, risque de livrer partiellement plusieurs sujets plutôt qu’un socle solide.",
      likelihoodJustification:
        "3/5 : premières demandes déjà identifiées ; processus de change request pas encore systématique.",
      mitigationPlan:
        "Gel du périmètre par version, comité des changements avec arbitrage sponsor, backlog priorisé.",
      contingencyPlan:
        "Report des demandes hors scope vers une phase ultérieure avec chiffrage séparé.",
    },
    {
      title: "Alignement SOC / SIEM",
      category: "Supervision & détection",
      description:
        "Si l’intégration des journaux et des corrélations SOC n’est pas stabilisée, alors la détection d’incidents sur le nouveau périmètre reste partielle.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.MITIGATED,
      reviewDateOffsetDays: -7,
      mitigationPlan:
        "Ateliers SOC, normalisation des champs de logs, jeux de règles de détection alignés sur les cas d’usage critiques.",
      owner: "a",
      threatSource:
        "Hétérogénéité des formats de logs, retards sur le parsing de certaines sources, tuning des alertes encore bruyant.",
      businessImpact:
        "Temps de détection allongé, fatigue des analystes, risque de manquer une attaque ciblée sur le périmètre du projet.",
      likelihoodJustification:
        "3/5 : progrès après ateliers ; quelques sources encore en observation.",
      contingencyPlan:
        "Surveillance renforcée manuelle sur les flux non encore corrélés, jusqu’à stabilisation.",
    },
    {
      title: "Surface ransomware — segmentation incomplète",
      category: "Architecture sécurité",
      description:
        "Si la segmentation réseau et les contrôles latéraux ne sont pas complets, alors une compromission initiale peut se propager au-delà de la zone prévue.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 9,
      owner: "b",
      threatSource:
        "Historique de serveurs mutualisés ; règles de pare-feu encore trop permissives entre segments métiers et technique.",
      businessImpact:
        "Chiffrement étendu en cas d’attaque, indisponibilité prolongée, coûts de remédiation et notification élevés.",
      likelihoodJustification:
        "4/5 : constats d’audit interne ; plan de segmentation validé mais pas entièrement déployé.",
      mitigationPlan:
        "Cartographie des flux, micro-segmentation par zone sensible, tests d’isolement, EDR sur postes et serveurs critiques.",
      contingencyPlan:
        "Isolation automatique des segments en alerte, playbooks ransomware testés avec la cellule de crise.",
    },
  ],
  "06": [
    {
      title: "Performance tunnel sous charge",
      category: "Performance & disponibilité",
      description:
        "Si le parcours de paiement présente un goulot d’étranglement sous charge réelle, alors les temps de réponse augmentent et le taux d’abandon ou d’échec de transaction se dégrade.",
      probability: 4,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 5,
      owner: "b",
      threatSource:
        "Point de contention identifié en tests de charge ; configuration cache et base encore optimisable.",
      businessImpact:
        "Perte de chiffre d’affaires directe, dégradation de l’expérience client, impact sur les campagnes marketing.",
      likelihoodJustification:
        "4/5 : pics prévisibles (soldes, Black Friday) ; marge de perf insuffisante sur les scénarios extrêmes.",
      mitigationPlan:
        "Optimisation requêtes, mise en cache, montée en charge horizontale, file d’attente virtuelle côté front.",
      contingencyPlan:
        "Limitation contrôlée du débit entrant, message utilisateur transparent, bascule vers file d’attente si besoin.",
    },
    {
      title: "Dépendance prestataire front",
      category: "Fournisseurs & delivery",
      description:
        "Si l’intégrateur front externe ne tient pas le planning ou la qualité, alors les livrables UI bloquent les recettes et le go-live.",
      probability: 3,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 20,
      owner: "a",
      threatSource:
        "Surcharge du prestataire, turnover de consultants, cahier des charges interprété différemment des maquettes.",
      businessImpact:
        "Retard sur les jalons de recette, coûts de retouches, risque de dette UX si livraisons précipitées.",
      likelihoodJustification:
        "3/5 : un premier retard déjà constaté ; plan de rattrapage en discussion contractuelle.",
      mitigationPlan:
        "Points d’étape hebdomadaires, validation UX systématique, pénalités ou renfort équipe prévus au contrat.",
      contingencyPlan:
        "Renfort interne ou second prestataire sur le périmètre le plus critique si dérive confirmée.",
    },
    {
      title: "Perte transactions — pic charge checkout",
      category: "Continuité métier",
      description:
        "Si les tests de charge ne couvrent pas les pics réels, alors en période forte affluence le système peut rejeter massivement les paiements ou les mettre en file d’attente trop longtemps.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 4,
      owner: "b",
      threatSource:
        "Scénarios de test encore calibrés sur la moyenne ; intégrations PSP et 3-D Secure peu rejoués en conditions extrêmes.",
      businessImpact:
        "Perte directe de revenus, mécontentement client, risque médiatique en période de forte visibilité.",
      likelihoodJustification:
        "4/5 : écart observé entre prévision charge marketing et capacité technique mesurée en dernier essai.",
      mitigationPlan:
        "Campagne de charge avec profils réalistes, tests de bout en bout PSP, plan de scale automatique validé.",
      contingencyPlan:
        "Mode dégradé documenté (file d’attente, panier sauvegardé), communication proactive si incident.",
    },
  ],
  "07": [
    {
      title: "Coupure opérateur le jour J",
      category: "Bascule & continuité",
      description:
        "Si la fenêtre de bascule unique vers le nouvel opérateur échoue ou dépasse le créneau prévu, alors les utilisateurs finaux subissent une interruption de service prolongée.",
      probability: 3,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 3,
      owner: "a",
      threatSource:
        "Complexité des bascules DNS / routage ; coordination multi-équipes sur un créneau court ; dépendance à des tiers opérateurs.",
      businessImpact:
        "Interruption d’accès aux services critiques, appels massifs au support, pénalités contractuelles possibles.",
      likelihoodJustification:
        "3/5 : répétitions générales partiellement réussies ; quelques points de friction non résolus à J-5.",
      mitigationPlan:
        "Check-list jour J, war room, communication utilisateurs, rollback testé sur banc isolé représentatif.",
      contingencyPlan:
        "Retour arrière selon runbook si critères objectifs non tenus à T+X, communication de crise pré-rédigée.",
    },
    {
      title: "Formation support incomplète",
      category: "Compétences & support",
      description:
        "Si les équipes support n’ont pas le matériel et les cas pratiques à temps, alors le premier jour en production génère des temps de résolution longs et des escalades inutiles.",
      probability: 2,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 12,
      owner: "b",
      threatSource:
        "Retard sur la finalisation des guides et scripts ; disponibilité des formateurs métiers limitée.",
      businessImpact:
        "Insatisfaction utilisateurs, saturation des niveaux 2 et 3, risque d’erreurs de diagnostic.",
      likelihoodJustification:
        "2/5 : plan de formation lancé ; quelques modules encore en rédaction à J-14.",
      mitigationPlan:
        "Micro-learning, base de connaissance searchable, binômes expérimentés / nouveaux sur la première semaine.",
      contingencyPlan:
        "Renfort temporaire sur la hotline et escalade directe vers l’équipe projet pour les incidents P1.",
    },
    {
      title: "Bascule opérateur — rollback non validé en prod",
      category: "Reprise & tests",
      description:
        "Si le plan de retour arrière n’a pas été rejoué sur un environnement proche de la production, alors en cas d’échec critique la restauration prend plus longtemps que le RTO admis.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 2,
      owner: "a",
      threatSource:
        "Contraintes de fenêtre pour tester en prod-like ; jeux de données ou licences différents entre préprod et prod.",
      businessImpact:
        "Prolongation d’incident majeur, perte de confiance des métiers, coûts d’urgence élevés.",
      likelihoodJustification:
        "4/5 : dernier essai de rollback partiel seulement ; plusieurs étapes encore manuelles et chronophages.",
      mitigationPlan:
        "Exercice complet de rollback documenté, automatisation des étapes répétitives, critères de go/no-go explicites.",
      contingencyPlan:
        "Maintien d’une équipe élargie post-bascule, possibilité de réouverture temporaire de l’ancienne voie si prévu.",
    },
  ],
  "08": [
    {
      title: "Dette agents sur parc serveurs",
      category: "Observabilité & agents",
      description:
        "Si la couverture APM / agents est incomplète sur une partie du parc, alors les incidents sur ces serveurs sont détectés tardivement ou avec peu de contexte.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 15,
      owner: "b",
      threatSource:
        "OS non standard, restrictions sécurité empêchant l’agent, ou priorisation basse sur des environnements « secondaires ».",
      businessImpact:
        "Temps de diagnostic allongé, MTTR élevé sur incidents touchant ces machines, risque de récidive non vue.",
      likelihoodJustification:
        "3/5 : inventaire serveurs vs agents en cours de rapprochement ; écarts encore significatifs.",
      mitigationPlan:
        "Campagne de déploiement par vague, exceptions documentées avec compensations (logs réseau, sondes externes).",
      contingencyPlan:
        "Script de collecte ponctuelle en cas d’incident sur un serveur non instrumenté.",
    },
    {
      title: "Alertes non corrélées",
      category: "Supervision & SOC",
      description:
        "Si les corrélations et le filtrage ne sont pas affinés, alors le SOC noie dans le bruit et peut manquer les signaux faibles d’une attaque en cours.",
      probability: 4,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 7,
      owner: "a",
      threatSource:
        "Intégration récente de nouvelles sources de logs ; règles génériques encore trop larges.",
      businessImpact:
        "Fatigue des analystes, délais de tri plus longs, risque de classement erroné d’alertes critiques.",
      likelihoodJustification:
        "4/5 : volume d’alertes au-dessus des objectifs ; tuning planifié mais pas terminé.",
      mitigationPlan:
        "Ateliers de tuning avec le SOC, suppression des doublons, corrélation par use case métier.",
      contingencyPlan:
        "File d’alertes priorisées manuellement pour les actifs les plus sensibles en attendant le tuning.",
    },
    {
      title: "SLA observabilité — non atteint sur périmètre critique",
      category: "Indicateurs & SLO",
      description:
        "Si des flux métier critiques ne sont pas correctement instrumentés, alors les SLO de détection ou de traçabilité ne sont pas tenus et l’équipe de garde manque de visibilité.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 11,
      owner: "b",
      threatSource:
        "Cartographie des flux encore partielle ; instrumentation applicative inégale selon les équipes.",
      businessImpact:
        "Incident métier majeur possible sans corrélation immédiate, difficulté à prouver les causes en post-mortem.",
      likelihoodJustification:
        "4/5 : dernier rapport de garde fait état de trous sur deux parcours critiques identifiés.",
      mitigationPlan:
        "Instrumentation ciblée sur les parcours à enjeu, tracing distribué, dashboard unique pour la garde.",
      contingencyPlan:
        "Renfort humain sur la garde pour compenser les angles morts jusqu’à correction.",
    },
  ],
  "09": [
    {
      title: "Délais API éditeur",
      category: "Fournisseur logiciel",
      description:
        "Si la roadmap produit de l’éditeur ne livre pas les endpoints ou correctifs nécessaires à temps, alors l’intégration avec le partenaire et les tests bout en bout sont reportés.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 30,
      owner: "a",
      threatSource:
        "Charge de développement côté éditeur, priorisation d’autres clients, bugs bloquants en amont.",
      businessImpact:
        "Glissement du planning d’intégration, coûts de prolongation du projet, frustration du partenaire métier.",
      likelihoodJustification:
        "3/5 : un premier report de release déjà communiqué ; nouvelle date sous réserve de validation QA éditeur.",
      mitigationPlan:
        "Suivi contractuel des engagements, escalade account manager, contournements fonctionnels temporaires si possibles.",
      contingencyPlan:
        "Réduction du périmètre de la release ou utilisation d’API en version bêta avec garde-fous documentés.",
    },
    {
      title: "Absence RACI projet",
      category: "Gouvernance projet",
      description:
        "Si les rôles décisionnels entre client, intégrateur et éditeur ne sont pas formalisés, alors les arbitrages traînent et les incidents de production restent sans owner clair.",
      probability: 3,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: null,
      owner: null,
      threatSource:
        "Plusieurs parties prenantes avec périmètres qui se chevauchent ; RACI non partagé dans un référentiel unique.",
      businessImpact:
        "Retards de décision, renvois entre équipes en cas d’incident, risque de non-conformité aux process internes.",
      likelihoodJustification:
        "3/5 : tensions déjà observées en atelier ; sponsor demande une clarification avant la prochaine gate.",
      mitigationPlan:
        "Matrice RACI validée en comité, points d’escalade nommés, documentation dans l’outil de projet.",
      contingencyPlan:
        "Instance d’arbitrage hebdomadaire jusqu’à stabilisation des rôles.",
    },
    {
      title: "Pénalités éditeur — SLA intégration non tenu",
      category: "Contractuel & delivery",
      description:
        "Si les engagements de disponibilité ou de correction des API ne sont pas tenus, alors la fenêtre de déploiement avec le partenaire est compromise et des pénalités peuvent s’appliquer.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 25,
      owner: "b",
      threatSource:
        "Retard cumulé sur correctifs et documentation ; fenêtre projet du partenaire figée contractuellement.",
      businessImpact:
        "Pénalités financières, réputation dégradée auprès du partenaire, obligation de revoir le planning global.",
      likelihoodJustification:
        "4/5 : plusieurs jalons éditeur manqués ; plan de rattrapage encore non tenu.",
      mitigationPlan:
        "Revue de contrat, activation des clauses de remédiation, médiation avec la direction commerciale éditeur.",
      contingencyPlan:
        "Plan B technique (contournement, file d’attente métier) pour tenir une date minimale avec le partenaire.",
    },
  ],
  "10": [
    {
      title: "Conformité usage IA interne",
      category: "Juridique & RGPD",
      description:
        "Si le cadre d’usage des modèles sur corpus internes (finalités, minimisation, droits des personnes) n’est pas cadré, alors le traitement peut être non conforme au RGPD ou à la politique groupe.",
      probability: 3,
      impact: 3,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 60,
      owner: "b",
      threatSource:
        "Déploiement rapide de cas d’usage ; documentation des traitements et analyses d’impact encore incomplètes.",
      businessImpact:
        "Sanctions CNIL, obligation de cessation de traitement, atteinte à la confiance des collaborateurs.",
      likelihoodJustification:
        "3/5 : avis juridique demandé ; plusieurs points gris sur l’entraînement vs simple inférence.",
      mitigationPlan:
        "AIPD ou analyse simplifiée, registre des traitements à jour, bandeau et information utilisateurs.",
      contingencyPlan:
        "Suspension des cas d’usage les plus exposés jusqu’à validation juridique explicite.",
    },
    {
      title: "Jeux de données sensibles",
      category: "Données & anonymisation",
      description:
        "Si les environnements de test ne sont pas correctement anonymisés ou cloisonnés, alors des données personnelles ou confidentielles peuvent fuiter vers des profils non habilités.",
      probability: 4,
      impact: 2,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 45,
      owner: "a",
      threatSource:
        "Extractions depuis la production pour gagner du temps ; processus d’anonymisation encore partiellement manuel.",
      businessImpact:
        "Violation de données, obligation de notification, atteinte à la réputation et aux relations sociales.",
      likelihoodJustification:
        "4/5 : audits internes ont déjà relevé des jeux trop proches de la prod sur un bac de test.",
      mitigationPlan:
        "Génération de données synthétiques, masquage systématique, accès bastionné aux environnements sensibles.",
      contingencyPlan:
        "Nettoyage d’urgence des environnements concernés et revue des comptes ayant accédé aux données.",
    },
    {
      title: "Fuite données sensibles — corpus IA / RGPD",
      category: "Sécurité & confidentialité",
      description:
        "Si des jeux mal anonymisés sont utilisés pour l’entraînement ou le fine-tuning, alors des informations personnelles ou stratégiques peuvent être réinjectées dans des réponses du modèle.",
      probability: 4,
      impact: 4,
      status: ProjectRiskStatus.OPEN,
      reviewDateOffsetDays: 40,
      owner: "b",
      threatSource:
        "Chaîne de préparation des données peu traçable ; contrôles automatiques d’anonymisation insuffisants.",
      businessImpact:
        "Divulgation involontaire dans les prompts/réponses, non-conformité forte, incident majeur pour la DSI.",
      likelihoodJustification:
        "4/5 : modèles déjà exposés en interne sans garde-fou complet sur les jeux utilisés.",
      mitigationPlan:
        "Pipeline de données validé par la RSSI et le DPO, tests d’attaque sur fuites mémorisées, limitation des contextes.",
      contingencyPlan:
        "Désactivation des modèles ou des jeux concernés, enquête interne et notification si seuil légal atteint.",
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
    const riskTypeId = await resolveRiskTypeIdForLegacyImpact(
      prisma,
      clientId,
      fieldData.impactCategory,
    );

    if (existing) {
      if (demoRiskNeedsEnrichment(existing)) {
        await prisma.projectRisk.update({
          where: { id: existing.id },
          data: { ...fieldData, riskTypeId },
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
        riskTypeId,
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
      risks: { none: {} },
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

  await ensureDemoClientScopedRisk(
    prisma,
    clientId,
    now,
    ownerUserIdA,
    ownerUserIdB,
  );
}

/** Titre stable pour idempotence `db seed` — le contenu EBIOS est métier, pas le libellé court. */
const DEMO_CLIENT_SCOPED_RISK_TITLE = "Risque transverse démo (hors projet)";

async function ensureDemoClientScopedRisk(
  prisma: PrismaClient,
  clientId: string,
  now: Date,
  ownerUserIdA: string,
  ownerUserIdB: string,
): Promise<void> {
  const existing = await prisma.projectRisk.findFirst({
    where: { clientId, projectId: null, title: DEMO_CLIENT_SCOPED_RISK_TITLE },
    select: { id: true },
  });
  if (existing) return;

  const seed: DemoRiskSeed = {
    title: DEMO_CLIENT_SCOPED_RISK_TITLE,
    category: "Cybersécurité transverse",
    description:
      "Si une vulnérabilité critique affecte une bibliothèque ou un composant partagé par plusieurs applications, alors l’exposition n’est pas limitée à un seul projet et nécessite une coordination DSI / RSSI au niveau entité.",
    probability: 3,
    impact: 3,
    status: ProjectRiskStatus.OPEN,
    reviewDateOffsetDays: 30,
    owner: "a",
    threatSource:
      "Composants open source ou éditeurs communs à plusieurs systèmes ; cycle de patch hétérogène selon les projets.",
    businessImpact:
      "Compromission potentielle élargie, obligation de communication aux autorités ou aux clients selon les cas, effort de remédiation coordonné.",
    likelihoodJustification:
      "3/5 : CVE récente sur la bibliothèque concernée ; tous les projets n’ont pas encore livré le correctif à date.",
    mitigationPlan:
      "Inventaire SBOM partagé, priorisation centralisée des correctifs, fenêtres de maintenance alignées avec la production.",
    contingencyPlan:
      "Mesures compensatoires (WAF, désactivation de fonctionnalité) en attendant patch uniforme, cellule de crise SI.",
  };
  const fieldData = buildDemoRiskFieldData(seed, now, 0, ownerUserIdA, ownerUserIdB);
  const riskTypeId = await resolveRiskTypeIdForLegacyImpact(
    prisma,
    clientId,
    fieldData.impactCategory,
  );

  const existingCodes = await prisma.projectRisk.findMany({
    where: { clientId, projectId: null },
    select: { code: true },
  });
  let maxN = 0;
  for (const r of existingCodes) {
    const m = /^R-(\d+)$/.exec(r.code);
    if (m) maxN = Math.max(maxN, parseInt(m[1]!, 10));
  }
  const code = `R-${String(maxN + 1).padStart(3, "0")}`;

  await prisma.projectRisk.create({
    data: {
      clientId,
      projectId: null,
      code,
      title: seed.title,
      ...fieldData,
      riskTypeId,
    },
  });
}
