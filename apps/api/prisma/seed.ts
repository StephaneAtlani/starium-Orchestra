import * as fs from "fs";
import * as path from "path";
import {
  Prisma,
  PrismaClient,
  ClientUserRole,
  ClientUserStatus,
  ClientModuleStatus,
  BudgetExerciseStatus,
  BudgetStatus,
  BudgetEnvelopeStatus,
  BudgetEnvelopeType,
  BudgetLineStatus,
  BudgetLinePlanningMode,
  ExpenseType,
  SupplierStatus,
  PurchaseOrderStatus,
  InvoiceStatus,
  FinancialEventType,
  FinancialSourceType,
  ProjectKind,
  ProjectType,
  ProjectStatus,
  ProjectPriority,
  ProjectCriticality,
  ProjectTaskStatus,
  ProjectTaskPriority,
  ProjectMilestoneStatus,
  ProjectTeamRoleSystemKind,
  ResourceType,
  ResourceAffiliation,
  CollaboratorSource,
  CollaboratorStatus,
  ProjectBudgetAllocationType,
  PlatformRole,
  RoleScope,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { DEMO_PROJECT_SHEETS, type DemoProjectSheet } from "./seed-project-demo-sheets";
import { ensureDemoActionPlans } from "./seed-action-plans-demo";
import { ensureDemoProjectReviews } from "./seed-project-demo-reviews";
import { ensureDemoProjectRisks } from "./seed-project-demo-risks";
import { ensureDemoCompliance } from "./seed-compliance-demo";
import { ensureDemoProjectTaskBuckets } from "./seed-project-demo-buckets";
import { ensureDemoProjectActivities } from "./seed-project-demo-activities";
import { ensureDemoProjectTasks } from "./seed-project-demo-tasks";
import { ensureDemoProjectTagsAndLabels } from "./seed-project-demo-tags";
import { ensureRiskTaxonomyForClient } from "../src/modules/risk-taxonomy/risk-taxonomy-defaults";
import { ensureDefaultActivityTypes } from "../src/modules/activity-types/activity-types-defaults";
import { ensureBudgetSnapshotsAndVersions } from "./seed-budget-snapshots-versions";
import { ensureBudgetCockpitCompleteDemo } from "./seed-budget-cockpit-complete";

const prisma = new PrismaClient();
const PASSWORD = "aa";
const VAT_RATE = 20;

type FlowType = "NONE" | "PO_ONLY" | "PARTIAL" | "FULL" | "OVER" | "INVOICE_ONLY";

type UserSeed = {
  email: string;
  firstName: string;
  lastName: string;
  role: ClientUserRole;
  title: string;
};

type SupplierSeed = {
  name: string;
  category: string;
  code?: string;
  externalId?: string;
  website?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  notes?: string;
};

type LineSeed = {
  code: string;
  name: string;
  expenseType: ExpenseType;
  amount: number;
  supplierName: string;
  flow: FlowType;
  description?: string;
};

type EnvelopeSeed = {
  code: string;
  name: string;
  type: BudgetEnvelopeType;
  lines: LineSeed[];
};

type BudgetSeed = {
  code: string;
  name: string;
  currency: string;
  envelopes: EnvelopeSeed[];
};

type ExerciseSeed = {
  year: number;
  budgets: BudgetSeed[];
};

type ClientSeed = {
  name: string;
  slug: string;
  users: UserSeed[];
  suppliers: SupplierSeed[];
  exercises: ExerciseSeed[];
};

const SHARED_USERS: UserSeed[] = [
  {
    email: "stephane.atlani@starium.demo",
    firstName: "Stephane",
    lastName: "Atlani",
    role: "CLIENT_ADMIN",
    title: "DSI a temps partage",
  },
  {
    email: "nora.dupin@starium.demo",
    firstName: "Nora",
    lastName: "Dupin",
    role: "CLIENT_USER",
    title: "PMO externe",
  },
];

function n(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function vat(amountHt: number, rate = VAT_RATE) {
  const taxAmount = round2(amountHt * (rate / 100));
  const amountTtc = round2(amountHt + taxAmount);
  return { taxRate: rate, taxAmount, amountTtc };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function y(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
}

function makeSuppliers(defs: Array<[string, string, string, string?]>): SupplierSeed[] {
  return defs.map(([name, category, website, externalId]) => ({
    name,
    category,
    website,
    externalId,
    code: externalId ? externalId.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 30) : undefined,
    email: undefined,
    phone: undefined,
    vatNumber: undefined,
    notes: undefined,
  }));
}

function lines(prefix: string, defs: Array<[string, string, ExpenseType, number, string, FlowType]>): LineSeed[] {
  return defs.map(([code, name, expenseType, amount, supplierName, flow]) => ({
    code: `${prefix}-${code}`,
    name,
    expenseType,
    amount,
    supplierName,
    flow,
  }));
}

/** Budgets « IT » : seuil de lignes seed plus élevé (cockpit / grilles démo). */
function isItBudget(budget: BudgetSeed): boolean {
  return (
    /(^|-)IT(-|$)/i.test(budget.code) ||
    /\bBudget\s+IT\b/i.test(budget.name)
  );
}

/** Intitulés métier crédibles pour lignes budgétaires auto-complétées (évite « Poste seed »). */
const BUDGET_PAD_LINE_LABELS_FR: string[] = [
  "Abonnement Microsoft 365 E5",
  "Abonnement Salesforce CRM",
  "Accompagnement intégration SI — régie T&M",
  "Antivirus postes de travail — renouvellement",
  "API management & passerelle",
  "Assistance éditeur SAP — pack annuel",
  "Audit sécurité annuel — prestataire externe",
  "Authentification multifacteur — licences",
  "Backup & réplication datacenter",
  "Bastion d’administration sécurisée",
  "Business Intelligence — licences Power BI Pro",
  "CAE / contrat d’infogérance réseau",
  "Câblage et baies — rénovation site secondaire",
  "Centre de données — colocation & rack",
  "Certificats SSL/TLS wildcard",
  "Chiffrement postes — solution EDR",
  "Cloud privé — ressources vCPU / RAM",
  "Cloud public — instances EC2 / compute",
  "Collaboration — Teams Phone & audioconf",
  "Conseil architecture cloud — mission",
  "Contrat maintenance imprimantes multisite",
  "Copilotes IA — licences entreprise",
  "Cyber assurance — prime annuelle",
  "Data lake — stockage objet",
  "Déploiement MDM — Apple Business Manager",
  "Développement sur mesure — prestation",
  "DLP — prévention fuite de données",
  "DNS & résolution DNS managée",
  "E-mail sécurisé — filtrage anti-phishing",
  "E-learning cybersécurité — abonnement",
  "ERP — licences utilisateurs",
  "ESN — TMA applicative",
  "Firewall nouvelle génération — abonnement",
  "Formation utilisateurs — catalogue digital",
  "GED — hébergement & support",
  "Gestion des identités — IAM",
  "Gestionnaire de mots de passe entreprise",
  "Hébergement applicatif managé",
  "Hyperviseur & licences VMware",
  "IA générative — usage API tokens",
  "Identité fédérée — SSO entreprise",
  "Impression centralisée — solution SaaS",
  "Infrastructure réseau — switches & Wi-Fi",
  "Intégration EDR / XDR",
  "IoT — supervision et connectivité",
  "Journaux & SIEM — rétention",
  "Kubernetes managé — cluster production",
  "Licences Adobe Creative Cloud",
  "Licences antivirus serveurs",
  "Licences Atlassian (Jira / Confluence)",
  "Licences base de données Oracle",
  "Licences base de données SQL Server",
  "Licences CAO / PLM",
  "Licences Citrix / Virtual Apps",
  "Licences développement JetBrains",
  "Licences ESRI / SIG",
  "Licences graphisme & PAO",
  "Licences Microsoft Project / Server",
  "Licences monitoring réseau",
  "Licences SAP utilisateurs",
  "Load balancer applicatif — matériel",
  "Logs centralisés — observabilité",
  "Maintenance préventive serveurs",
  "Messagerie — archivage légal",
  "Messagerie — migration cloud",
  "Monitoring applicatif APM",
  "NAS & sauvegarde locale",
  "NoSQL managé — cluster",
  "Onduleurs & alimentation secours",
  "Outils de ticketing ITSM",
  "Pare-feu applicatif WAF",
  "Patch management — solution",
  "Pénurie & stock pièces détachées",
  "Postes de travail — renouvellement parc",
  "Prestation audit RGPD",
  "Prestation pentest trimestriel",
  "Prestation régie data — ETP",
  "Private link / interconnexion cloud",
  "Proxy web & filtrage URL",
  "Renouvellement contrat télécom fibre",
  "Renouvellement support éditeur",
  "Réplication inter-sites — stockage",
  "Réseau SD-WAN — sites distants",
  "Ressources GPU cloud — inference",
  "Restauration d’urgence — forfait DR",
  "Sauvegarde cloud — sauvegardes managées",
  "Sauvegarde Microsoft 365",
  "Scan vulnérabilités — outil",
  "Serveurs applicatifs — renouvellement",
  "Service desk externalisé — forfait",
  "Signature électronique — volume",
  "Stockage cloud — buckets S3",
  "Stockage SAN — extension capacité",
  "Supervision infrastructure — Nagios / équivalent",
  "Support 24/7 production — astreinte",
  "Support éditeur cybersécurité",
  "Switching cœur de réseau",
  "Synchro fichiers entreprise",
  "Téléphonie IP — licences utilisateurs",
  "Téléphonie mobile — forfaits entreprise",
  "Télémétrie & flux industriels",
  "Tunnels VPN site-à-site",
  "Virtualisation postes VDI",
  "VPN ZTNA — accès utilisateurs",
  "WAN — liens opérateurs",
  "Wi-Fi invité & contrôle d’accès",
  "Wi-Fi sites industriels — renouvellement",
  "Workspace Google — licences",
  "Zéro trust — licences endpoint",
];

function padLineDisplayName(seq: number, envelopeName: string): string {
  const base = BUDGET_PAD_LINE_LABELS_FR[(seq - 1) % BUDGET_PAD_LINE_LABELS_FR.length];
  const cycle = Math.floor((seq - 1) / BUDGET_PAD_LINE_LABELS_FR.length);
  if (cycle === 0) {
    return `${base} — ${envelopeName}`;
  }
  return `${base} — ${envelopeName} (lot ${cycle + 1})`;
}

/**
 * Complète un budget jusqu’à `minTotalLines` lignes (répartition round-robin sur les enveloppes).
 * Codes uniques par budget (`clientId` + `budgetId` + `code`).
 */
function padBudgetLines(budget: BudgetSeed, minTotalLines: number, supplierNames: string[]): void {
  if (supplierNames.length === 0) {
    throw new Error(`padBudgetLines: aucun fournisseur pour le budget ${budget.code}`);
  }
  let total = budget.envelopes.reduce((sum, env) => sum + env.lines.length, 0);
  if (total >= minTotalLines) {
    return;
  }
  const existingCodes = new Set<string>();
  for (const env of budget.envelopes) {
    for (const line of env.lines) {
      existingCodes.add(line.code);
    }
  }
  const expenseTypes: ExpenseType[] = ["OPEX", "OPEX", "CAPEX"];
  const flows: FlowType[] = ["PARTIAL", "FULL", "PO_ONLY", "NONE", "INVOICE_ONLY"];
  const slug = budget.code.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20);
  let seq = 0;
  let envIndex = 0;
  while (total < minTotalLines) {
    const env = budget.envelopes[envIndex % budget.envelopes.length];
    seq += 1;
    let code = `${slug}-A${String(seq).padStart(4, "0")}`;
    while (existingCodes.has(code)) {
      seq += 1;
      code = `${slug}-A${String(seq).padStart(4, "0")}`;
    }
    existingCodes.add(code);
    const supplier = supplierNames[(seq - 1) % supplierNames.length];
    const amount = round2(2500 + ((seq * 973) % 87000) + (seq % 7) * 100);
    env.lines.push({
      code,
      name: padLineDisplayName(seq, env.name),
      expenseType: expenseTypes[(seq - 1) % expenseTypes.length],
      amount,
      supplierName: supplier,
      flow: flows[(seq - 1) % flows.length],
    });
    total += 1;
    envIndex += 1;
  }
}

const CLIENTS: ClientSeed[] = [
  {
    name: "NeoTech AI",
    slug: "neotech-ai",
    users: [
      { email: "alice.morel@neotech.demo", firstName: "Alice", lastName: "Morel", role: "CLIENT_ADMIN", title: "DG" },
      { email: "julien.robin@neotech.demo", firstName: "Julien", lastName: "Robin", role: "CLIENT_ADMIN", title: "COO" },
      { email: "clara.perrin@neotech.demo", firstName: "Clara", lastName: "Perrin", role: "CLIENT_ADMIN", title: "DAF" },
      { email: "leo.marchand@neotech.demo", firstName: "Leo", lastName: "Marchand", role: "CLIENT_ADMIN", title: "CTO" },
      { email: "sarah.lemoine@neotech.demo", firstName: "Sarah", lastName: "Lemoine", role: "CLIENT_USER", title: "Head of Product" },
      { email: "mehdi.dupuy@neotech.demo", firstName: "Mehdi", lastName: "Dupuy", role: "CLIENT_USER", title: "DevOps" },
      ...SHARED_USERS,
    ],
    suppliers: makeSuppliers([
      ["Amazon Web Services", "Cloud", "https://aws.amazon.com", "aws"],
      ["Cloudflare", "Network & CDN", "https://www.cloudflare.com", "cloudflare"],
      ["GitHub", "Dev Tools", "https://github.com", "github"],
      ["Vercel", "Hosting", "https://vercel.com", "vercel"],
      ["Datadog", "Observability", "https://www.datadoghq.com", "datadog"],
      ["Okta", "IAM", "https://www.okta.com", "okta"],
      ["CrowdStrike", "Cybersecurity", "https://www.crowdstrike.com", "crowdstrike"],
      ["OpenAI", "AI Platform", "https://openai.com", "openai"],
    ]),
    exercises: [
      {
        year: 2024,
        budgets: [
          {
            code: "NEO-2024-IT",
            name: "Budget IT 2024",
            currency: "EUR",
            envelopes: [
              {
                code: "RUN",
                name: "RUN",
                type: "RUN",
                lines: lines("NEO24-IT-RUN", [
                  ["AWS-COMPUTE", "AWS Compute", "OPEX", 38000, "Amazon Web Services", "PARTIAL"],
                  ["GITHUB", "GitHub Enterprise", "OPEX", 6000, "GitHub", "FULL"],
                  ["VERCEL", "Vercel", "OPEX", 3500, "Vercel", "FULL"],
                ]),
              },
            ],
          },
          {
            code: "NEO-2024-PROD",
            name: "Budget Produit 2024",
            currency: "EUR",
            envelopes: [
              {
                code: "BUILD",
                name: "Build",
                type: "BUILD",
                lines: lines("NEO24-PRD-BLD", [
                  ["ML-API", "API IA", "OPEX", 24000, "OpenAI", "PARTIAL"],
                  ["OBS", "Observabilite", "OPEX", 9000, "Datadog", "PO_ONLY"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2025,
        budgets: [
          {
            code: "NEO-2025-IT",
            name: "Budget IT 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "CLOUD",
                name: "Cloud",
                type: "RUN",
                lines: lines("NEO25-IT-CLD", [
                  ["AWS-COMPUTE", "AWS Compute", "OPEX", 65000, "Amazon Web Services", "PARTIAL"],
                  ["CLOUDFLARE", "Cloudflare", "OPEX", 7000, "Cloudflare", "FULL"],
                  ["VERCEL", "Vercel", "OPEX", 6000, "Vercel", "FULL"],
                ]),
              },
              {
                code: "SEC",
                name: "Security",
                type: "TRANSVERSE",
                lines: lines("NEO25-IT-SEC", [
                  ["OKTA", "Okta SSO", "OPEX", 10000, "Okta", "PO_ONLY"],
                  ["CROWD", "CrowdStrike Falcon", "OPEX", 12000, "CrowdStrike", "NONE"],
                ]),
              },
            ],
          },
          {
            code: "NEO-2025-MKT",
            name: "Budget Marketing 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "ACQ",
                name: "Acquisition",
                type: "BUILD",
                lines: lines("NEO25-MKT-ACQ", [
                  ["MKT-OPS", "Ops marketing", "OPEX", 25000, "OpenAI", "INVOICE_ONLY"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2026,
        budgets: [
          {
            code: "NEO-2026-IT",
            name: "Budget IT Core 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "CLOUD",
                name: "Cloud",
                type: "RUN",
                lines: lines("NEO26-IT-CLD", [
                  ["AWS-COMPUTE", "AWS Compute", "OPEX", 120000, "Amazon Web Services", "PARTIAL"],
                  ["AWS-STORAGE", "AWS Storage", "OPEX", 45000, "Amazon Web Services", "FULL"],
                  ["CLOUDFLARE", "Cloudflare", "OPEX", 18000, "Cloudflare", "FULL"],
                  ["VERCEL", "Vercel", "OPEX", 12000, "Vercel", "FULL"],
                ]),
              },
              {
                code: "TOOLS",
                name: "Dev Tools",
                type: "RUN",
                lines: lines("NEO26-IT-TLS", [
                  ["GITHUB", "GitHub Enterprise", "OPEX", 18000, "GitHub", "FULL"],
                  ["DATADOG", "Datadog", "OPEX", 30000, "Datadog", "PARTIAL"],
                ]),
              },
              {
                code: "SECURITY",
                name: "Security",
                type: "TRANSVERSE",
                lines: lines("NEO26-IT-SEC", [
                  ["OKTA", "Okta", "OPEX", 15000, "Okta", "PO_ONLY"],
                  ["CROWD", "CrowdStrike Falcon", "OPEX", 12000, "CrowdStrike", "NONE"],
                ]),
              },
            ],
          },
          {
            code: "NEO-2026-PRODUIT",
            name: "Budget Produit 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "AI",
                name: "AI Platform",
                type: "BUILD",
                lines: lines("NEO26-PRD-AI", [
                  ["LLM", "Consommation LLM", "OPEX", 220000, "OpenAI", "OVER"],
                  ["OBS", "Observabilite IA", "OPEX", 25000, "Datadog", "PARTIAL"],
                ]),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "BatiPro Groupe",
    slug: "batipro-groupe",
    users: [
      { email: "marc.bernard@batipro.demo", firstName: "Marc", lastName: "Bernard", role: "CLIENT_ADMIN", title: "DG" },
      { email: "julie.fontaine@batipro.demo", firstName: "Julie", lastName: "Fontaine", role: "CLIENT_ADMIN", title: "DAF" },
      { email: "paul.renard@batipro.demo", firstName: "Paul", lastName: "Renard", role: "CLIENT_ADMIN", title: "DSI" },
      { email: "thomas.leclerc@batipro.demo", firstName: "Thomas", lastName: "Leclerc", role: "CLIENT_USER", title: "Chef de projet IT" },
      ...SHARED_USERS,
    ],
    suppliers: makeSuppliers([
      ["Sage", "ERP", "https://www.sage.com", "sage"],
      ["Orange Business", "Telecom", "https://www.orange-business.com", "orange-business"],
      ["Dell Technologies", "Hardware", "https://www.dell.com", "dell"],
      ["HP", "Hardware", "https://www.hp.com", "hp"],
      ["Fortinet", "Cybersecurity", "https://www.fortinet.com", "fortinet"],
      ["Veeam", "Backup", "https://www.veeam.com", "veeam"],
      ["Microsoft", "Productivity", "https://www.microsoft.com", "microsoft"],
      ["Capgemini", "ESN", "https://www.capgemini.com", "capgemini"],
    ]),
    exercises: [
      {
        year: 2024,
        budgets: [
          {
            code: "BAT-2024-IT",
            name: "Budget IT 2024",
            currency: "EUR",
            envelopes: [
              {
                code: "ERP",
                name: "ERP",
                type: "RUN",
                lines: lines("BAT24-ERP", [
                  ["SAGE-LIC", "Sage X3 licences", "OPEX", 180000, "Sage", "PARTIAL"],
                  ["SAGE-ESN", "Support ESN Sage", "OPEX", 65000, "Capgemini", "PARTIAL"],
                ]),
              },
              {
                code: "INFRA",
                name: "Infrastructure",
                type: "RUN",
                lines: lines("BAT24-INF", [
                  ["ORANGE-WAN", "WAN national", "OPEX", 80000, "Orange Business", "FULL"],
                  ["DELL-PC", "Postes Dell", "CAPEX", 120000, "Dell Technologies", "FULL"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2025,
        budgets: [
          {
            code: "BAT-2025-IT",
            name: "Budget IT 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "RUN",
                name: "RUN",
                type: "RUN",
                lines: lines("BAT25-RUN", [
                  ["M365", "Microsoft 365", "OPEX", 135000, "Microsoft", "PARTIAL"],
                  ["ORANGE", "Telecom national", "OPEX", 98000, "Orange Business", "FULL"],
                  ["FORTI", "Fortinet firewalls", "OPEX", 35000, "Fortinet", "PO_ONLY"],
                ]),
              },
            ],
          },
          {
            code: "BAT-2025-DIG",
            name: "Budget Digitalisation 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "BUILD",
                name: "Build",
                type: "BUILD",
                lines: lines("BAT25-BLD", [
                  ["GED", "GED chantier", "OPEX", 120000, "Capgemini", "PARTIAL"],
                  ["MOBILE", "App mobile terrain", "OPEX", 150000, "Capgemini", "PO_ONLY"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2026,
        budgets: [
          {
            code: "BAT-2026-IT",
            name: "Budget IT 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "ERP",
                name: "ERP",
                type: "RUN",
                lines: lines("BAT26-ERP", [
                  ["SAGE-LIC", "Sage X3 licences", "OPEX", 250000, "Sage", "PARTIAL"],
                  ["SAGE-TMA", "TMA Sage", "OPEX", 120000, "Capgemini", "PO_ONLY"],
                ]),
              },
              {
                code: "INFRA",
                name: "Infrastructure",
                type: "RUN",
                lines: lines("BAT26-INF", [
                  ["ORANGE", "Orange Business WAN", "OPEX", 120000, "Orange Business", "FULL"],
                  ["DELL", "Renouvellement postes", "CAPEX", 100000, "Dell Technologies", "FULL"],
                  ["VEEAM", "Veeam Backup", "OPEX", 28000, "Veeam", "FULL"],
                ]),
              },
            ],
          },
          {
            code: "BAT-2026-SEC",
            name: "Budget Securite 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "PROTECTION",
                name: "Protection",
                type: "TRANSVERSE",
                lines: lines("BAT26-SEC", [
                  ["FORTI", "Fortinet EDR", "OPEX", 50000, "Fortinet", "PO_ONLY"],
                  ["AWARENESS", "Sensibilisation cyber", "OPEX", 15000, "Microsoft", "INVOICE_ONLY"],
                ]),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Medisys Sante",
    slug: "medisys-sante",
    users: [
      { email: "laura.morel@medisys.demo", firstName: "Laura", lastName: "Morel", role: "CLIENT_ADMIN", title: "DG" },
      { email: "vincent.caron@medisys.demo", firstName: "Vincent", lastName: "Caron", role: "CLIENT_ADMIN", title: "DAF" },
      { email: "nicolas.fabre@medisys.demo", firstName: "Nicolas", lastName: "Fabre", role: "CLIENT_ADMIN", title: "DSI" },
      { email: "ines.marchal@medisys.demo", firstName: "Ines", lastName: "Marchal", role: "CLIENT_USER", title: "RSSI" },
      ...SHARED_USERS,
    ],
    suppliers: makeSuppliers([
      ["Microsoft", "Productivity", "https://www.microsoft.com", "microsoft"],
      ["Oracle", "Database", "https://www.oracle.com", "oracle"],
      ["ServiceNow", "IT Management", "https://www.servicenow.com", "servicenow"],
      ["Palo Alto Networks", "Cybersecurity", "https://www.paloaltonetworks.com", "palo-alto"],
      ["CrowdStrike", "Cybersecurity", "https://www.crowdstrike.com", "crowdstrike"],
      ["Cisco", "Network", "https://www.cisco.com", "cisco"],
      ["HPE", "Infrastructure", "https://www.hpe.com", "hpe"],
      ["Docaposte", "Digital Trust", "https://www.docaposte.com", "docaposte"],
    ]),
    exercises: [
      {
        year: 2025,
        budgets: [
          {
            code: "MED-2025-IT",
            name: "Budget IT 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "APPS",
                name: "Applications",
                type: "RUN",
                lines: lines("MED25-APP", [
                  ["M365", "Microsoft 365", "OPEX", 350000, "Microsoft", "PARTIAL"],
                  ["ORACLE", "Oracle DB", "OPEX", 210000, "Oracle", "PO_ONLY"],
                  ["SNOW", "ServiceNow", "OPEX", 120000, "ServiceNow", "FULL"],
                ]),
              },
            ],
          },
          {
            code: "MED-2025-CYBER",
            name: "Budget Cyber 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "PROTECT",
                name: "Protection",
                type: "TRANSVERSE",
                lines: lines("MED25-CYB", [
                  ["PALO", "Palo Alto Networks", "OPEX", 220000, "Palo Alto Networks", "PARTIAL"],
                  ["CROWD", "CrowdStrike Falcon", "OPEX", 180000, "CrowdStrike", "PARTIAL"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2026,
        budgets: [
          {
            code: "MED-2026-IT",
            name: "Budget IT 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "INFRA",
                name: "Infrastructure",
                type: "RUN",
                lines: lines("MED26-INF", [
                  ["HPE", "HPE Compute", "CAPEX", 400000, "HPE", "FULL"],
                  ["CISCO", "Cisco reseau", "OPEX", 180000, "Cisco", "PO_ONLY"],
                  ["M365", "Microsoft 365", "OPEX", 600000, "Microsoft", "PARTIAL"],
                ]),
              },
              {
                code: "APPS",
                name: "Applications",
                type: "RUN",
                lines: lines("MED26-APP", [
                  ["ORACLE", "Oracle DB", "OPEX", 280000, "Oracle", "PO_ONLY"],
                  ["DOCA", "Docaposte", "OPEX", 90000, "Docaposte", "FULL"],
                ]),
              },
            ],
          },
          {
            code: "MED-2026-CYBER",
            name: "Budget Cyber 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "DETECTION",
                name: "Detection",
                type: "TRANSVERSE",
                lines: lines("MED26-DET", [
                  ["SOC", "SOC externalise", "OPEX", 500000, "Palo Alto Networks", "PARTIAL"],
                  ["EDR", "EDR", "OPEX", 300000, "CrowdStrike", "PARTIAL"],
                ]),
              },
            ],
          },
          {
            code: "MED-2026-DATA",
            name: "Budget Data 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "PLATFORM",
                name: "Plateforme data",
                type: "BUILD",
                lines: lines("MED26-DAT", [
                  ["SNOW", "ServiceNow interop", "OPEX", 180000, "ServiceNow", "INVOICE_ONLY"],
                ]),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "GlobalTrans France",
    slug: "globaltrans-france",
    users: [
      { email: "didier.lambert@globaltrans.demo", firstName: "Didier", lastName: "Lambert", role: "CLIENT_ADMIN", title: "DG Groupe" },
      { email: "sarah.meunier@globaltrans.demo", firstName: "Sarah", lastName: "Meunier", role: "CLIENT_ADMIN", title: "DAF Groupe" },
      { email: "thomas.perret@globaltrans.demo", firstName: "Thomas", lastName: "Perret", role: "CLIENT_ADMIN", title: "DSI Groupe" },
      { email: "camille.boyer@globaltrans-fr.demo", firstName: "Camille", lastName: "Boyer", role: "CLIENT_ADMIN", title: "DG France" },
      ...SHARED_USERS,
    ],
    suppliers: makeSuppliers([
      ["SAP", "ERP", "https://www.sap.com", "sap"],
      ["Orange Business", "Telecom", "https://www.orange-business.com", "orange-business"],
      ["Cisco", "Network", "https://www.cisco.com", "cisco"],
      ["Capgemini", "ESN", "https://www.capgemini.com", "capgemini"],
      ["VMware", "Infrastructure", "https://www.vmware.com", "vmware"],
    ]),
    exercises: [
      {
        year: 2025,
        budgets: [
          {
            code: "GTF-2025-IT",
            name: "Budget IT France 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "RUN",
                name: "RUN",
                type: "RUN",
                lines: lines("GTF25-RUN", [
                  ["SAP", "SAP support", "OPEX", 550000, "SAP", "PARTIAL"],
                  ["WAN", "WAN France", "OPEX", 220000, "Orange Business", "FULL"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2026,
        budgets: [
          {
            code: "GTF-2026-IT",
            name: "Budget IT France 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "SAP",
                name: "SAP",
                type: "RUN",
                lines: lines("GTF26-SAP", [
                  ["LIC", "Licences SAP", "OPEX", 1300000, "SAP", "PARTIAL"],
                  ["INT", "Integration SAP", "OPEX", 800000, "Capgemini", "PO_ONLY"],
                ]),
              },
              {
                code: "INFRA",
                name: "Infrastructure",
                type: "RUN",
                lines: lines("GTF26-INF", [
                  ["ORANGE", "Orange Business", "OPEX", 260000, "Orange Business", "FULL"],
                  ["CISCO", "Cisco WAN", "OPEX", 210000, "Cisco", "PO_ONLY"],
                ]),
              },
            ],
          },
          {
            code: "GTF-2026-DIG",
            name: "Budget Digital France 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "WMS",
                name: "WMS",
                type: "BUILD",
                lines: lines("GTF26-WMS", [
                  ["WMS", "WMS entrepots", "OPEX", 420000, "Capgemini", "PARTIAL"],
                ]),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "GlobalTrans Germany",
    slug: "globaltrans-germany",
    users: [
      { email: "didier.lambert@globaltrans.demo", firstName: "Didier", lastName: "Lambert", role: "CLIENT_ADMIN", title: "DG Groupe" },
      { email: "sarah.meunier@globaltrans.demo", firstName: "Sarah", lastName: "Meunier", role: "CLIENT_ADMIN", title: "DAF Groupe" },
      { email: "thomas.perret@globaltrans.demo", firstName: "Thomas", lastName: "Perret", role: "CLIENT_ADMIN", title: "DSI Groupe" },
      { email: "lukas.schmidt@globaltrans-de.demo", firstName: "Lukas", lastName: "Schmidt", role: "CLIENT_ADMIN", title: "DSI Germany" },
      ...SHARED_USERS,
    ],
    suppliers: makeSuppliers([
      ["SAP", "ERP", "https://www.sap.com", "sap"],
      ["Deutsche Telekom", "Telecom", "https://www.telekom.com", "deutsche-telekom"],
      ["Cisco", "Network", "https://www.cisco.com", "cisco"],
      ["HPE", "Infrastructure", "https://www.hpe.com", "hpe"],
      ["Accenture", "Consulting", "https://www.accenture.com", "accenture"],
    ]),
    exercises: [
      {
        year: 2026,
        budgets: [
          {
            code: "GTD-2026-IT",
            name: "Budget IT Germany 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "SAP",
                name: "SAP",
                type: "RUN",
                lines: lines("GTD26-SAP", [
                  ["LIC", "Licences SAP", "OPEX", 1100000, "SAP", "PARTIAL"],
                  ["INT", "Integration SAP", "OPEX", 700000, "Accenture", "PO_ONLY"],
                ]),
              },
              {
                code: "INFRA",
                name: "Infrastructure",
                type: "RUN",
                lines: lines("GTD26-INF", [
                  ["DT", "Backbone Germany", "OPEX", 240000, "Deutsche Telekom", "FULL"],
                  ["HPE", "HPE compute", "CAPEX", 260000, "HPE", "FULL"],
                ]),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Industria Group",
    slug: "industria-group",
    users: [
      { email: "jean.vasseur@industria.demo", firstName: "Jean", lastName: "Vasseur", role: "CLIENT_ADMIN", title: "DG Groupe" },
      { email: "melanie.faure@industria.demo", firstName: "Melanie", lastName: "Faure", role: "CLIENT_ADMIN", title: "DAF Groupe" },
      { email: "olivier.masson@industria.demo", firstName: "Olivier", lastName: "Masson", role: "CLIENT_ADMIN", title: "DSI Groupe" },
      ...SHARED_USERS,
    ],
    suppliers: makeSuppliers([
      ["SAP", "ERP", "https://www.sap.com", "sap"],
      ["Microsoft", "Cloud", "https://www.microsoft.com", "microsoft"],
      ["Amazon Web Services", "Cloud", "https://aws.amazon.com", "aws"],
      ["Google Cloud", "Cloud", "https://cloud.google.com", "gcp"],
      ["Cisco", "Network", "https://www.cisco.com", "cisco"],
      ["HPE", "Infrastructure", "https://www.hpe.com", "hpe"],
      ["Dell Technologies", "Infrastructure", "https://www.dell.com", "dell"],
      ["Palo Alto Networks", "Cybersecurity", "https://www.paloaltonetworks.com", "palo-alto"],
      ["CrowdStrike", "Cybersecurity", "https://www.crowdstrike.com", "crowdstrike"],
      ["Accenture", "Consulting", "https://www.accenture.com", "accenture"],
    ]),
    exercises: [
      {
        year: 2024,
        budgets: [
          {
            code: "IND-2024-IT",
            name: "Budget IT 2024",
            currency: "EUR",
            envelopes: [
              {
                code: "RUN",
                name: "RUN",
                type: "RUN",
                lines: lines("IND24-RUN", [
                  ["SAP", "SAP", "OPEX", 9000000, "SAP", "PARTIAL"],
                  ["AZURE", "Azure", "OPEX", 7000000, "Microsoft", "PARTIAL"],
                  ["AWS", "AWS", "OPEX", 5000000, "Amazon Web Services", "PARTIAL"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2025,
        budgets: [
          {
            code: "IND-2025-IT",
            name: "Budget IT 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "RUN",
                name: "RUN",
                type: "RUN",
                lines: lines("IND25-RUN", [
                  ["SAP", "SAP", "OPEX", 10000000, "SAP", "PARTIAL"],
                  ["AWS", "AWS", "OPEX", 6000000, "Amazon Web Services", "PARTIAL"],
                ]),
              },
            ],
          },
          {
            code: "IND-2025-CYBER",
            name: "Budget Cyber 2025",
            currency: "EUR",
            envelopes: [
              {
                code: "SOC",
                name: "SOC",
                type: "TRANSVERSE",
                lines: lines("IND25-SOC", [
                  ["CROWD", "CrowdStrike", "OPEX", 2500000, "CrowdStrike", "PARTIAL"],
                  ["PALO", "Palo Alto", "OPEX", 2200000, "Palo Alto Networks", "PARTIAL"],
                ]),
              },
            ],
          },
        ],
      },
      {
        year: 2026,
        budgets: [
          {
            code: "IND-2026-IT",
            name: "Budget IT 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "ERP",
                name: "ERP",
                type: "RUN",
                lines: lines("IND26-ERP", [
                  ["SAP-LIC", "SAP licences", "OPEX", 12000000, "SAP", "PARTIAL"],
                  ["SAP-INT", "SAP integration", "OPEX", 3500000, "Accenture", "PO_ONLY"],
                ]),
              },
              {
                code: "CLOUD",
                name: "Cloud",
                type: "RUN",
                lines: lines("IND26-CLD", [
                  ["AZURE", "Azure", "OPEX", 9000000, "Microsoft", "PARTIAL"],
                  ["AWS", "AWS", "OPEX", 7000000, "Amazon Web Services", "PARTIAL"],
                  ["GCP", "Google Cloud", "OPEX", 3000000, "Google Cloud", "FULL"],
                ]),
              },
            ],
          },
          {
            code: "IND-2026-DATA",
            name: "Budget Data 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "PLATFORM",
                name: "Data Platform",
                type: "BUILD",
                lines: lines("IND26-DAT", [
                  ["ML", "MLOps", "OPEX", 3200000, "Google Cloud", "PO_ONLY"],
                ]),
              },
            ],
          },
          {
            code: "IND-2026-CYBER",
            name: "Budget Cyber 2026",
            currency: "EUR",
            envelopes: [
              {
                code: "PROTECT",
                name: "Protection",
                type: "TRANSVERSE",
                lines: lines("IND26-CYB", [
                  ["PALO", "Palo Alto", "OPEX", 3000000, "Palo Alto Networks", "PARTIAL"],
                  ["CROWD", "CrowdStrike", "OPEX", 2500000, "CrowdStrike", "PARTIAL"],
                ]),
              },
            ],
          },
        ],
      },
    ],
  },
];

async function upsertUser(user: UserSeed, passwordHash: string) {
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash,
      passwordLoginEnabled: true,
    },
    create: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash,
      passwordLoginEnabled: true,
    },
  });
}

async function upsertClient(seed: ClientSeed) {
  return prisma.client.upsert({
    where: { slug: seed.slug },
    update: { name: seed.name },
    create: {
      name: seed.name,
      slug: seed.slug,
    },
  });
}

/**
 * Active tous les modules plateforme pour le client (comme ClientsService.create).
 * Sans lignes ClientModule ENABLED, getPermissionCodes filtre toutes les permissions
 * (UserRole + rôles GLOBAL inclus) → navigation vide malgré des rôles assignés.
 */
/** Module RBAC + permissions `compliance.read` / `compliance.update` (idempotent). */
/**
 * Admin plateforme (routes /api/clients, /api/platform/*). Aucun ClientUser.
 * Mot de passe = même constante PASSWORD que les comptes *.demo.
 */
async function ensurePlatformAdminUser(passwordHash: string): Promise<void> {
  const email = "admin@starium.fr";
  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      passwordLoginEnabled: true,
      platformRole: PlatformRole.PLATFORM_ADMIN,
      firstName: "Platform",
      lastName: "Admin",
    },
    create: {
      email,
      passwordHash,
      passwordLoginEnabled: true,
      platformRole: PlatformRole.PLATFORM_ADMIN,
      firstName: "Platform",
      lastName: "Admin",
    },
  });
  console.log(`✅ Platform admin: ${email} (mot de passe = ${PASSWORD}, comme les comptes *.demo)`);
}

/** RFC-033 — permission cycle T1/T2/clôture (module budgets requis). */
async function ensureBudgetVersioningCyclePermission(): Promise<void> {
  const mod = await prisma.module.findFirst({ where: { code: "budgets" } });
  if (!mod) {
    console.warn(
      "⚠️ Module budgets introuvable — permission budgets.versioning_cycle.manage ignorée.",
    );
    return;
  }
  await prisma.permission.upsert({
    where: { code: "budgets.versioning_cycle.manage" },
    create: {
      code: "budgets.versioning_cycle.manage",
      label: "Budget — gérer les versions de cycle (T1/T2/clôture)",
      description:
        "Créer des révisions de cycle et clôturer depuis les options budget (RFC-033).",
      moduleId: mod.id,
    },
    update: {
      label: "Budget — gérer les versions de cycle (T1/T2/clôture)",
      description:
        "Créer des révisions de cycle et clôturer depuis les options budget (RFC-033).",
    },
  });
  console.log("✅ Permission budgets.versioning_cycle.manage");
}

async function ensureRisksModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "risks" },
    create: {
      code: "risks",
      name: "Risques",
      description: "Taxonomie et référentiel risques projet",
      isActive: true,
    },
    update: { isActive: true },
  });
  await prisma.permission.upsert({
    where: { code: "risks.taxonomy.manage" },
    create: {
      code: "risks.taxonomy.manage",
      label: "Risques — administration taxonomie (domaines / types)",
      moduleId: mod.id,
    },
    update: {
      label: "Risques — administration taxonomie (domaines / types)",
    },
  });
}

/**
 * Rôle global minimal : permission taxonomie risques pour les CLIENT_ADMIN (UserRole).
 * Idempotent.
 */
async function ensureClientAdminRiskTaxonomyRole(): Promise<void> {
  const perm = await prisma.permission.findUnique({
    where: { code: "risks.taxonomy.manage" },
  });
  if (!perm) return;
  let role = await prisma.role.findFirst({
    where: { scope: RoleScope.GLOBAL, name: "Client admin — taxonomie risques" },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        scope: RoleScope.GLOBAL,
        name: "Client admin — taxonomie risques",
        description: "Gestion des domaines et types de risque pour le client",
        isSystem: true,
      },
    });
  }
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId: role.id, permissionId: perm.id },
    },
    create: { roleId: role.id, permissionId: perm.id },
    update: {},
  });
  const admins = await prisma.clientUser.findMany({
    where: { role: ClientUserRole.CLIENT_ADMIN, status: ClientUserStatus.ACTIVE },
    select: { userId: true },
  });
  for (const a of admins) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: a.userId, roleId: role.id },
      },
      create: { userId: a.userId, roleId: role.id },
      update: {},
    });
  }
}

async function ensureComplianceModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "compliance" },
    create: {
      code: "compliance",
      name: "Conformité",
      description: "Référentiels, exigences, preuves et pilotage audit",
      isActive: true,
    },
    update: { isActive: true },
  });
  const defs: Array<{ code: string; label: string }> = [
    { code: "compliance.read", label: "Conformité — lecture" },
    { code: "compliance.update", label: "Conformité — modification" },
  ];
  for (const p of defs) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, label: p.label, moduleId: mod.id },
      update: { label: p.label },
    });
  }
}

async function ensureCollaboratorsModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "collaborators" },
    create: {
      code: "collaborators",
      name: "Collaborateurs",
      description: "Référentiel collaborateurs métier",
      isActive: true,
    },
    update: { isActive: true },
  });
  const defs: Array<{ code: string; label: string }> = [
    { code: "collaborators.read", label: "Collaborateurs — lecture" },
    { code: "collaborators.create", label: "Collaborateurs — création" },
    { code: "collaborators.update", label: "Collaborateurs — mise à jour" },
    { code: "collaborators.delete", label: "Collaborateurs — suppression logique" },
  ];
  for (const p of defs) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, label: p.label, moduleId: mod.id },
      update: { label: p.label },
    });
  }
}

async function ensureSkillsModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "skills" },
    create: {
      code: "skills",
      name: "Compétences",
      description: "Référentiel compétences et catégories",
      isActive: true,
    },
    update: { isActive: true },
  });
  const defs: Array<{ code: string; label: string }> = [
    { code: "skills.read", label: "Compétences — lecture" },
    { code: "skills.create", label: "Compétences — création" },
    { code: "skills.update", label: "Compétences — mise à jour" },
    { code: "skills.delete", label: "Compétences — suppression" },
  ];
  for (const p of defs) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, label: p.label, moduleId: mod.id },
      update: { label: p.label },
    });
  }
}

