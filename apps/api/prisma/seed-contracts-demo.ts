import {
  Prisma,
  PrismaClient,
  SupplierContractRenewalMode,
  SupplierContractStatus,
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

function addDaysUtc(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

type ContractDef = {
  refSuffix: string;
  title: string;
  kind: string;
  status: SupplierContractStatus;
  startOffset: number;
  endOffset: number | null;
  renewalMode: SupplierContractRenewalMode;
  noticePeriodDays?: number;
  renewalTermMonths?: number;
  annualValue: number;
  totalCommittedValue?: number;
  billingFrequency: string;
  description: string;
  /** index fournisseur trié par nom (0 = premier) */
  supplierIndex: number;
};

const CONTRACTS: ContractDef[] = [
  {
    refSuffix: "CTR-M365",
    title: "Microsoft 365 E5 — accord-cadre licences",
    kind: "LICENSE_SAAS",
    status: SupplierContractStatus.ACTIVE,
    startOffset: -200,
    endOffset: 165,
    renewalMode: SupplierContractRenewalMode.TACIT,
    noticePeriodDays: 90,
    renewalTermMonths: 12,
    annualValue: 48000,
    totalCommittedValue: 144000,
    billingFrequency: "ANNUAL",
    description: "Seed démo — licences productivité et sécurité endpoint.",
    supplierIndex: 0,
  },
  {
    refSuffix: "CTR-CLOUD",
    title: "Cloud hyperscale — engagement annuel",
    kind: "SERVICES",
    status: SupplierContractStatus.ACTIVE,
    startOffset: -120,
    endOffset: 245,
    renewalMode: SupplierContractRenewalMode.EXPLICIT,
    noticePeriodDays: 60,
    renewalTermMonths: 12,
    annualValue: 180000,
    totalCommittedValue: 180000,
    billingFrequency: "MONTHLY",
    description: "Seed démo — compute / storage / support business.",
    supplierIndex: 1,
  },
  {
    refSuffix: "CTR-SEC",
    title: "SOC managé — surveillance 24/7",
    kind: "MAINTENANCE",
    status: SupplierContractStatus.ACTIVE,
    startOffset: -90,
    endOffset: 40,
    renewalMode: SupplierContractRenewalMode.EXPLICIT,
    noticePeriodDays: 30,
    renewalTermMonths: 12,
    annualValue: 72000,
    billingFrequency: "QUARTERLY",
    description: "Seed démo — contrat bientôt en préavis (échéance proche).",
    supplierIndex: 2,
  },
  {
    refSuffix: "CTR-ESN",
    title: "Assistance T&M — régie développement",
    kind: "SERVICES",
    status: SupplierContractStatus.NOTICE,
    startOffset: -400,
    endOffset: 20,
    renewalMode: SupplierContractRenewalMode.NONE,
    noticePeriodDays: 30,
    annualValue: 96000,
    totalCommittedValue: 192000,
    billingFrequency: "MONTHLY",
    description: "Seed démo — préavis en cours, bascule vers nouveau prestataire.",
    supplierIndex: 3,
  },
  {
    refSuffix: "CTR-LEGACY",
    title: "Maintenance ERP legacy",
    kind: "MAINTENANCE",
    status: SupplierContractStatus.EXPIRED,
    startOffset: -500,
    endOffset: -30,
    renewalMode: SupplierContractRenewalMode.NONE,
    annualValue: 24000,
    billingFrequency: "ANNUAL",
    description: "Seed démo — contrat expiré (alimente alertes contract.expired).",
    supplierIndex: 0,
  },
  {
    refSuffix: "CTR-DRAFT",
    title: "Nouveau contrat SaaS CRM — en rédaction",
    kind: "LICENSE_SAAS",
    status: SupplierContractStatus.DRAFT,
    startOffset: 30,
    endOffset: 395,
    renewalMode: SupplierContractRenewalMode.TACIT,
    noticePeriodDays: 60,
    renewalTermMonths: 12,
    annualValue: 36000,
    billingFrequency: "ANNUAL",
    description: "Seed démo — brouillon non signé.",
    supplierIndex: 4,
  },
];

/**
 * Contrats fournisseurs démo (RFC-036) — liés aux fournisseurs du client,
 * échéances cohérentes pour le cockpit alertes / échéances.
 */
export async function ensureDemoContracts(
  prisma: PrismaClient,
  slug: string,
  clientId: string,
  ownerOrgUnitId?: string | null,
): Promise<number> {
  const prefix = projectCodePrefix(slug);
  const now = new Date();
  const suppliers = await prisma.supplier.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (suppliers.length === 0) {
    console.warn(`⚠️  [${slug}] contrats démo : aucun fournisseur — skip.`);
    return 0;
  }

  const steward = await prisma.resource.findFirst({
    where: { clientId, type: "HUMAN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  let count = 0;
  for (const def of CONTRACTS) {
    const supplier = suppliers[def.supplierIndex % suppliers.length];
    const reference = `${prefix}-${def.refSuffix}`;
    const effectiveStart = addDaysUtc(now, def.startOffset);
    const effectiveEnd =
      def.endOffset == null ? null : addDaysUtc(now, def.endOffset);

    const payload = {
      title: def.title,
      kind: def.kind,
      status: def.status,
      supplierId: supplier.id,
      signedAt:
        def.status === SupplierContractStatus.DRAFT
          ? null
          : addDaysUtc(effectiveStart, -7),
      effectiveStart,
      effectiveEnd,
      terminatedAt:
        def.status === SupplierContractStatus.TERMINATED
          ? effectiveEnd
          : null,
      renewalMode: def.renewalMode,
      noticePeriodDays: def.noticePeriodDays ?? null,
      renewalTermMonths: def.renewalTermMonths ?? null,
      currency: "EUR",
      annualValue: new Prisma.Decimal(def.annualValue),
      totalCommittedValue:
        def.totalCommittedValue != null
          ? new Prisma.Decimal(def.totalCommittedValue)
          : null,
      billingFrequency: def.billingFrequency,
      description: def.description,
      ownerOrgUnitId: ownerOrgUnitId ?? null,
      stewardResourceId: steward?.id ?? null,
    };

    await prisma.supplierContract.upsert({
      where: { clientId_reference: { clientId, reference } },
      create: { clientId, reference, ...payload },
      update: payload,
    });
    count += 1;
  }

  return count;
}
