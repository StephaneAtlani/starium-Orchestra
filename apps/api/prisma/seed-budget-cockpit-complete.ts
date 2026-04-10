/**
 * Jeu de données budgétaire « cockpit » cohérent : budget, prévisionnel (forecast + phasing mensuel),
 * commandes, factures, événements financiers, prêt pour snapshots / versions (traités par
 * seed-budget-snapshots-versions.ts).
 *
 * Cible : client démo `neotech-ai` (1er client CLIENTS), exercice 2026, budget `COCKPIT-DEMO-2026`.
 */

import {
  Prisma,
  PrismaClient,
  BudgetStatus,
  BudgetExerciseStatus,
  BudgetEnvelopeStatus,
  BudgetEnvelopeType,
  BudgetLineStatus,
  BudgetTaxMode,
  BudgetLinePlanningMode,
  ExpenseType,
  SupplierStatus,
  PurchaseOrderStatus,
  InvoiceStatus,
  FinancialEventType,
  FinancialSourceType,
  AllocationType,
} from "@prisma/client";
import {
  attachVersionSetInPlace,
  ensureDraftRevision,
} from "./seed-budget-snapshots-versions";
import {
  createBudgetSnapshotFromEvents,
  syncBudgetLineAggregatedAmounts,
} from "./seed-snapshot-from-events";

const DEMO_CLIENT_SLUG = "neotech-ai";
const DEMO_YEAR = 2026;
const BUDGET_CODE = `COCKPIT-DEMO-${DEMO_YEAR}`;
const VAT_RATE = 20;