async function ensureTeamsModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "teams" },
    create: {
      code: "teams",
      name: "Équipes métier",
      description: "Structure organisationnelle, rattachements et périmètres managers",
      isActive: true,
    },
    update: { isActive: true },
  });
  const defs: Array<{ code: string; label: string }> = [
    { code: "teams.read", label: "Équipes — lecture" },
    { code: "teams.update", label: "Équipes — modification" },
    { code: "teams.manage_scopes", label: "Équipes — périmètres managers" },
  ];
  for (const p of defs) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, label: p.label, moduleId: mod.id },
      update: { label: p.label },
    });
  }
}

async function ensureActivityTypesModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "activity_types" },
    create: {
      code: "activity_types",
      name: "Types d'activité (taxonomie)",
      description: "Référentiel taxonomie charge / staffing (RFC-TEAM-006)",
      isActive: true,
    },
    update: { isActive: true },
  });
  const defs: Array<{ code: string; label: string }> = [
    { code: "activity_types.read", label: "Types d'activité — lecture" },
    { code: "activity_types.manage", label: "Types d'activité — gestion" },
  ];
  for (const p of defs) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, label: p.label, moduleId: mod.id },
      update: { label: p.label },
    });
  }
}

async function ensureResourcesModuleAndPermissions(): Promise<void> {
  const mod = await prisma.module.upsert({
    where: { code: "resources" },
    create: {
      code: "resources",
      name: "Ressources",
      description: "Catalogue ressources projet (Humaine, matériel, licences)",
      isActive: true,
    },
    update: { isActive: true },
  });
  const defs: Array<{ code: string; label: string }> = [
    { code: "resources.read", label: "Ressources — lecture" },
    { code: "resources.create", label: "Ressources — création" },
    { code: "resources.update", label: "Ressources — mise à jour" },
  ];
  for (const p of defs) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, label: p.label, moduleId: mod.id },
      update: { label: p.label },
    });
  }
}

