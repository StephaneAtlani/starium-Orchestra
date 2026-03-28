import {
  PrismaClient,
  ClientUserRole,
  ClientUserStatus,
  BudgetExerciseStatus,
  BudgetStatus,
  BudgetEnvelopeStatus,
  BudgetEnvelopeType,
  BudgetLineStatus,
  ExpenseType,
  SupplierStatus,
  PurchaseOrderStatus,
  InvoiceStatus,
  FinancialEventType,
  FinancialSourceType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

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
      status: BudgetStatus.ACTIVE,
    },
    create: {
      clientId,
      exerciseId,
      name: seed.name,
      code: seed.code,
      currency: seed.currency,
      status: BudgetStatus.ACTIVE,
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

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const clientSeed of CLIENTS) {
    await seedClient(clientSeed, passwordHash);
  }

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