function n(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function y(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
}

function vat(amountHt: number, rate = VAT_RATE) {
  const taxAmount = round2(amountHt * (rate / 100));
  const amountTtc = round2(amountHt + taxAmount);
  return { taxRate: rate, taxAmount, amountTtc };
}

/** Répartit le forecast sur 12 mois (somme exacte, légère courbe). */
function monthlyPhasing(totalForecast: number): number[] {
  const raw = Array.from({ length: 12 }, (_, i) => {
    const wave = 1 + 0.08 * Math.sin((i / 12) * Math.PI * 2);
    return (totalForecast / 12) * wave;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((v) => round2((v / sum) * totalForecast));
  let drift = round2(totalForecast - scaled.reduce((a, b) => a + b, 0));
  scaled[11] = round2(scaled[11] + drift);
  return scaled;
}

async function upsertDemoSupplier(prisma: PrismaClient, clientId: string) {
  const cat = await prisma.supplierCategory.upsert({
    where: {
      clientId_normalizedName: {
        clientId,
        normalizedName: n("Fournisseurs cockpit"),
      },
    },
    update: { name: "Fournisseurs cockpit", isActive: true },
    create: {
      clientId,
      name: "Fournisseurs cockpit",
      normalizedName: n("Fournisseurs cockpit"),
      isActive: true,
    },
  });
  return prisma.supplier.upsert({
    where: {
      clientId_normalizedName: {
        clientId,
        normalizedName: n("Cockpit Demo Supplier"),
      },
    },
    update: { supplierCategoryId: cat.id, status: SupplierStatus.ACTIVE },
    create: {
      clientId,
      supplierCategoryId: cat.id,
      name: "Cockpit Demo Supplier",
      normalizedName: n("Cockpit Demo Supplier"),
      code: "COCKPIT-DEMO",
      status: SupplierStatus.ACTIVE,
    },
  });
}

async function upsertForecastAllocation(
  prisma: PrismaClient,
  clientId: string,
  budgetLineId: string,
  forecastTotal: number,
): Promise<void> {
  await prisma.financialAllocation.deleteMany({
    where: {
      budgetLineId,
      clientId,
      allocationType: AllocationType.FORECAST,
    },
  });
  if (forecastTotal <= 0) return;
  await prisma.financialAllocation.create({
    data: {
      clientId,
      budgetLineId,
      sourceType: FinancialSourceType.MANUAL,
      sourceId: budgetLineId,
      allocationType: AllocationType.FORECAST,
      allocatedAmount: new Prisma.Decimal(forecastTotal),
      currency: "EUR",
      effectiveDate: y(DEMO_YEAR, 1, 1),
      notes: "Seed cockpit — prévisionnel agrégé (aligné snapshot / calculateur)",
    },
  });
}

async function upsertProcurementForLine(
  prisma: PrismaClient,
  input: {
    clientId: string;
    year: number;
    budgetLineId: string;
    lineCode: string;
    supplierId: string;
    committed: number;
    consumed: number;
    /** Date commande / engagement — requis si committed > 0 */
    orderDate: Date | null;
    /** Date facture / consommation — requis si consumed > 0 */
    invoiceDate: Date | null;
  },
): Promise<void> {
  const {
    clientId,
    year,
    budgetLineId,
    lineCode,
    supplierId,
    committed,
    consumed,
    orderDate,
    invoiceDate,
  } = input;

  const poRef = `PO-COCKPIT-${lineCode}-${year}`;
  const invRef = `INV-COCKPIT-${lineCode}-${year}`;

  if (committed <= 0 && consumed <= 0) {
    await prisma.financialEvent.deleteMany({ where: { budgetLineId } });
    await prisma.invoice.deleteMany({
      where: {
        clientId,
        budgetLineId,
        invoiceNumber: invRef,
      },
    });
    await prisma.purchaseOrder.deleteMany({
      where: {
        clientId,
        reference: poRef,
      },
    });
    return;
  }

  let poId: string | null = null;

  if (committed > 0) {
    const od = orderDate ?? y(year, 3, 10);
    const tax = vat(committed);
    const invoiceTotal = consumed;
    const status =
      consumed <= 0
        ? PurchaseOrderStatus.APPROVED
        : invoiceTotal >= committed
          ? PurchaseOrderStatus.FULLY_INVOICED
          : PurchaseOrderStatus.PARTIALLY_INVOICED;

    const po = await prisma.purchaseOrder.upsert({
      where: {
        clientId_reference: {
          clientId,
          reference: poRef,
        },
      },
      update: {
        supplierId,
        budgetLineId,
        label: `Commande cockpit ${lineCode}`,
        amountHt: committed,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        orderDate: od,
        status,
      },
      create: {
        clientId,
        supplierId,
        budgetLineId,
        reference: poRef,
        label: `Commande cockpit ${lineCode}`,
        amountHt: committed,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        orderDate: od,
        status,
      },
    });
    poId = po.id;

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
        amount: committed,
        amountHt: committed,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        currency: "EUR",
        eventDate: od,
        label: `Engagement ${poRef}`,
      },
    });
  } else {
    await prisma.purchaseOrder.deleteMany({
      where: { clientId, reference: poRef },
    });
  }

  if (consumed > 0) {
    const idate = invoiceDate ?? y(year, 4, 20);
    const tax = vat(consumed);
    const invoice = await prisma.invoice.upsert({
      where: {
        clientId_invoiceNumber_supplierId: {
          clientId,
          invoiceNumber: invRef,
          supplierId,
        },
      },
      update: {
        budgetLineId,
        purchaseOrderId: poId,
        label: `Facture cockpit ${lineCode}`,
        amountHt: consumed,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        invoiceDate: idate,
        status: InvoiceStatus.PAID,
      },
      create: {
        clientId,
        supplierId,
        budgetLineId,
        purchaseOrderId: poId,
        invoiceNumber: invRef,
        label: `Facture cockpit ${lineCode}`,
        amountHt: consumed,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        invoiceDate: idate,
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
        amount: consumed,
        amountHt: consumed,
        taxRate: tax.taxRate,
        taxAmount: tax.taxAmount,
        amountTtc: tax.amountTtc,
        currency: "EUR",
        eventDate: idate,
        label: `Consommation ${invRef}`,
      },
    });
  } else {
    await prisma.invoice.deleteMany({
      where: {
        clientId,
        supplierId,
        invoiceNumber: invRef,
      },
    });
  }
}

async function upsertPlanningTimeline(
  prisma: PrismaClient,
  clientId: string,
  budgetLineId: string,
  forecastTotal: number,
): Promise<void> {
  const months = monthlyPhasing(forecastTotal);
  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: {
      planningMode: BudgetLinePlanningMode.ANNUAL_SPREAD,
      planningTotalAmount: new Prisma.Decimal(forecastTotal),
    },
  });
  for (let m = 0; m < 12; m++) {
    const monthIndex = m + 1;
    await prisma.budgetLinePlanningMonth.upsert({
      where: {
        budgetLineId_monthIndex: {
          budgetLineId,
          monthIndex,
        },
      },
      update: { amount: new Prisma.Decimal(months[m]) },
      create: {
        clientId,
        budgetLineId,
        monthIndex,
        amount: new Prisma.Decimal(months[m]),
      },
    });
  }
}

type LineStory = {
  code: string;
  name: string;
  envelopeCode: string;
  revised: number;
  forecast: number;
  committed: number;
  consumed: number;
  description: string;
};