/** Tous les clients : lignes par défaut par kind (idempotent). */
async function ensureDefaultActivityTypesForAllClients(): Promise<void> {
  const clients = await prisma.client.findMany({ select: { id: true } });
  for (const c of clients) {
    await ensureDefaultActivityTypes(prisma, c.id);
  }
}

/**
 * Rôle global : permissions équipes métier pour les CLIENT_ADMIN (UserRole).
 * Idempotent. À exécuter après création des ClientUser démo.
 */
async function ensureClientAdminTeamsModuleRole(): Promise<void> {
  const codes = [
    "teams.read",
    "teams.update",
    "teams.manage_scopes",
    "activity_types.read",
    "activity_types.manage",
    /** Catalogue Humaine (RFC-RES-001) pour constituer les équipes ; temps réalisé (resource-time-entries). */
    "resources.read",
    "resources.update",
    /** Création collaborateur MANUAL quand la ressource n’a pas encore de fiche Équipes. */
    "collaborators.create",
  ] as const;
  const permissions = await prisma.permission.findMany({
    where: { code: { in: [...codes] } },
  });
  if (permissions.length !== codes.length) {
    console.warn(
      "⚠️  ensureClientAdminTeamsModuleRole : permissions teams.* / resources.* / collaborators.* / activity_types.* manquantes — skip.",
    );
    return;
  }
  let role = await prisma.role.findFirst({
    where: { scope: RoleScope.GLOBAL, name: "Client admin — équipes métier" },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        scope: RoleScope.GLOBAL,
        name: "Client admin — équipes métier",
        description: "Structure équipes, rattachements et scopes managers",
        isSystem: true,
      },
    });
  }
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: perm.id },
      },
      create: { roleId: role.id, permissionId: perm.id },
      update: {},
    });
  }
  const admins = await prisma.clientUser.findMany({
    where: { role: ClientUserRole.CLIENT_ADMIN, status: ClientUserStatus.ACTIVE },
    select: { userId: true },
  });
  for (const a of admins) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: a.userId, roleId: role.id },
      },
      create: { userId: a.userId, roleId: role.id },
      update: {},
    });
  }
}

