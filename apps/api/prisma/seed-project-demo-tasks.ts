import {
  PrismaClient,
  ProjectTaskDependencyType,
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@prisma/client";

type OwnerKey = "a" | "b" | null;

type TaskSeed = {
  name: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  progress: number;
  sortOrder: number;
  owner?: OwnerKey;
};

const D = ProjectTaskStatus.DONE;
const W = ProjectTaskStatus.IN_PROGRESS;
const T = ProjectTaskStatus.TODO;
const B = ProjectTaskStatus.BLOCKED;
const X = ProjectTaskStatus.CANCELLED;

const LO = ProjectTaskPriority.LOW;
const MD = ProjectTaskPriority.MEDIUM;
const HI = ProjectTaskPriority.HIGH;
const CR = ProjectTaskPriority.CRITICAL;

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** 4 phases par projet (Gantt / regroupement), libellés métier. */
const PHASES_BY_SUFFIX: Record<string, string[]> = {
  "01": [
    "1. Cadrage & inventaire",
    "2. Intégration IdP & connecteurs",
    "3. Tests, pilotes & communication",
    "4. Industrialisation & RUN",
  ],
  "02": [
    "1. Fondations & gouvernance données",
    "2. Pipelines, qualité & lineage",
    "3. Conformité, accès & PRA",
    "4. Mise en production & exploitation",
  ],
  "03": [
    "1. Migration & cut-over",
    "2. Hypercare & stabilisation",
    "3. Clôture & reporting",
    "4. Archivage & fin de projet",
  ],
  "04": [
    "1. Cadrage fonctionnel & arbitrages",
    "2. Paramétrage & interfaces",
    "3. Tests & recette",
    "4. Préparation mise en prod",
  ],
  "05": [
    "1. Analyse & architecture cible",
    "2. Segmentation & PAM",
    "3. Durcissement & SIEM",
    "4. Opérationnel & conformité",
  ],
  "06": [
    "1. Design & intégration paiement",
    "2. Tunnel & UX",
    "3. Perf, sécurité & conformité",
    "4. Mise en prod & marketing",
  ],
  "07": [
    "1. Préparation & portabilité",
    "2. Bascule & tests",
    "3. Formation & communication",
    "4. Clôture & recette",
  ],
  "08": [
    "1. Inventaire & agents",
    "2. Dashboards & SLO",
    "3. Alerting & runbooks",
    "4. Dette technique & bilan",
  ],
  "09": [
    "1. Contractuel & API design",
    "2. Sandbox & intégration",
    "3. Tests & sécurité",
    "4. Go-live & exploitation",
  ],
  "10": [
    "1. Cadrage RGPD & corpus",
    "2. Modèle & POC",
    "3. Intégration & pilotes",
    "4. Industrialisation",
  ],
};

/** ~20 tâches par projet démo (charge type « un mois dense » sur un vrai programme). */
const NAMES: Record<string, string[]> = {
  "01": [
    "Cartographie applications et flux d'authentification",
    "Atelier integration SSO — connecteurs RH / messagerie",
    "Deploiement IdP pilote (tenant France)",
    "Tests federation SAML / OIDC",
    "Scenarii MFA et recuperation de compte",
    "Kit communication interne et FAQ utilisateurs",
    "Runbook exploitation N2 / astreintes",
    "Journalisation et correlation des connexions",
    "Alignement politique mots de passe groupe",
    "Tests charge sur service d'authentification",
    "Raccordement annuaire LDAP / Entra ID",
    "Gestion des certificats et renouvellement",
    "Pilote agences — retours terrain semaine 1",
    "Pilote agences — retours terrain semaine 2",
    "Plan de rollback IdP et procedure incident",
    "Formation equipe support niveau 1",
    "Integration SSO application metier finance",
    "Integration SSO application metier RH",
    "Revue securite configuration IdP",
    "Bascule progressive hors perimetre pilote",
  ],
  "02": [
    "Pipelines batch — conformite SOC2 zone sensible",
    "Modelisation gouvernance et catalogage donnees",
    "Data quality — regles et controles automatises",
    "Tests non-regression pipelines historiques",
    "Monitoring alerting et SLA consommation",
    "Runbook exploitation lakehouse et astreintes",
    "Ingestion temps reel — bus evenementiel",
    "Lineage et impact analysis des flux",
    "Anonymisation / pseudonymisation PII",
    "Jeux de donnees de test conformes",
    "Optimisation partitionnement tables froides",
    "Documentation modele de donnees referentiel",
    "Acces roles et separation des environnements",
    "Backup / restore — scenario PRA data",
    "Cout stockage et politique de retention",
    "Integration avec outil de ticketing data",
    "Revue acces comptes techniques batch",
    "Tests perf charge fin de mois comptable",
    "Tableaux de bord consommation par domaine",
    "Passage en prod zone sensible — checklist GO",
  ],
  "03": [
    "Migration donnees historiques vers socle cible",
    "Documentation exploitabilite et transfert RUN",
    "Hypercare et stabilisation post cut-over",
    "Cloture budget et reporting final CODIR",
    "Archivage licences et contrats legacy",
    "Decommissionnement serveurs physiques",
    "Export archives legales et preuves",
    "Reversibilite contrat fournisseur historique",
    "Nettoyage comptes et droits obsoletes",
    "Inventaire derniers batchs planifies",
    "Cloture tickets restants service transition",
    "Communication utilisateurs fin de support",
    "Sauvegarde finale et verification integrite",
    "Desinstallation agents sur parc residual",
    "Revue securite acces post-projet",
    "Bilan lessons learned atelier",
    "Transmission documentation au RSSI",
    "Point DSI — validation cloture technique",
    "Archivage documentation dans GED",
    "Synthese finale et archivage projet",
  ],
  "04": [
    "Parametrage module actif — attente arbitrage CODIR",
    "Preparer business case report 6 mois",
    "Atelier integration finance — regles d'amortissement",
    "Tests integration reportes sur environnement sandbox",
    "Veille version editeur ERP et patchs critiques",
    "Mapping comptes GL — plan de charges",
    "Interfaces banque / lettrage automatique",
    "Parametrage axes analytiques projet",
    "Recette cut-over planifiee (en attente)",
    "Scripts reprise donnees masse",
    "Formation key users module actif",
    "Jeux de tests donnees anonymisees",
    "Revue donnees maitres fournisseurs",
    "Alignement referentiel immobilisation",
    "Point mensuel steering ERP",
    "Suivi charge consultants integrateur",
    "Gestion des environnements DEV / REC / PROD",
    "Documentation ecarts parametrage vs. standard",
    "Plan de communication interne report",
    "Veille licence ERP et renouvellement support",
  ],
  "05": [
    "Plan de segmentation reseau — v2",
    "Cartographie flux east-west et zones PAM",
    "Deploiement regles pare-feu et bastion",
    "POC bastion — validation equipe cyber",
    "Revue mensuelle comite risques cyber",
    "Inventaire comptes a privileges (PAM)",
    "Segmentation VLAN / micro-segmentation POC",
    "Durcissement serveurs Windows / Linux",
    "Journalisation centralisee SIEM",
    "Tests intrusion segment critique",
    "Procedure urgence ransomware segment isole",
    "Alignement politique firewall groupe",
    "Deploiement agents EDR complementaires",
    "Revue regles ACL trop permissives",
    "Plan de maintenance coordonnee avec metier",
    "Documentation schémas reseau a jour",
    "Exercice tabletop cyber — scenario fuite",
    "Integration tickets cyber avec SOC externe",
    "Reporting conformite directive NIS2 (suivi)",
    "Campagne sensibilisation utilisateurs PAM",
  ],
  "06": [
    "Integration prestataire paiement et 3DS",
    "Recette utilisateurs — parcours tunnel",
    "UX mobile et accessibilite tunnel achat",
    "Tests de charge et perf panier / paiement",
    "Plan de rollback et communication incident",
    "SEO / balisage post-migration e-commerce",
    "Panier abandonne — relance email",
    "CGV et mentions legales — validation juridique",
    "Passerelle anti-fraude et scoring",
    "Multi-devises et taux de change",
    "Integration transporteurs et suivi colis",
    "Tests navigateurs et devices mobiles",
    "Accessibilite RGAA — audit rapide",
    "Tracking analytics et consentement cookies",
    "Synchronisation stocks temps quasi reel",
    "Gestion promotions et codes promo",
    "Page confirmation commande et facture PDF",
    "Monitoring taux erreur paiement",
    "Hotfix production — file d'attente commandes",
    "Go-live marketing — campagne lancement",
  ],
  "07": [
    "Basculer les numeros pilotes (sites pilotes)",
    "Portabilite des dossiers et annuaire",
    "Tests appels d'urgence et services critiques",
    "Formation helpdesk et script d'accueil",
    "Plan de rollback operateur et PRA vocal",
    "Configuration SBC / routage entrant",
    "Qualite audio et MOS sur sites pilotes",
    "Portabilite numeros courts et SVI",
    "Facturation operateur — reconciliation",
    "Coordination coupure maintenance fibre",
    "Tests telephonie IP post-migration",
    "Mise a jour documentation numerotation",
    "Gestion portabilite en masse — fichier CSV",
    "Point hebdo avec responsable sites",
    "Communication utilisateurs fenetre bascule",
    "Tests astreinte et escalade N3",
    "Supervision QoS et jitter",
    "Desinstallation ancienne baie RTC",
    "Inventaire materiel telephonique restant",
    "Cloture prestation — PV de recette",
  ],
  "08": [
    "Deployer agents APM sur perimetre critique",
    "Cartographier serveurs sans agent",
    "Dashboards Grafana et SLO metier",
    "Regles d'alerting et routage PagerDuty",
    "Mise a jour agents — lot serveurs batch 1",
    "Correlation logs applicatifs / infra",
    "SLO erreurs 5xx et latence p95",
    "Cartographie dependances services critiques",
    "Reduction bruit alertes — tuning seuils",
    "Traces distribuees — OpenTelemetry POC",
    "Couts observabilite et retention logs",
    "Integration runbooks dans outil d'alerting",
    "Revue dashboards par equipe produit",
    "Couverture APM sur APIs internes",
    "Health checks synthetiques utilisateur",
    "Documentation on-call et escalade",
    "Nettoyage metriques obsoletes",
    "Alignement naming conventions metriques",
    "Tests charge sur pipeline de metriques",
    "Bilan mensuel dette observabilite",
  ],
  "09": [
    "Atelier contrat cadre et gouvernance API",
    "Specification OpenAPI et environnement sandbox",
    "Tests d'integration sandbox — jeux de donnees",
    "Recette conjointe avec equipe editeur",
    "Planning go-live et communication utilisateurs",
    "Authentification OAuth2 client credentials",
    "Quotas et limitation de debit API",
    "Journalisation appels et traçabilite",
    "Gestion des secrets et rotation cles",
    "Versionning API et politique de deprecation",
    "SLA disponibilite et fenetre maintenance",
    "Escalade support N2 editeur",
    "Jeux de tests charges utiles JSON",
    "Validation RGPD flux donnees personnelles",
    "Monitoring disponibilite endpoint sante",
    "Documentation developpeur portail partenaire",
    "Tests de non-regression release editeur",
    "Plan B si indisponibilite API critique",
    "Revue securite entete HTTP et CORS",
    "Atelier pricing et facturation a l'usage",
  ],
  "10": [
    "Atelier cadrage RGPD et corpus documentaires",
    "Choix modele / hebergement et premier POC",
    "POC interne — prompt et evaluation qualite",
    "Budget cloud et volumetrie tokens",
    "Gouvernance donnees sensibles et classification",
    "Indexation corpus et chunking documents",
    "Politique retention et droit a l'oubli",
    "Filtrage contenu inapproprie / hallucinations",
    "Integration recherche dans intranet",
    "Authentification utilisateurs et SSO",
    "Journalisation questions / reponses audit",
    "Tests utilisateurs pilotes par metier",
    "Matrice RACI proprietaires corpus",
    "Hébergement UE et clauses sous-traitants",
    "Plan de formation equipe support",
    "Veille reglementaire IA Act (suivi)",
    "Couts inference vs. budget IT",
    "Roadmap V2 — agents et outils",
    "Revue securite prompt injection",
    "Cadrage go / no-go industrialisation",
  ],
};

function ownerFor(i: number): OwnerKey {
  if (i % 3 === 0) return "a";
  if (i % 3 === 1) return "b";
  return "a";
}

/** Projet actif : mix réaliste terminé / en cours / à faire / bloqué. */
function mixActive(i: number): Pick<TaskSeed, "status" | "priority" | "progress"> {
  if (i < 5) return { status: D, priority: MD, progress: 100 };
  if (i < 11) return { status: W, priority: i % 2 === 0 ? HI : MD, progress: 15 + (i % 6) * 12 };
  if (i < 17) return { status: T, priority: i % 4 === 0 ? HI : MD, progress: 0 };
  if (i === 17) return { status: B, priority: HI, progress: 12 };
  return { status: T, priority: LO, progress: 0 };
}

/** Projet terminé : presque tout livré. */
function mixCompleted(i: number): Pick<TaskSeed, "status" | "priority" | "progress"> {
  if (i < 17) return { status: D, priority: i % 3 === 0 ? HI : MD, progress: 100 };
  if (i < 19) return { status: D, priority: LO, progress: 100 };
  return { status: X, priority: MD, progress: 0 };
}

/** Projet en pause : plus de blocages et backlog. */
function mixOnHold(i: number): Pick<TaskSeed, "status" | "priority" | "progress"> {
  if (i < 3) return { status: B, priority: HI, progress: 10 + i * 5 };
  if (i < 8) return { status: T, priority: MD, progress: 0 };
  if (i < 14) return { status: W, priority: MD, progress: 20 + (i % 4) * 15 };
  return { status: T, priority: i % 2 === 0 ? LO : MD, progress: 0 };
}

/** Cyber : un peu plus de criticité. */
function mixCyber(i: number): Pick<TaskSeed, "status" | "priority" | "progress"> {
  if (i === 0) return { status: B, priority: CR, progress: 8 };
  if (i < 6) return { status: W, priority: HI, progress: 25 + (i % 5) * 10 };
  if (i < 12) return { status: D, priority: MD, progress: 100 };
  if (i < 18) return { status: T, priority: HI, progress: 0 };
  return { status: W, priority: MD, progress: 40 };
}

/** E-commerce / tel / obs / API / IA : actif avec léger ajustement. */
function mixStandard(i: number): Pick<TaskSeed, "status" | "priority" | "progress"> {
  return mixActive(i);
}

function buildTasks(suffix: string): TaskSeed[] {
  const names = NAMES[suffix];
  if (!names?.length) return [];

  let mix: (i: number) => Pick<TaskSeed, "status" | "priority" | "progress">;
  switch (suffix) {
    case "03":
      mix = mixCompleted;
      break;
    case "04":
      mix = mixOnHold;
      break;
    case "05":
      mix = mixCyber;
      break;
    default:
      mix = mixStandard;
  }

  return names.map((name, i) => ({
    name,
    sortOrder: i,
    ...mix(i),
    owner: suffix === "09" && i === 0 ? null : ownerFor(i),
  }));
}

const TASKS_BY_SUFFIX: Record<string, TaskSeed[]> = Object.fromEntries(
  (Object.keys(NAMES) as string[]).map((suffix) => [suffix, buildTasks(suffix)]),
) as Record<string, TaskSeed[]>;

function seedSuffixFromCode(code: string): string | null {
  const m = code.match(/(?:^|-)SEED-(\d{1,2})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1 || n > 10) return null;
  return String(n).padStart(2, "0");
}

function resolveOwner(k: OwnerKey | undefined, userA: string, userB: string): string | null {
  if (k === "a") return userA;
  if (k === "b") return userB;
  return null;
}

function phaseIndexForTask(i: number): number {
  return Math.min(3, Math.floor(i / 5));
}

function taskDescription(name: string, phaseLabel: string, code: string): string {
  return [
    `Phase : ${phaseLabel}.`,
    `Objectif : livrer « ${name} » avec critères d'acceptation validés en comité de pilotage.`,
    `Réf. planning : ${code}. Mettre à jour l'avancement et les risques associés chaque semaine.`,
  ].join("\n");
}

function computeTaskDates(
  now: Date,
  i: number,
  status: ProjectTaskStatus,
): {
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
} {
  const plannedStartDate = addDaysUtc(now, -55 + i * 2);
  const plannedEndDate = addDaysUtc(now, -48 + i * 2 + 10);
  let actualStartDate: Date | null = null;
  let actualEndDate: Date | null = null;

  if (status === D) {
    actualStartDate = addDaysUtc(plannedStartDate, -2);
    actualEndDate = addDaysUtc(plannedEndDate, -1);
  } else if (status === W) {
    actualStartDate = addDaysUtc(now, -18 + (i % 8));
  } else if (status === B) {
    actualStartDate = addDaysUtc(now, -28);
  } else if (status === X) {
    actualStartDate = addDaysUtc(plannedStartDate, 2);
    actualEndDate = addDaysUtc(plannedStartDate, 9);
  }

  return { plannedStartDate, plannedEndDate, actualStartDate, actualEndDate };
}

/**
 * Recrée les tâches démo à chaque seed : phases, codes, descriptions, dates planifiées/réelles,
 * dépendance chaînée (fin → début) entre tâches successives.
 */
export async function ensureDemoProjectTasks(
  prisma: PrismaClient,
  clientId: string,
  prefix: string,
  now: Date,
  userA: string,
  userB: string,
): Promise<void> {
  const codes = Array.from({ length: 10 }, (_, i) => `${prefix}-SEED-${String(i + 1).padStart(2, "0")}`);
  const projects = await prisma.project.findMany({
    where: { clientId, code: { in: codes } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });
  if (projects.length === 0) return;

  const projectIds = projects.map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    await tx.projectActivity.deleteMany({
      where: { clientId, projectId: { in: projectIds } },
    });
    await tx.projectReview.deleteMany({
      where: { clientId, projectId: { in: projectIds } },
    });
    await tx.projectTask.deleteMany({
      where: { clientId, projectId: { in: projectIds } },
    });
    await tx.projectTaskPhase.deleteMany({
      where: { clientId, projectId: { in: projectIds } },
    });
  });

  for (const proj of projects) {
    const suffix = seedSuffixFromCode(proj.code);
    const seeds = suffix ? TASKS_BY_SUFFIX[suffix] : undefined;
    const phaseLabels = suffix ? PHASES_BY_SUFFIX[suffix] : undefined;
    if (!seeds?.length || !phaseLabels?.length) continue;

    await prisma.projectTaskPhase.createMany({
      data: phaseLabels.map((name, sortOrder) => ({
        clientId,
        projectId: proj.id,
        name,
        sortOrder,
      })),
    });

    const phases = await prisma.projectTaskPhase.findMany({
      where: { clientId, projectId: proj.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    let prevTaskId: string | null = null;

    for (const s of seeds) {
      const pIdx = phaseIndexForTask(s.sortOrder);
      const phaseId = phases[pIdx]?.id ?? null;
      const phaseLabel = phaseLabels[pIdx] ?? phaseLabels[0]!;
      const code = `${proj.code}-T${String(s.sortOrder + 1).padStart(2, "0")}`;
      const dates = computeTaskDates(now, s.sortOrder, s.status);

      const newTaskId: string = (
        await prisma.projectTask.create({
          data: {
            clientId,
            projectId: proj.id,
            phaseId,
            dependsOnTaskId: prevTaskId,
            dependencyType:
              prevTaskId != null ? ProjectTaskDependencyType.FINISH_TO_START : null,
            code,
            name: s.name,
            description: taskDescription(s.name, phaseLabel, code),
            status: s.status,
            priority: s.priority,
            progress: s.progress,
            sortOrder: s.sortOrder,
            plannedStartDate: dates.plannedStartDate,
            plannedEndDate: dates.plannedEndDate,
            actualStartDate: dates.actualStartDate,
            actualEndDate: dates.actualEndDate,
            ownerUserId: resolveOwner(s.owner, userA, userB),
            createdByUserId: userA,
          },
          select: { id: true },
        })
      ).id;
      prevTaskId = newTaskId;
    }
  }
}