const LINE_STORIES: LineStory[] = [
  {
    code: "COCKPIT-OK",
    name: "Ligne OK — pilotage sous budget",
    envelopeCode: "COCKPIT-RUN",
    revised: 120_000,
    forecast: 110_000,
    committed: 70_000,
    consumed: 50_000,
    description:
      "Révisé 120 k€, engagements 70 k€, consommé 50 k€, prévisionnel 110 k€ → statut OK (forecast).",
  },
  {
    code: "COCKPIT-WARN",
    name: "Ligne WARNING — prévisionnel au-dessus du révisé",
    envelopeCode: "COCKPIT-RUN",
    revised: 90_000,
    forecast: 98_000,
    committed: 40_000,
    consumed: 35_000,
    description:
      "Révisé 90 k€, prévisionnel 98 k€ > révisé, consommé ≤ révisé → WARNING.",
  },
  {
    code: "COCKPIT-CRIT",
    name: "Ligne CRITICAL — consommé dépasse le révisé",
    envelopeCode: "COCKPIT-RUN",
    revised: 40_000,
    forecast: 42_000,
    committed: 35_000,
    consumed: 55_000,
    description:
      "Révisé 40 k€, factures 55 k€ → consommé > budgétaire révisé → CRITICAL.",
  },
  {
    code: "COCKPIT-ENG",
    name: "Ligne engagements — pas encore de facture",
    envelopeCode: "COCKPIT-BUILD",
    revised: 100_000,
    forecast: 92_000,
    committed: 80_000,
    consumed: 0,
    description:
      "Commande 80 k€, pas de facture : engagement en cours, pilotage à suivre.",
  },
  {
    code: "COCKPIT-PLAN",
    name: "Ligne timeline — phasing mensuel seul (sans achat)",
    envelopeCode: "COCKPIT-BUILD",
    revised: 60_000,
    forecast: 60_000,
    committed: 0,
    consumed: 0,
    description:
      "Prévision répartie sur 12 mois (sans BC / facture) pour la courbe cockpit.",
  },
];

/** Dates BC / factures (UTC) — commande avant facture ; factures en avril pour qu’une figée au 31/03 exclue le consommé. */
function procurementDatesForLine(code: string): {
  orderDate: Date | null;
  invoiceDate: Date | null;
} {
  switch (code) {
    case "COCKPIT-OK":
      return { orderDate: y(2026, 2, 5), invoiceDate: y(2026, 4, 12) };
    case "COCKPIT-WARN":
      return { orderDate: y(2026, 3, 8), invoiceDate: y(2026, 4, 22) };
    case "COCKPIT-CRIT":
      return { orderDate: y(2026, 2, 18), invoiceDate: y(2026, 4, 28) };
    case "COCKPIT-ENG":
      return { orderDate: y(2026, 3, 12), invoiceDate: null };
    case "COCKPIT-PLAN":
      return { orderDate: null, invoiceDate: null };
    default:
      return { orderDate: y(DEMO_YEAR, 3, 10), invoiceDate: y(DEMO_YEAR, 4, 20) };
  }
}