type DefaultProfileSeed = {
  name: string;
  description?: string;
  /** Rôle fourni par la plateforme (non supprimable côté produit). Défaut : true si absent. */
  isSystem?: boolean;
  permissionCodes: string[];
};

/**
 * Rôles RBAC **globaux** (`scope: GLOBAL`) définis dans `default-profiles.json`.
 * Idempotent : met à jour description, `isSystem` et synchronise les `RolePermission` avec le fichier.
 * À exécuter après que les permissions `projects.*`, `budgets.*`, `resources.*`, etc. existent en base.
 */
async function ensureDefaultGlobalProfiles(): Promise<void> {
  const profilesPath = path.join(__dirname, "default-profiles.json");
  if (!fs.existsSync(profilesPath)) {
    console.log("⚠️  default-profiles.json introuvable — skip rôles globaux.");
    return;
  }
  const profiles = JSON.parse(fs.readFileSync(profilesPath, "utf8")) as DefaultProfileSeed[];
  for (const profile of profiles) {
    const isSystem = profile.isSystem !== false;
    let role = await prisma.role.findFirst({
      where: { scope: RoleScope.GLOBAL, name: profile.name },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          clientId: null,
          scope: RoleScope.GLOBAL,
          name: profile.name,
          description: profile.description ?? null,
          isSystem,
        },
      });
    } else {
      await prisma.role.update({
        where: { id: role.id },
        data: { description: profile.description ?? null, isSystem },
      });
    }
    const permissions = await prisma.permission.findMany({
      where: { code: { in: profile.permissionCodes } },
      select: { id: true, code: true },
    });
    const foundCodes = new Set(permissions.map((p) => p.code));
    const missingCodes = profile.permissionCodes.filter((c) => !foundCodes.has(c));
    if (missingCodes.length > 0) {
      console.warn(
        `⚠️  Profil « ${profile.name} » : permissions absentes en base (ignorées) : ${missingCodes.join(", ")}`,
      );
    }
    const permissionIds = permissions.map((p) => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      });
    }
  }
  console.log(`✅ Rôles globaux (default-profiles.json) : ${profiles.length} profil(s) synchronisé(s)`);
}

async function ensureEnabledClientModules(clientId: string): Promise<void> {
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  if (modules.length === 0) return;
  await prisma.clientModule.createMany({
    data: modules.map((m) => ({
      clientId,
      moduleId: m.id,
      status: ClientModuleStatus.ENABLED,
    })),
    skipDuplicates: true,
  });
}

/** Rôles d’équipe projet (Sponsor / Responsable) — aligné ProjectTeamService.ensureDefaultTeamRolesForClient. */
async function ensureProjectTeamCatalogForClient(clientId: string): Promise<void> {
  const defs: Array<{
    systemKind: ProjectTeamRoleSystemKind;
    name: string;
    sortOrder: number;
  }> = [
    { systemKind: ProjectTeamRoleSystemKind.SPONSOR, name: "Sponsor", sortOrder: 0 },
    {
      systemKind: ProjectTeamRoleSystemKind.OWNER,
      name: "Responsable de projet",
      sortOrder: 1,
    },
  ];
  for (const d of defs) {
    const found = await prisma.projectTeamRole.findFirst({
      where: { clientId, systemKind: d.systemKind },
    });
    if (found) continue;
    try {
      await prisma.projectTeamRole.create({
        data: {
          clientId,
          name: d.name,
          sortOrder: d.sortOrder,
          systemKind: d.systemKind,
        },
      });
    } catch {
      // P2002 concurrentiel : ignorer
    }
  }
}

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

function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function pickClientUsers(userMap: Map<string, string>): {
  primary: string;
  secondary: string;
} | null {
  const ids = [...userMap.values()];
  if (ids.length === 0) return null;
  return {
    primary: ids[0],
    secondary: ids.length > 1 ? ids[1] : ids[0],
  };
}

/** Catégories portefeuille niveau 2 uniquement (règle métier : projet → sous-catégorie avec parent). */
type DemoPortfolioLeaves = {
  identite: string;
  data: string;
  experience: string;
  infrastructure: string;
  cyber: string;
  observabilite: string;
};

async function ensurePortfolioCategoryNode(
  clientId: string,
  name: string,
  parentId: string | null,
  sortOrder: number,
): Promise<{ id: string }> {
  const normalizedName = n(name);
  const existing = await prisma.projectPortfolioCategory.findFirst({
    where: {
      clientId,
      normalizedName,
      parentId: parentId === null ? null : parentId,
    },
  });
  if (existing) return existing;
  return prisma.projectPortfolioCategory.create({
    data: {
      clientId,
      parentId,
      name,
      normalizedName,
      sortOrder,
      isActive: true,
    },
  });
}

/**
 * Arborescence portefeuille : 2 racines × 3 feuilles (niveau 2 assignable aux projets).
 */
async function ensureDemoPortfolioCategories(clientId: string): Promise<DemoPortfolioLeaves> {
  const rootMetier = await ensurePortfolioCategoryNode(
    clientId,
    "Transformation & métier",
    null,
    0,
  );
  const rootOps = await ensurePortfolioCategoryNode(
    clientId,
    "Opérations & plateforme",
    null,
    1,
  );

  const identite = await ensurePortfolioCategoryNode(
    clientId,
    "Identité & accès",
    rootMetier.id,
    0,
  );
  const data = await ensurePortfolioCategoryNode(
    clientId,
    "Data & intégration",
    rootMetier.id,
    1,
  );
  const experience = await ensurePortfolioCategoryNode(
    clientId,
    "Expérience client & canaux",
    rootMetier.id,
    2,
  );

  const infrastructure = await ensurePortfolioCategoryNode(
    clientId,
    "Infrastructure & réseau",
    rootOps.id,
    0,
  );
  const cyber = await ensurePortfolioCategoryNode(
    clientId,
    "Cyber & résilience",
    rootOps.id,
    1,
  );
  const observabilite = await ensurePortfolioCategoryNode(
    clientId,
    "Observabilité & supervision",
    rootOps.id,
    2,
  );

  return {
    identite: identite.id,
    data: data.id,
    experience: experience.id,
    infrastructure: infrastructure.id,
    cyber: cyber.id,
    observabilite: observabilite.id,
  };
}

/**
 * Ressources humaines démo : internes (client) et externes (prestataires), avec rôles métier.
 */
async function ensureDemoResources(clientId: string, prefix: string): Promise<void> {
  const p = prefix.toLowerCase();

  const roleArch = await prisma.resourceRole.upsert({
    where: { clientId_name: { clientId, name: "Architecte SI" } },
    create: { clientId, name: "Architecte SI", code: "ARCH" },
    update: {},
  });
  const roleConsult = await prisma.resourceRole.upsert({
    where: { clientId_name: { clientId, name: "Consultant fonctionnel" } },
    create: { clientId, name: "Consultant fonctionnel", code: "CF" },
    update: {},
  });
  const rolePm = await prisma.resourceRole.upsert({
    where: { clientId_name: { clientId, name: "Chef de projet" } },
    create: { clientId, name: "Chef de projet", code: "PM" },
    update: {},
  });

  const internal = [
    {
      code: `${prefix}-RES-INT-01`,
      lastName: "Dupont",
      firstName: "Claire",
      email: `${p}-int01@seed.starium.local`,
      roleId: roleArch.id,
    },
    {
      code: `${prefix}-RES-INT-02`,
      lastName: "Bernard",
      firstName: "Mehdi",
      email: `${p}-int02@seed.starium.local`,
      roleId: roleConsult.id,
    },
    {
      code: `${prefix}-RES-INT-03`,
      lastName: "Petit",
      firstName: "Sarah",
      email: `${p}-int03@seed.starium.local`,
      roleId: rolePm.id,
    },
  ] as const;

  for (const r of internal) {
    await prisma.resource.upsert({
      where: { clientId_code: { clientId, code: r.code } },
      create: {
        clientId,
        code: r.code,
        name: r.lastName,
        firstName: r.firstName,
        type: ResourceType.HUMAN,
        affiliation: ResourceAffiliation.INTERNAL,
        email: r.email,
        roleId: r.roleId,
      },
      update: {
        name: r.lastName,
        firstName: r.firstName,
        affiliation: ResourceAffiliation.INTERNAL,
        companyName: null,
        email: r.email,
        roleId: r.roleId,
      },
    });
  }

  const external = [
    {
      code: `${prefix}-RES-EXT-01`,
      label: "Cabinet Conseil Orion",
      contact: "Lefevre",
      firstName: "Thomas",
      email: `${p}-ext01@seed.starium.local`,
      roleId: roleConsult.id,
    },
    {
      code: `${prefix}-RES-EXT-02`,
      label: "Integrateur Beta Systems",
      contact: "Schmidt",
      firstName: "Anna",
      email: `${p}-ext02@seed.starium.local`,
      roleId: roleArch.id,
    },
  ] as const;

  for (const r of external) {
    await prisma.resource.upsert({
      where: { clientId_code: { clientId, code: r.code } },
      create: {
        clientId,
        code: r.code,
        name: r.contact,
        firstName: r.firstName,
        type: ResourceType.HUMAN,
        affiliation: ResourceAffiliation.EXTERNAL,
        email: r.email,
        companyName: r.label,
        roleId: r.roleId,
      },
      update: {
        name: r.contact,
        firstName: r.firstName,
        affiliation: ResourceAffiliation.EXTERNAL,
        companyName: r.label,
        email: r.email,
        roleId: r.roleId,
      },
    });
  }
}

/** Au moins 3 jalons par projet démo pour alimenter le rétroplanning macro (fiche projet). */
async function ensureDemoRetroplanMilestones(
  clientId: string,
  prefix: string,
  now: Date,
  fallbackOwnerId: string,
): Promise<void> {
  const wave = [
    { name: "Cadrage & arbitrage", days: -100 },
    { name: "Réalisation / intégration", days: -35 },
    { name: "Recette & mise en service", days: 40 },
  ];
  for (let i = 1; i <= 10; i++) {
    const code = `${prefix}-SEED-${String(i).padStart(2, "0")}`;
    const project = await prisma.project.findFirst({ where: { clientId, code } });
    if (!project) continue;
    const n = await prisma.projectMilestone.count({ where: { projectId: project.id } });
    if (n >= 3) continue;
    let sortOrder = n;
    for (let k = n; k < 3; k++) {
      const tpl = wave[k]!;
      await prisma.projectMilestone.create({
        data: {
          clientId,
          projectId: project.id,
          name: `${tpl.name} (seed)`,
          status: ProjectMilestoneStatus.PLANNED,
          targetDate: addDaysUtc(now, tpl.days + i * 3),
          sortOrder: sortOrder++,
          ownerUserId: project.ownerUserId ?? fallbackOwnerId,
        },
      });
    }
  }
}

/**
 * Rattache chaque jalon démo à une phase projet (libellés Gantt / planning)
 * pour éviter « Sans libellé de phase » en UI.
 */
function resolveDemoMilestonePhaseIndex(name: string, sortOrder: number): number {
  const n = name.trim();
  if (n.includes("Cadrage & arbitrage")) return 0;
  if (n.includes("Réalisation / intégration")) return 1;
  if (n.includes("Recette & mise en service")) return 2;
  if (n === "Cadrage valide") return 0;
  if (n.includes("Go-live")) return 3;
  if (n.includes("Couverture APM")) return 1;
  if (n.includes("Mise en prod") || n.includes("zone sensible")) return 3;
  return Math.min(sortOrder, 3);
}