export async function ensureBudgetCockpitCompleteDemo(
  prisma: PrismaClient,
): Promise<void> {
  const client = await prisma.client.findFirst({
    where: { slug: DEMO_CLIENT_SLUG },
  });
  if (!client) {
    console.warn(
      `⚠️  [seed-budget-cockpit-complete] client « ${DEMO_CLIENT_SLUG} » introuvable — ignoré.`,
    );
    return;
  }

  const supplier = await upsertDemoSupplier(prisma, client.id);

  const exercise = await prisma.budgetExercise.upsert({
    where: {
      clientId_code: {
        clientId: client.id,
        code: `EX-${DEMO_YEAR}`,
      },
    },
    update: {
      name: `Exercice ${DEMO_YEAR}`,
      startDate: y(DEMO_YEAR, 1, 1),
      endDate: y(DEMO_YEAR, 12, 31),
      status: BudgetExerciseStatus.ACTIVE,
    },
    create: {
      clientId: client.id,
      code: `EX-${DEMO_YEAR}`,
      name: `Exercice ${DEMO_YEAR}`,
      startDate: y(DEMO_YEAR, 1, 1),
      endDate: y(DEMO_YEAR, 12, 31),
      status: BudgetExerciseStatus.ACTIVE,
    },
  });

  const budget = await prisma.budget.upsert({
    where: {
      clientId_code: {
        clientId: client.id,
        code: BUDGET_CODE,
      },
    },
    update: {
      exerciseId: exercise.id,
      name: "Budget cockpit démo (forecast, snapshots, versions, achats)",
      currency: "EUR",
      status: BudgetStatus.VALIDATED,
      taxMode: BudgetTaxMode.HT,
    },
    create: {
      clientId: client.id,
      exerciseId: exercise.id,
      name: "Budget cockpit démo (forecast, snapshots, versions, achats)",
      code: BUDGET_CODE,
      currency: "EUR",
      status: BudgetStatus.VALIDATED,
      taxMode: BudgetTaxMode.HT,
    },
  });

  const envRun = await prisma.budgetEnvelope.upsert({
    where: {
      clientId_budgetId_code: {
        clientId: client.id,
        budgetId: budget.id,
        code: "COCKPIT-RUN",
      },
    },
    update: {
      name: "Run — cockpit",
      type: BudgetEnvelopeType.RUN,
      status: BudgetEnvelopeStatus.ACTIVE,
    },
    create: {
      clientId: client.id,
      budgetId: budget.id,
      code: "COCKPIT-RUN",
      name: "Run — cockpit",
      type: BudgetEnvelopeType.RUN,
      status: BudgetEnvelopeStatus.ACTIVE,
    },
  });

  const envBuild = await prisma.budgetEnvelope.upsert({
    where: {
      clientId_budgetId_code: {
        clientId: client.id,
        budgetId: budget.id,
        code: "COCKPIT-BUILD",
      },
    },
    update: {
      name: "Build — cockpit",
      type: BudgetEnvelopeType.BUILD,
      status: BudgetEnvelopeStatus.ACTIVE,
    },
    create: {
      clientId: client.id,
      budgetId: budget.id,
      code: "COCKPIT-BUILD",
      name: "Build — cockpit",
      type: BudgetEnvelopeType.BUILD,
      status: BudgetEnvelopeStatus.ACTIVE,
    },
  });

  for (const story of LINE_STORIES) {
    const envelopeId =
      story.envelopeCode === "COCKPIT-BUILD" ? envBuild.id : envRun.id;

    const line = await prisma.budgetLine.upsert({
      where: {
        clientId_budgetId_code: {
          clientId: client.id,
          budgetId: budget.id,
          code: story.code,
        },
      },
      update: {
        envelopeId,
        name: story.name,
        description: story.description,
        expenseType: ExpenseType.OPEX,
        status: BudgetLineStatus.ACTIVE,
        currency: "EUR",
        taxRate: VAT_RATE,
        initialAmount: new Prisma.Decimal(story.revised),
        forecastAmount: new Prisma.Decimal(0),
        committedAmount: new Prisma.Decimal(0),
        consumedAmount: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(0),
      },
      create: {
        clientId: client.id,
        budgetId: budget.id,
        envelopeId,
        code: story.code,
        name: story.name,
        description: story.description,
        expenseType: ExpenseType.OPEX,
        status: BudgetLineStatus.ACTIVE,
        currency: "EUR",
        taxRate: VAT_RATE,
        initialAmount: new Prisma.Decimal(story.revised),
        forecastAmount: new Prisma.Decimal(0),
        committedAmount: new Prisma.Decimal(0),
        consumedAmount: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(0),
      },
    });

    await upsertPlanningTimeline(prisma, client.id, line.id, story.forecast);
    await upsertForecastAllocation(prisma, client.id, line.id, story.forecast);

    const { orderDate, invoiceDate } = procurementDatesForLine(story.code);
    await upsertProcurementForLine(prisma, {
      clientId: client.id,
      year: DEMO_YEAR,
      budgetLineId: line.id,
      lineCode: story.code,
      supplierId: supplier.id,
      committed: story.committed,
      consumed: story.consumed,
      orderDate,
      invoiceDate,
    });

    await syncBudgetLineAggregatedAmounts(prisma, line.id, client.id);
  }

  await attachVersionSetInPlace(prisma, budget.id);
  await ensureDraftRevision(prisma, budget.id);

  await prisma.budgetSnapshot.deleteMany({
    where: {
      budgetId: budget.id,
      OR: [
        { name: { startsWith: "Seed " } },
        { name: { startsWith: "Démo — cockpit" } },
      ],
    },
  });

  await createBudgetSnapshotFromEvents(
    prisma,
    budget.id,
    "Démo — cockpit — figée au 31/03/2026 (engagements inclus, factures avril exclues)",
    y(2026, 3, 31),
  );
  await createBudgetSnapshotFromEvents(
    prisma,
    budget.id,
    "Démo — cockpit — figée au 31/05/2026 (mouvements jusqu’à fin mai)",
    y(2026, 5, 31),
  );

  console.log(
    `✅ Budget cockpit démo : « ${budget.name} » (${BUDGET_CODE}) — ${LINE_STORIES.length} lignes, BC/factures datés, allocations prévi., montants = agrégation moteur ; 2 versions figées (31/03 et 31/05) cohérentes avec les événements.`,
  );
}