async function syncDemoProjectMilestonePhases(clientId: string, prefix: string): Promise<void> {
  for (let i = 1; i <= 10; i++) {
    const code = `${prefix}-SEED-${String(i).padStart(2, "0")}`;
    const project = await prisma.project.findFirst({
      where: { clientId, code },
      select: { id: true },
    });
    if (!project) continue;

    const phases = await prisma.projectTaskPhase.findMany({
      where: { clientId, projectId: project.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (phases.length === 0) continue;

    const phaseIdAt = (idx: number) =>
      phases[Math.min(Math.max(idx, 0), phases.length - 1)]!.id;

    const milestones = await prisma.projectMilestone.findMany({
      where: { clientId, projectId: project.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    });

    for (const m of milestones) {
      const idx = resolveDemoMilestonePhaseIndex(m.name, m.sortOrder);
      await prisma.projectMilestone.update({
        where: { id: m.id },
        data: { phaseId: phaseIdAt(idx) },
      });
    }
  }
}

/** Liaison FULL vers des lignes budgétaires réelles du client (RFC-PROJ-010). */
async function ensureDemoProjectBudgetLinks(clientId: string, prefix: string): Promise<void> {
  const lines = await prisma.budgetLine.findMany({
    where: {
      clientId,
      status: BudgetLineStatus.ACTIVE,
      budget: {
        status: { notIn: [BudgetStatus.LOCKED, BudgetStatus.ARCHIVED] },
        exercise: {
          status: { notIn: [BudgetExerciseStatus.CLOSED, BudgetExerciseStatus.ARCHIVED] },
        },
      },
    },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
    take: 48,
  });
  if (lines.length === 0) {
    console.warn(`Seed liens budget [${prefix}]: aucune ligne ACTIVE sur budget/exercice ouverts, skip.`);
    return;
  }

  for (let i = 1; i <= 10; i++) {
    const code = `${prefix}-SEED-${String(i).padStart(2, "0")}`;
    const project = await prisma.project.findFirst({ where: { clientId, code } });
    if (!project) continue;
    await prisma.projectBudgetLink.deleteMany({ where: { projectId: project.id } });
    const line = lines[(i - 1) % lines.length]!;
    await prisma.projectBudgetLink.create({
      data: {
        clientId,
        projectId: project.id,
        budgetLineId: line.id,
        allocationType: ProjectBudgetAllocationType.FULL,
      },
    });
  }
}

/**
 * Portefeuille démo par client : statuts, criticité, retards, risques, jalons, COPIL.
 * Les dates cibles sensibles au « retard / fenêtre 14j » sont relatives à la date d’exécution du seed.
 */
async function seedClientDemoProjects(
  slug: string,
  clientId: string,
  userMap: Map<string, string>,
): Promise<void> {
  const users = pickClientUsers(userMap);
  if (!users) {
    console.warn(`Seed demo projets [${slug}]: aucun utilisateur, skip.`);
    return;
  }
  const a = users.primary;
  const b = users.secondary;

  await ensureRiskTaxonomyForClient(prisma, clientId);
  await ensureProjectTeamCatalogForClient(clientId);

  const prefix = projectCodePrefix(slug);
  const leaves = await ensureDemoPortfolioCategories(clientId);
  await ensureDemoResources(clientId, prefix);
  const now = startOfDayUtc(new Date());

  type UpsertProj = {
    code: string;
    name: string;
    description: string;
    type: ProjectType;
    status: ProjectStatus;
    priority: ProjectPriority;
    criticality: ProjectCriticality;
    sponsorUserId: string | null;
    ownerUserId: string | null;
    startDate: Date | null;
    targetEndDate: Date | null;
    actualEndDate?: Date | null;
    progressPercent: number | null;
    portfolioCategoryId: string | null;
  } & DemoProjectSheet;

  const sheetPayload = (s: DemoProjectSheet) => ({
    pilotNotes: s.pilotNotes,
    targetBudgetAmount: s.targetBudgetAmount,
    businessValueScore: s.businessValueScore,
    strategicAlignment: s.strategicAlignment,
    urgencyScore: s.urgencyScore,
    estimatedCost: s.estimatedCost,
    estimatedGain: s.estimatedGain,
    roi: s.roi,
    riskLevel: s.riskLevel,
    riskResponse: s.riskResponse,
    priorityScore: s.priorityScore,
    businessProblem: s.businessProblem,
    businessBenefits: s.businessBenefits,
    businessSuccessKpis: s.businessSuccessKpis,
    cadreLocation: s.cadreLocation,
    cadreQui: s.cadreQui,
    involvedTeams: s.involvedTeams,
    swotStrengths: s.swotStrengths,
    swotWeaknesses: s.swotWeaknesses,
    swotOpportunities: s.swotOpportunities,
    swotThreats: s.swotThreats,
    towsActions: s.towsActions,
    copilRecommendation: s.copilRecommendation,
    copilRecommendationNote: s.copilRecommendationNote,
  });

  const upsert = async (p: UpsertProj) =>
    prisma.project.upsert({
      where: { clientId_code: { clientId, code: p.code } },
      create: {
        clientId,
        code: p.code,
        name: p.name,
        description: p.description,
        kind: ProjectKind.PROJECT,
        type: p.type,
        status: p.status,
        priority: p.priority,
        criticality: p.criticality,
        sponsorUserId: p.sponsorUserId,
        ownerUserId: p.ownerUserId,
        startDate: p.startDate,
        targetEndDate: p.targetEndDate,
        actualEndDate: p.actualEndDate ?? null,
        progressPercent: p.progressPercent,
        portfolioCategoryId: p.portfolioCategoryId,
        ...sheetPayload(p),
      },
      update: {
        name: p.name,
        description: p.description,
        type: p.type,
        status: p.status,
        priority: p.priority,
        criticality: p.criticality,
        sponsorUserId: p.sponsorUserId,
        ownerUserId: p.ownerUserId,
        startDate: p.startDate,
        targetEndDate: p.targetEndDate,
        actualEndDate: p.actualEndDate ?? null,
        progressPercent: p.progressPercent,
        portfolioCategoryId: p.portfolioCategoryId,
        ...sheetPayload(p),
      },
    });

  // --- 01 : bonne santé (vert) — jalons + tâches + risque faible
  const p01 = await upsert({
    code: `${prefix}-SEED-01`,
    name: "Socle identité — SSO et MFA",
    description: "Seed demo : pilotage sain, jalons et risque résiduel bas.",
    type: ProjectType.APPLICATION,
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
    criticality: ProjectCriticality.MEDIUM,
    sponsorUserId: b,
    ownerUserId: a,
    startDate: addDaysUtc(now, -120),
    targetEndDate: addDaysUtc(now, 200),
    progressPercent: 55,
    portfolioCategoryId: leaves.identite,
    ...DEMO_PROJECT_SHEETS[0],
  });
  if ((await prisma.projectMilestone.count({ where: { projectId: p01.id } })) === 0) {
    await prisma.projectMilestone.createMany({
      data: [
        {
          clientId,
          projectId: p01.id,
          name: "Cadrage valide",
          status: ProjectMilestoneStatus.ACHIEVED,
          targetDate: addDaysUtc(now, -30),
          achievedDate: addDaysUtc(now, -32),
          sortOrder: 0,
        },
        {
          clientId,
          projectId: p01.id,
          name: "Go-live national",
          status: ProjectMilestoneStatus.PLANNED,
          targetDate: addDaysUtc(now, 160),
          sortOrder: 1,
        },
      ],
    });
  }

  // --- 02 : bonne santé — data
  const p02 = await upsert({
    code: `${prefix}-SEED-02`,
    name: "Data — lakehouse production",
    description: "Seed demo : avancement regulier, peu de friction.",
    type: ProjectType.INFRASTRUCTURE,
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.MEDIUM,
    criticality: ProjectCriticality.LOW,
    sponsorUserId: a,
    ownerUserId: b,
    startDate: addDaysUtc(now, -90),
    targetEndDate: addDaysUtc(now, 240),
    progressPercent: 38,
    portfolioCategoryId: leaves.data,
    ...DEMO_PROJECT_SHEETS[1],
  });
  if ((await prisma.projectMilestone.count({ where: { projectId: p02.id } })) === 0) {
    await prisma.projectMilestone.create({
      data: {
        clientId,
        projectId: p02.id,
        name: "Mise en prod zone sensible",
        status: ProjectMilestoneStatus.PLANNED,
        targetDate: addDaysUtc(now, 90),
        sortOrder: 0,
      },
    });
  }

  // --- 03 : termine
  const p03 = await upsert({
    code: `${prefix}-SEED-03`,
    name: "Programme legacy — sortie de four",
    description: "Seed demo : projet clos.",
    type: ProjectType.TRANSFORMATION,
    status: ProjectStatus.COMPLETED,
    priority: ProjectPriority.MEDIUM,
    criticality: ProjectCriticality.MEDIUM,
    sponsorUserId: b,
    ownerUserId: a,
    startDate: addDaysUtc(now, -400),
    targetEndDate: addDaysUtc(now, -60),
    actualEndDate: addDaysUtc(now, -55),
    progressPercent: 100,
    portfolioCategoryId: leaves.experience,
    ...DEMO_PROJECT_SHEETS[2],
  });
  // --- 04 : en pause (bloque)
  const p04 = await upsert({
    code: `${prefix}-SEED-04`,
    name: "ERP — phase 2 budget / actif",
    description: "Seed demo : projet en attente arbitrage budget.",
    type: ProjectType.GOVERNANCE,
    status: ProjectStatus.ON_HOLD,
    priority: ProjectPriority.HIGH,
    criticality: ProjectCriticality.HIGH,
    sponsorUserId: a,
    ownerUserId: b,
    startDate: addDaysUtc(now, -200),
    targetEndDate: addDaysUtc(now, 45),
    progressPercent: 22,
    portfolioCategoryId: leaves.data,
    ...DEMO_PROJECT_SHEETS[3],
  });
  // --- 05 : risque majeur ouvert (critique / bloque)
  const p05 = await upsert({
    code: `${prefix}-SEED-05`,
    name: "Cyber — PAM et segmentation reseau",
    description: "Seed demo : risque critique ouvert.",
    type: ProjectType.CYBERSECURITY,
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
    criticality: ProjectCriticality.HIGH,
    sponsorUserId: b,
    ownerUserId: a,
    startDate: addDaysUtc(now, -60),
    targetEndDate: addDaysUtc(now, 120),
    progressPercent: 18,
    portfolioCategoryId: leaves.cyber,
    ...DEMO_PROJECT_SHEETS[4],
  });
  // --- 06 : en retard (date cible passee)
  const p06 = await upsert({
    code: `${prefix}-SEED-06`,
    name: "E-commerce — tunnel d'achat",
    description: "Seed demo : echeance depassee.",
    type: ProjectType.APPLICATION,
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
    criticality: ProjectCriticality.MEDIUM,
    sponsorUserId: a,
    ownerUserId: b,
    startDate: addDaysUtc(now, -300),
    targetEndDate: addDaysUtc(now, -40),
    progressPercent: 62,
    portfolioCategoryId: leaves.experience,
    ...DEMO_PROJECT_SHEETS[5],
  });
  if ((await prisma.projectMilestone.count({ where: { projectId: p06.id } })) === 0) {
    await prisma.projectMilestone.create({
      data: {
        clientId,
        projectId: p06.id,
        name: "Mise en prod initiale",
        status: ProjectMilestoneStatus.DELAYED,
        targetDate: addDaysUtc(now, -50),
        sortOrder: 0,
      },
    });
  }

  // --- 07 : echeance sous 14 jours (orange pilotage)
  const p07 = await upsert({
    code: `${prefix}-SEED-07`,
    name: "Telephonie — migration operateur",
    description: "Seed demo : fin de projet tres proche.",
    type: ProjectType.INFRASTRUCTURE,
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.MEDIUM,
    criticality: ProjectCriticality.MEDIUM,
    sponsorUserId: b,
    ownerUserId: a,
    startDate: addDaysUtc(now, -100),
    targetEndDate: addDaysUtc(now, 10),
    progressPercent: 78,
    portfolioCategoryId: leaves.infrastructure,
    ...DEMO_PROJECT_SHEETS[6],
  });
  // --- 08 : jalon en retard (DELAYED)
  const p08 = await upsert({
    code: `${prefix}-SEED-08`,
    name: "Observabilite — consolidation",
    description: "Seed demo : jalon critique en retard.",
    type: ProjectType.INFRASTRUCTURE,
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.MEDIUM,
    criticality: ProjectCriticality.MEDIUM,
    sponsorUserId: a,
    ownerUserId: b,
    startDate: addDaysUtc(now, -80),
    targetEndDate: addDaysUtc(now, 100),
    progressPercent: 50,
    portfolioCategoryId: leaves.observabilite,
    ...DEMO_PROJECT_SHEETS[7],
  });
  if ((await prisma.projectMilestone.count({ where: { projectId: p08.id } })) === 0) {
    await prisma.projectMilestone.create({
      data: {
        clientId,
        projectId: p08.id,
        name: "Couverture APM critique",
        status: ProjectMilestoneStatus.DELAYED,
        targetDate: addDaysUtc(now, -5),
        sortOrder: 0,
      },
    });
  }
  // --- 09 : sans responsable plateforme (warning NO_OWNER)
  const p09 = await upsert({
    code: `${prefix}-SEED-09`,
    name: "Partenariat editeur — integration API",
    description: "Seed demo : sponsor connu, responsable projet non rattache au compte.",
    type: ProjectType.PROCUREMENT,
    status: ProjectStatus.ARCHIVED,
    priority: ProjectPriority.MEDIUM,
    criticality: ProjectCriticality.LOW,
    sponsorUserId: a,
    ownerUserId: null,
    startDate: addDaysUtc(now, -40),
    targetEndDate: addDaysUtc(now, 150),
    progressPercent: 15,
    portfolioCategoryId: leaves.experience,
    ...DEMO_PROJECT_SHEETS[8],
  });
  // --- 10 : planifie, demarrage
  const p10 = await upsert({
    code: `${prefix}-SEED-10`,
    name: "IA — assistante interne documentaire",
    description: "Seed demo : projet en preparation.",
    type: ProjectType.APPLICATION,
    status: ProjectStatus.PLANNED,
    priority: ProjectPriority.LOW,
    criticality: ProjectCriticality.LOW,
    sponsorUserId: b,
    ownerUserId: a,
    startDate: addDaysUtc(now, 20),
    targetEndDate: addDaysUtc(now, 320),
    progressPercent: 0,
    portfolioCategoryId: leaves.data,
    ...DEMO_PROJECT_SHEETS[9],
  });
  await ensureDemoProjectRisks(prisma, clientId, prefix, now, a, b);
  await ensureDemoCompliance(prisma, clientId);
  await ensureDemoProjectTasks(prisma, clientId, prefix, now, a, b);
  await ensureDemoRetroplanMilestones(clientId, prefix, now, a);
  await syncDemoProjectMilestonePhases(clientId, prefix);
  await ensureDemoProjectTagsAndLabels(prisma, clientId, prefix);
  await ensureDemoProjectBudgetLinks(clientId, prefix);
  await ensureDemoProjectTaskBuckets(prisma, clientId, prefix);
  await ensureDemoProjectActivities(prisma, clientId, prefix, now, a, b);
  await ensureDemoProjectReviews(prisma, clientId, prefix, now, a, b);
  await ensureDemoActionPlans(prisma, clientId, prefix, now, a);

  console.log(
    `✅ Seed demo projets [${slug}]: 10 projets, risques métier (jeu complet), taches (jeu complet recree), fiches (TOWS 4 quadrants), jalons rétroplan, étiquettes projet/tâches/jalons, liens budget FULL, buckets Kanban, activites recurrentes, points projet, catégories, ressources, 3 plans d’action + tâches COPIL/cyber/RGPD`,
  );
}

/**
 * Aligné sur `UsersService.syncHumanResourceForClientMember` : fiche catalogue Humaine INTERNAL
 * par email membre, ou suppression si `excludeFromCatalog`.
 */
async function syncHumanResourceForClientMemberSeed(
  clientId: string,
  user: { email: string; firstName: string | null; lastName: string | null },
  excludeFromCatalog: boolean,
): Promise<void> {
  const emailRaw = user.email.trim();
  if (!emailRaw) return;

  const existing = await prisma.resource.findFirst({
    where: {
      clientId,
      type: ResourceType.HUMAN,
      email: { equals: emailRaw, mode: "insensitive" },
    },
  });

  if (excludeFromCatalog) {
    if (existing) {
      await prisma.resource.delete({ where: { id: existing.id } });
    }
    return;
  }

  const emailNorm = emailRaw.toLowerCase();
  const last = user.lastName?.trim() ?? "";
  const first = user.firstName?.trim() ?? "";
  const displayName = last || first || emailNorm.split("@")[0] || "Membre";

  if (existing) {
    await prisma.resource.update({
      where: { id: existing.id },
      data: {
        name: displayName,
        firstName: first || null,
        email: emailNorm,
        affiliation: ResourceAffiliation.INTERNAL,
        type: ResourceType.HUMAN,
      },
    });
  } else {
    await prisma.resource.create({
      data: {
        clientId,
        name: displayName,
        firstName: first || null,
        email: emailNorm,
        type: ResourceType.HUMAN,
        affiliation: ResourceAffiliation.INTERNAL,
      },
    });
  }
}

/** Aligné sur `CollaboratorsService.syncFromHumanIdentity` (lien `userId` + MANUAL ; DIRECTORY_SYNC inchangé). */
async function syncCollaboratorFromHumanIdentitySeed(
  clientId: string,
  user: { email: string; firstName: string | null; lastName: string | null },
  platformUserId: string,
): Promise<void> {
  const emailNorm = user.email.trim().toLowerCase();
  if (!emailNorm) return;
  const last = user.lastName?.trim() ?? "";
  const first = user.firstName?.trim() ?? "";
  const displayName =
    [first, last].filter(Boolean).join(" ") || last || first || emailNorm;

  let existing = await prisma.collaborator.findFirst({
    where: { clientId, userId: platformUserId },
  });
  if (!existing) {
    existing = await prisma.collaborator.findFirst({
      where: {
        clientId,
        email: { equals: emailNorm, mode: "insensitive" },
      },
    });
  }

  if (!existing) {
    await prisma.collaborator.create({
      data: {
        clientId,
        source: CollaboratorSource.MANUAL,
        status: CollaboratorStatus.ACTIVE,
        email: emailNorm,
        firstName: first || null,
        lastName: last || null,
        displayName,
        userId: platformUserId,
      },
    });
    return;
  }

  if (existing.source === CollaboratorSource.DIRECTORY_SYNC) {
    return;
  }

  await prisma.collaborator.update({
    where: { id: existing.id },
    data: {
      email: emailNorm,
      firstName: first || null,
      lastName: last || null,
      displayName,
      userId: platformUserId,
    },
  });
}

/** Pour chaque rattachement client : ressource Humaine catalogue + collaborateur alignés sur l’identité User. */
async function ensureMemberHumanResourcesForAllClientUsers(): Promise<void> {
  const rows = await prisma.clientUser.findMany({
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  for (const cu of rows) {
    await syncHumanResourceForClientMemberSeed(
      cu.clientId,
      cu.user,
      cu.excludeFromResourceCatalog,
    );
    await syncCollaboratorFromHumanIdentitySeed(cu.clientId, cu.user, cu.userId);
  }
  console.log(
    `✅ Membres clients → ressources Humaines + collaborateurs : ${rows.length} rattachement(s) synchronisé(s)`,
  );
}

async function upsertClientUser(userId: string, clientId: string, role: ClientUserRole, isDefault = false) {
  return prisma.clientUser.upsert({
    where: {
      userId_clientId: {
        userId,
        clientId,
      },
    },
    update: {
      role,
      status: ClientUserStatus.ACTIVE,
      isDefault,
    },
    create: {
      userId,
      clientId,
      role,
      status: ClientUserStatus.ACTIVE,
      isDefault,
      excludeFromResourceCatalog: false,
    },
  });
}

async function upsertSupplierCategory(clientId: string, categoryName: string) {
  return prisma.supplierCategory.upsert({
    where: {
      clientId_normalizedName: {
        clientId,
        normalizedName: n(categoryName),
      },
    },
    update: {
      name: categoryName,
      isActive: true,
    },
    create: {
      clientId,
      name: categoryName,
      normalizedName: n(categoryName),
      isActive: true,
    },
  });
}

async function upsertSupplier(clientId: string, seed: SupplierSeed, categoryId?: string) {
  return prisma.supplier.upsert({
    where: {
      clientId_normalizedName: {
        clientId,
        normalizedName: n(seed.name),
      },
    },
    update: {
      supplierCategoryId: categoryId ?? null,
      name: seed.name,
      normalizedName: n(seed.name),
      code: seed.code ?? null,
      externalId: seed.externalId ?? null,
      website: seed.website ?? null,
      email: seed.email ?? null,
      phone: seed.phone ?? null,
      vatNumber: seed.vatNumber ?? null,
      notes: seed.notes ?? null,
      status: SupplierStatus.ACTIVE,
    },
    create: {
      clientId,
      supplierCategoryId: categoryId ?? null,
      name: seed.name,
      normalizedName: n(seed.name),
      code: seed.code ?? null,
      externalId: seed.externalId ?? null,
      website: seed.website ?? null,
      email: seed.email ?? null,
      phone: seed.phone ?? null,
      vatNumber: seed.vatNumber ?? null,
      notes: seed.notes ?? null,
      status: SupplierStatus.ACTIVE,
    },
  });
}

async function upsertExercise(clientId: string, year: number) {
  return prisma.budgetExercise.upsert({
    where: {
      clientId_code: {
        clientId,
        code: `EX-${year}`,
      },
    },
    update: {
      name: `Exercice ${year}`,
      startDate: y(year, 1, 1),
      endDate: y(year, 12, 31),
      status: BudgetExerciseStatus.ACTIVE,
    },
    create: {
      clientId,
      name: `Exercice ${year}`,
      code: `EX-${year}`,
      startDate: y(year, 1, 1),
      endDate: y(year, 12, 31),
      status: BudgetExerciseStatus.ACTIVE,
    },
  });
}

async function upsertBudget(clientId: string, exerciseId: string, seed: BudgetSeed) {
  return prisma.budget.upsert({
    where: {
      clientId_code: {
        clientId,
        code: seed.code,
      },
    },
    update: {
      exerciseId,
      name: seed.name,
      currency: seed.currency,
      status: BudgetStatus.VALIDATED,
    },
    create: {
      clientId,
      exerciseId,
      name: seed.name,
      code: seed.code,
      currency: seed.currency,
      status: BudgetStatus.VALIDATED,
    },
  });
}

async function upsertEnvelope(clientId: string, budgetId: string, seed: EnvelopeSeed) {
  return prisma.budgetEnvelope.upsert({
    where: {
      clientId_budgetId_code: {
        clientId,
        budgetId,
        code: seed.code,
      },
    },
    update: {
      name: seed.name,
      type: seed.type,
      status: BudgetEnvelopeStatus.ACTIVE,
    },
    create: {
      clientId,
      budgetId,
      name: seed.name,
      code: seed.code,
      type: seed.type,
      status: BudgetEnvelopeStatus.ACTIVE,
    },
  });
}

/**
 * Découpe `total` en `parts` parts dont la somme = total (arrondi 2 déc.).
 */
function splitAmountAcrossParts(total: number, parts: number): number[] {
  const n = Math.max(1, Math.floor(parts));
  if (n === 1) {
    return [round2(total)];
  }
  const base = round2(total / n);
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    out.push(base);
    sum += base;
  }
  out.push(round2(total - sum));
  return out;
}

/**
 * 12 mois (indices 1..12, alignés RFC planning), somme des montants = totalAmount.
 * Répartition uniforme (équivalent répartition annuelle) pour que le prévisionnel grille ne soit pas vide.
 */
function buildPlanningMonthRows(totalAmount: number): { monthIndex: number; amount: number }[] {
  const total = round2(totalAmount);
  if (total <= 0) {
    return Array.from({ length: 12 }, (_, i) => ({ monthIndex: i + 1, amount: 0 }));
  }
  const amounts = splitAmountAcrossParts(total, 12);
  return amounts.map((amount, i) => ({ monthIndex: i + 1, amount }));
}

/** Répartition prévisionnelle (RFC planning) : idempotent sur re-seed. */
async function seedBudgetLinePlanningMonths(
  clientId: string,
  budgetLineId: string,
  lineCode: string,
  totalAmount: number,
): Promise<void> {
  await prisma.budgetLinePlanningMonth.deleteMany({ where: { clientId, budgetLineId } });
  const rows = buildPlanningMonthRows(totalAmount);
  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: {
      planningMode: BudgetLinePlanningMode.MANUAL,
      planningTotalAmount: new Prisma.Decimal(round2(totalAmount)),
    },
  });
  await prisma.budgetLinePlanningMonth.createMany({
    data: rows.map((r) => ({
      clientId,
      budgetLineId,
      monthIndex: r.monthIndex,
      amount: new Prisma.Decimal(r.amount),
    })),
  });
}

/**
 * Lignes sans aucun mois (clones incomplets, bases anciennes, etc.) : répartition sur le révisé.
 * Idempotent pour les lignes déjà peuplées (non sélectionnées).
 */
async function backfillBudgetLinesMissingPlanningMonths(): Promise<void> {
  const lines = await prisma.budgetLine.findMany({
    where: { planningMonths: { none: {} } },
    select: { id: true, clientId: true, code: true, revisedAmount: true },
  });
  let n = 0;
  for (const line of lines) {
    await seedBudgetLinePlanningMonths(
      line.clientId,
      line.id,
      line.code,
      line.revisedAmount.toNumber(),
    );
    n += 1;
  }
  if (n > 0) {
    console.log(
      `✅ Backfill prévisionnel (12 mois) : ${n} ligne(s) sans BudgetLinePlanningMonth — répartition sur montant révisé.`,
    );
  }
}

async function upsertLine(clientId: string, budgetId: string, envelopeId: string, seed: LineSeed) {
  return prisma.budgetLine.upsert({
    where: {
      clientId_budgetId_code: {
        clientId,
        budgetId,
        code: seed.code,
      },
    },
    update: {
      envelopeId,
      name: seed.name,
      description: seed.description ?? null,
      expenseType: seed.expenseType,
      status: BudgetLineStatus.ACTIVE,
      currency: "EUR",
      taxRate: VAT_RATE,
      initialAmount: seed.amount,
      revisedAmount: seed.amount,
      forecastAmount: seed.amount,
      committedAmount: 0,
      consumedAmount: 0,
      remainingAmount: seed.amount,
    },
    create: {
      clientId,
      budgetId,
      envelopeId,
      code: seed.code,
      name: seed.name,
      description: seed.description ?? null,
      expenseType: seed.expenseType,
      status: BudgetLineStatus.ACTIVE,
      currency: "EUR",
      taxRate: VAT_RATE,
      initialAmount: seed.amount,
      revisedAmount: seed.amount,
      forecastAmount: seed.amount,
      committedAmount: 0,
      consumedAmount: 0,
      remainingAmount: seed.amount,
    },
  });
}

function flowAmounts(amount: number, flow: FlowType) {
  switch (flow) {
    case "NONE":
      return { poAmounts: [], invoiceAmounts: [] };
    case "PO_ONLY":
      return { poAmounts: [round2(amount * 0.8)], invoiceAmounts: [] };
    case "PARTIAL":
      return { poAmounts: [round2(amount * 0.8)], invoiceAmounts: [round2(amount * 0.4)] };
    case "FULL":
      return { poAmounts: [round2(amount)], invoiceAmounts: [round2(amount)] };
    case "OVER":
      return { poAmounts: [round2(amount * 0.6)], invoiceAmounts: [round2(amount * 1.1)] };
    case "INVOICE_ONLY":
      return { poAmounts: [], invoiceAmounts: [round2(amount * 0.6)] };
  }
}

async function seedProcurementAndEvents(
  clientId: string,
  year: number,
  budgetLineId: string,
  lineCode: string,
  supplierId: string,
  flow: FlowType,
  revisedAmount: number,
) {
  const { poAmounts, invoiceAmounts } = flowAmounts(revisedAmount, flow);

  const createdOrders: Array<{ id: string; amountHt: number; reference: string }> = [];

  for (let i = 0; i < poAmounts.length; i++) {
    const amountHt = poAmounts[i];
    const tax = vat(amountHt);
    const reference = `PO-${lineCode}-${year}-${i + 1}`;

    const status =
      invoiceAmounts.length === 0
        ? PurchaseOrderStatus.APPROVED
        : invoiceAmounts.reduce((s, v) => s + v, 0) >= amountHt
          ? PurchaseOrderStatus.FULLY_INVOICED
          : PurchaseOrderStatus.PARTIALLY_INVOICED;

    const po = await prisma.purchaseOrder.upsert({
      where: {
        clientId_reference: {
          clientId,
          reference,
        },
      },
      update: {
        supplierId,
        budgetLineId,
        label: `Commande ${lineCode} ${i + 1}`,
        amountHt,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        orderDate: y(year, Math.min(12, i + 1), 10),
        status,
      },
      create: {
        clientId,
        supplierId,
        budgetLineId,
        reference,
        label: `Commande ${lineCode} ${i + 1}`,
        amountHt,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        orderDate: y(year, Math.min(12, i + 1), 10),
        status,
      },
    });

    await prisma.financialEvent.deleteMany({
      where: {
        clientId,
        sourceType: FinancialSourceType.PURCHASE_ORDER,
        sourceId: po.id,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
      },
    });

    await prisma.financialEvent.create({
      data: {
        clientId,
        budgetLineId,
        sourceType: FinancialSourceType.PURCHASE_ORDER,
        sourceId: po.id,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        amount: amountHt,
        amountHt,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        currency: "EUR",
        eventDate: y(year, Math.min(12, i + 1), 10),
        label: `Engagement ${reference}`,
      },
    });

    createdOrders.push({ id: po.id, amountHt, reference });
  }

  for (let i = 0; i < invoiceAmounts.length; i++) {
    const amountHt = invoiceAmounts[i];
    const tax = vat(amountHt);
    const purchaseOrderId = createdOrders[i]?.id ?? createdOrders[0]?.id ?? null;
    const invoiceNumber = `INV-${lineCode}-${year}-${i + 1}`;

    const invoice = await prisma.invoice.upsert({
      where: {
        clientId_invoiceNumber_supplierId: {
          clientId,
          invoiceNumber,
          supplierId,
        },
      },
      update: {
        budgetLineId,
        purchaseOrderId,
        label: `Facture ${lineCode} ${i + 1}`,
        amountHt,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        invoiceDate: y(year, Math.min(12, i + 1), 20),
        status: InvoiceStatus.PAID,
      },
      create: {
        clientId,
        supplierId,
        budgetLineId,
        purchaseOrderId,
        invoiceNumber,
        label: `Facture ${lineCode} ${i + 1}`,
        amountHt,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        invoiceDate: y(year, Math.min(12, i + 1), 20),
        status: InvoiceStatus.PAID,
      },
    });

    await prisma.financialEvent.deleteMany({
      where: {
        clientId,
        sourceType: FinancialSourceType.INVOICE,
        sourceId: invoice.id,
        eventType: FinancialEventType.CONSUMPTION_REGISTERED,
      },
    });

    await prisma.financialEvent.create({
      data: {
        clientId,
        budgetLineId,
        sourceType: FinancialSourceType.INVOICE,
        sourceId: invoice.id,
        eventType: FinancialEventType.CONSUMPTION_REGISTERED,
        amount: amountHt,
        amountHt,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        currency: "EUR",
        eventDate: y(year, Math.min(12, i + 1), 20),
        label: `Consommation ${invoiceNumber}`,
      },
    });
  }

  const committedAmount = round2(poAmounts.reduce((sum, v) => sum + v, 0));
  const consumedAmount = round2(invoiceAmounts.reduce((sum, v) => sum + v, 0));
  const forecastAmount = Math.max(revisedAmount, committedAmount, consumedAmount);
  const remainingAmount = round2(revisedAmount - committedAmount - consumedAmount);

  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: {
      committedAmount,
      consumedAmount,
      forecastAmount,
      remainingAmount,
    },
  });
}

async function seedClient(seed: ClientSeed, passwordHash: string) {
  const client = await upsertClient(seed);
  await ensureEnabledClientModules(client.id);
  await ensureDefaultActivityTypes(prisma, client.id);

  const supplierNames = seed.suppliers.map((s) => s.name);
  for (const exerciseSeed of seed.exercises) {
    for (const budgetSeed of exerciseSeed.budgets) {
      const minLines = isItBudget(budgetSeed) ? 100 : 30;
      padBudgetLines(budgetSeed, minLines, supplierNames);
    }
  }

  const userMap = new Map<string, string>();
  for (let i = 0; i < seed.users.length; i++) {
    const user = await upsertUser(seed.users[i], passwordHash);
    userMap.set(seed.users[i].email, user.id);
    await upsertClientUser(user.id, client.id, seed.users[i].role, i === 0);
  }

  const supplierByName = new Map<string, string>();
  for (const supplierSeed of seed.suppliers) {
    const category = await upsertSupplierCategory(client.id, supplierSeed.category);
    const supplier = await upsertSupplier(client.id, supplierSeed, category.id);
    supplierByName.set(supplierSeed.name, supplier.id);
  }

  for (const exerciseSeed of seed.exercises) {
    const exercise = await upsertExercise(client.id, exerciseSeed.year);

    for (const budgetSeed of exerciseSeed.budgets) {
      const budget = await upsertBudget(client.id, exercise.id, budgetSeed);

      for (const envelopeSeed of budgetSeed.envelopes) {
        const envelope = await upsertEnvelope(client.id, budget.id, envelopeSeed);

        for (const lineSeed of envelopeSeed.lines) {
          const line = await upsertLine(client.id, budget.id, envelope.id, lineSeed);
          await seedBudgetLinePlanningMonths(client.id, line.id, lineSeed.code, lineSeed.amount);
          const supplierId = supplierByName.get(lineSeed.supplierName);

          if (!supplierId) {
            throw new Error(`Supplier not found for line ${lineSeed.code}: ${lineSeed.supplierName}`);
          }

          await seedProcurementAndEvents(
            client.id,
            exerciseSeed.year,
            line.id,
            lineSeed.code,
            supplierId,
            lineSeed.flow,
            lineSeed.amount,
          );
        }
      }
    }
  }

  console.log(`✅ Seed client: ${seed.name}`);
}

/**
 * Portefeuille démo (projets SEED-01…10, risques, tâches, etc.) pour **chaque** client en base
 * disposant d’au moins un utilisateur actif — pas seulement la liste `CLIENTS`.
 */
async function ensureDemoProjectsForAllClients(): Promise<void> {
  const clients = await prisma.client.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `📁 Portefeuille démo : ${clients.length} client(s) à traiter (projets + risques + …)`,
  );

  for (const c of clients) {
    const links = await prisma.clientUser.findMany({
      where: { clientId: c.id, status: ClientUserStatus.ACTIVE },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    if (links.length === 0) {
      console.warn(
        `⚠️  [${c.slug}] « ${c.name} » : aucun utilisateur client actif — portefeuille démo ignoré.`,
      );
      continue;
    }

    const userMap = new Map<string, string>();
    for (const link of links) {
      userMap.set(link.user.email, link.userId);
    }

    await seedClientDemoProjects(c.slug, c.id, userMap);
  }
}

/** Applique `default-platform-ui-badge-config.json` en base uniquement si aucune config plateforme encore stockée. */
async function ensurePlatformUiBadgeDefaultsFromFile(): Promise<void> {
  const row = await prisma.platformUiBadgeSettings.findUnique({
    where: { id: "default" },
    select: { badgeConfig: true },
  });
  if (row?.badgeConfig != null) {
    return;
  }
  const badgePath = path.join(__dirname, "default-platform-ui-badge-config.json");
  const raw = fs.readFileSync(badgePath, "utf8");
  const config = JSON.parse(raw) as object;
  await prisma.platformUiBadgeSettings.upsert({
    where: { id: "default" },
    create: { id: "default", badgeConfig: config, updatedAt: new Date() },
    update: { badgeConfig: config, updatedAt: new Date() },
  });
  console.log(
    "✅ PlatformUiBadgeSettings : défauts badges chargés depuis default-platform-ui-badge-config.json",
  );
}

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowProdSeed = process.env.ALLOW_PROD_SEED === "true";
  if (isProduction && !allowProdSeed) {
    throw new Error(
      "Seed bloqué en production. Définis ALLOW_PROD_SEED=true uniquement si c'est volontaire.",
    );
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await ensurePlatformUiBadgeDefaultsFromFile();

  await ensureComplianceModuleAndPermissions();
  await ensureCollaboratorsModuleAndPermissions();
  await ensureSkillsModuleAndPermissions();
  await ensureTeamsModuleAndPermissions();
  await ensureActivityTypesModuleAndPermissions();
  await ensureRisksModuleAndPermissions();
  await ensureResourcesModuleAndPermissions();
  await ensureBudgetVersioningCyclePermission();
  await ensureDefaultGlobalProfiles();
  await ensureClientAdminRiskTaxonomyRole();
  await ensurePlatformAdminUser(passwordHash);

  for (const clientSeed of CLIENTS) {
    await seedClient(clientSeed, passwordHash);
  }

  await ensureMemberHumanResourcesForAllClientUsers();

  await ensureDefaultActivityTypesForAllClients();

  await ensureClientAdminTeamsModuleRole();

  await ensureBudgetCockpitCompleteDemo(prisma);

  await ensureBudgetSnapshotsAndVersions(prisma);

  await backfillBudgetLinesMissingPlanningMonths();

  await ensureDemoProjectsForAllClients();

  /** Après un SSO Microsoft, `passwordLoginEnabled` est à false → login mot de passe impossible. Réactive les comptes démo à chaque seed. */
  const demoLoginReset = await prisma.user.updateMany({
    where: {
      email: { endsWith: ".demo", mode: "insensitive" },
    },
    data: { passwordLoginEnabled: true },
  });
  console.log(
    `✅ Comptes *.demo : connexion par mot de passe réactivée (${demoLoginReset.count} utilisateur(s))`,
  );

  console.log("✅ Seed termine");
  console.log(`Mot de passe commun: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
