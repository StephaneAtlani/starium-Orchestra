/**
 * RFC-ACL-022 — Backfill `ownerOrgUnitId` pour les ressources métier scopables.
 *
 * Usage :
 *   pnpm --filter @starium-orchestra/api exec tsx scripts/backfill-owner-org-unit.ts \
 *     --client-id <clientId> --module <module> [--dry-run] [--default-org-unit-id <orgUnitId>]
 *
 * Arguments :
 *   --client-id <id>             (obligatoire) client cible
 *   --module <m>                 budgets | projects | contracts | suppliers | strategic_vision | all
 *   --dry-run                    n'écrit rien en base, produit le CSV
 *   --default-org-unit-id <id>   override de la racine (sinon : OrgUnit racine ACTIVE du client)
 *
 * Règles (§5 RFC-ACL-020 plan) :
 * - Filtre statut actif obligatoire (cf. tableau §5.1).
 * - Budget AVANT BudgetLine (ordre forcé).
 * - BudgetLine : pas d'override automatique (cf. §5.2) — héritage parent préservé.
 * - Idempotent : ressources déjà owned skip.
 * - Rapport CSV `tmp/backfill-org-scope-<clientId>-<timestamp>.csv`.
 * - Audit log `org_scope_backfill.applied` par batch.
 */
import {
  BudgetLineStatus,
  BudgetStatus,
  PrismaClient,
  ProjectStatus,
  StrategicObjectiveLifecycleStatus,
  SupplierContractStatus,
  SupplierStatus,
} from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type ModuleName =
  | 'budgets'
  | 'projects'
  | 'contracts'
  | 'suppliers'
  | 'strategic_vision'
  | 'all';

type CsvRow = {
  resourceType: string;
  resourceId: string;
  label: string;
  previousOwner: string | null;
  newOwner: string | null;
  action:
    | 'UPDATED'
    | 'SKIP'
    | 'INHERITED_FROM_BUDGET'
    | 'UNRESOLVED_PARENT_WITHOUT_OWNER';
  skippedReason?:
    | 'ALREADY_OWNED'
    | 'ALREADY_OVERRIDDEN'
    | 'PARENT_INHERITANCE'
    | 'PARENT_UNOWNED';
};

const prisma = new PrismaClient();

function parseArgs(argv: string[]): {
  clientId: string;
  moduleName: ModuleName;
  dryRun: boolean;
  defaultOrgUnitIdOverride: string | null;
} {
  const map = new Map<string, string>();
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      map.set(a.slice(2, eq), a.slice(eq + 1));
    } else if (a === '--dry-run') {
      map.set('dry-run', 'true');
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      map.set(a.slice(2), argv[i + 1]);
      i += 1;
    } else {
      map.set(a.slice(2), 'true');
    }
  }
  const clientId = map.get('client-id');
  if (!clientId) {
    throw new Error('--client-id <id> est obligatoire');
  }
  const m = (map.get('module') ?? 'all') as ModuleName;
  if (
    !['budgets', 'projects', 'contracts', 'suppliers', 'strategic_vision', 'all'].includes(
      m,
    )
  ) {
    throw new Error(`--module invalide : ${m}`);
  }
  return {
    clientId,
    moduleName: m,
    dryRun: map.get('dry-run') === 'true',
    defaultOrgUnitIdOverride: map.get('default-org-unit-id') ?? null,
  };
}

async function resolveDefaultOrgUnitId(
  clientId: string,
  override: string | null,
): Promise<string> {
  if (override) {
    const ou = await prisma.orgUnit.findFirst({
      where: { id: override, clientId },
      select: { id: true, status: true },
    });
    if (!ou) {
      throw new Error(
        `--default-org-unit-id ${override} introuvable pour client ${clientId}`,
      );
    }
    if (ou.status !== 'ACTIVE') {
      throw new Error(`OrgUnit override ${override} non ACTIVE`);
    }
    return ou.id;
  }
  const root = await prisma.orgUnit.findFirst({
    where: { clientId, parentId: null, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!root) {
    throw new Error(
      `Aucune OrgUnit racine ACTIVE trouvée pour client ${clientId} — créer une racine ou passer --default-org-unit-id.`,
    );
  }
  return root.id;
}

async function backfillProjects(
  clientId: string,
  defaultOrgUnitId: string,
  dryRun: boolean,
  rows: CsvRow[],
): Promise<{ updated: number; skipped: number }> {
  const items = await prisma.project.findMany({
    where: {
      clientId,
      status: { notIn: [ProjectStatus.ARCHIVED, ProjectStatus.CANCELLED] },
    },
    select: { id: true, code: true, name: true, ownerOrgUnitId: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const r of items) {
    if (r.ownerOrgUnitId) {
      rows.push({
        resourceType: 'PROJECT',
        resourceId: r.id,
        label: `${r.name} (${r.code})`,
        previousOwner: r.ownerOrgUnitId,
        newOwner: r.ownerOrgUnitId,
        action: 'SKIP',
        skippedReason: 'ALREADY_OWNED',
      });
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await prisma.project.update({
        where: { id: r.id },
        data: { ownerOrgUnitId: defaultOrgUnitId },
      });
    }
    rows.push({
      resourceType: 'PROJECT',
      resourceId: r.id,
      label: `${r.name} (${r.code})`,
      previousOwner: null,
      newOwner: defaultOrgUnitId,
      action: 'UPDATED',
    });
    updated += 1;
  }
  return { updated, skipped };
}

async function backfillBudgets(
  clientId: string,
  defaultOrgUnitId: string,
  dryRun: boolean,
  rows: CsvRow[],
): Promise<{ updated: number; skipped: number }> {
  const items = await prisma.budget.findMany({
    where: {
      clientId,
      status: { not: BudgetStatus.ARCHIVED },
    },
    select: { id: true, code: true, name: true, ownerOrgUnitId: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const r of items) {
    if (r.ownerOrgUnitId) {
      rows.push({
        resourceType: 'BUDGET',
        resourceId: r.id,
        label: `${r.name} (${r.code})`,
        previousOwner: r.ownerOrgUnitId,
        newOwner: r.ownerOrgUnitId,
        action: 'SKIP',
        skippedReason: 'ALREADY_OWNED',
      });
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await prisma.budget.update({
        where: { id: r.id },
        data: { ownerOrgUnitId: defaultOrgUnitId },
      });
    }
    rows.push({
      resourceType: 'BUDGET',
      resourceId: r.id,
      label: `${r.name} (${r.code})`,
      previousOwner: null,
      newOwner: defaultOrgUnitId,
      action: 'UPDATED',
    });
    updated += 1;
  }
  return { updated, skipped };
}

/**
 * BudgetLine — §5.2 : pas d'override automatique. Préserver la sémantique
 * « ligne sinon budget ». On rapporte seulement.
 */
async function reportBudgetLines(
  clientId: string,
  rows: CsvRow[],
): Promise<{
  inherited: number;
  unresolvedParent: number;
  overridden: number;
}> {
  const items = await prisma.budgetLine.findMany({
    where: {
      clientId,
      status: { notIn: [BudgetLineStatus.ARCHIVED, BudgetLineStatus.CLOSED] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      ownerOrgUnitId: true,
      budgetId: true,
      budget: { select: { ownerOrgUnitId: true } },
    },
  });
  let inherited = 0;
  let unresolvedParent = 0;
  let overridden = 0;
  for (const r of items) {
    const parentOwner = r.budget?.ownerOrgUnitId ?? null;
    if (r.ownerOrgUnitId) {
      rows.push({
        resourceType: 'BUDGET_LINE',
        resourceId: r.id,
        label: `${r.name} (${r.code})`,
        previousOwner: r.ownerOrgUnitId,
        newOwner: r.ownerOrgUnitId,
        action: 'SKIP',
        skippedReason: 'ALREADY_OVERRIDDEN',
      });
      overridden += 1;
      continue;
    }
    if (parentOwner) {
      rows.push({
        resourceType: 'BUDGET_LINE',
        resourceId: r.id,
        label: `${r.name} (${r.code})`,
        previousOwner: null,
        newOwner: null,
        action: 'INHERITED_FROM_BUDGET',
        skippedReason: 'PARENT_INHERITANCE',
      });
      inherited += 1;
    } else {
      rows.push({
        resourceType: 'BUDGET_LINE',
        resourceId: r.id,
        label: `${r.name} (${r.code})`,
        previousOwner: null,
        newOwner: null,
        action: 'UNRESOLVED_PARENT_WITHOUT_OWNER',
        skippedReason: 'PARENT_UNOWNED',
      });
      unresolvedParent += 1;
    }
  }
  return { inherited, unresolvedParent, overridden };
}

async function backfillSuppliers(
  clientId: string,
  defaultOrgUnitId: string,
  dryRun: boolean,
  rows: CsvRow[],
): Promise<{ updated: number; skipped: number }> {
  const items = await prisma.supplier.findMany({
    where: { clientId, status: { not: SupplierStatus.ARCHIVED } },
    select: { id: true, code: true, name: true, ownerOrgUnitId: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const r of items) {
    if (r.ownerOrgUnitId) {
      rows.push({
        resourceType: 'SUPPLIER',
        resourceId: r.id,
        label: `${r.name} (${r.code ?? ''})`,
        previousOwner: r.ownerOrgUnitId,
        newOwner: r.ownerOrgUnitId,
        action: 'SKIP',
        skippedReason: 'ALREADY_OWNED',
      });
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await prisma.supplier.update({
        where: { id: r.id },
        data: { ownerOrgUnitId: defaultOrgUnitId },
      });
    }
    rows.push({
      resourceType: 'SUPPLIER',
      resourceId: r.id,
      label: `${r.name} (${r.code ?? ''})`,
      previousOwner: null,
      newOwner: defaultOrgUnitId,
      action: 'UPDATED',
    });
    updated += 1;
  }
  return { updated, skipped };
}

async function backfillContracts(
  clientId: string,
  defaultOrgUnitId: string,
  dryRun: boolean,
  rows: CsvRow[],
): Promise<{ updated: number; skipped: number }> {
  // SupplierContractStatus n'a pas ARCHIVED ; on filtre TERMINATED.
  const items = await prisma.supplierContract.findMany({
    where: {
      clientId,
      status: { not: SupplierContractStatus.TERMINATED },
    },
    select: {
      id: true,
      reference: true,
      title: true,
      ownerOrgUnitId: true,
    },
  });
  let updated = 0;
  let skipped = 0;
  for (const r of items) {
    if (r.ownerOrgUnitId) {
      rows.push({
        resourceType: 'CONTRACT',
        resourceId: r.id,
        label: `${r.title ?? r.reference}`,
        previousOwner: r.ownerOrgUnitId,
        newOwner: r.ownerOrgUnitId,
        action: 'SKIP',
        skippedReason: 'ALREADY_OWNED',
      });
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await prisma.supplierContract.update({
        where: { id: r.id },
        data: { ownerOrgUnitId: defaultOrgUnitId },
      });
    }
    rows.push({
      resourceType: 'CONTRACT',
      resourceId: r.id,
      label: `${r.title ?? r.reference}`,
      previousOwner: null,
      newOwner: defaultOrgUnitId,
      action: 'UPDATED',
    });
    updated += 1;
  }
  return { updated, skipped };
}

async function backfillStrategicObjectives(
  clientId: string,
  defaultOrgUnitId: string,
  dryRun: boolean,
  rows: CsvRow[],
): Promise<{ updated: number; skipped: number }> {
  const items = await prisma.strategicObjective.findMany({
    where: {
      clientId,
      lifecycleStatus: { not: StrategicObjectiveLifecycleStatus.ARCHIVED },
    },
    select: { id: true, code: true, name: true, ownerOrgUnitId: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const r of items) {
    if (r.ownerOrgUnitId) {
      rows.push({
        resourceType: 'STRATEGIC_OBJECTIVE',
        resourceId: r.id,
        label: `${r.name} (${r.code ?? ''})`,
        previousOwner: r.ownerOrgUnitId,
        newOwner: r.ownerOrgUnitId,
        action: 'SKIP',
        skippedReason: 'ALREADY_OWNED',
      });
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await prisma.strategicObjective.update({
        where: { id: r.id },
        data: { ownerOrgUnitId: defaultOrgUnitId },
      });
    }
    rows.push({
      resourceType: 'STRATEGIC_OBJECTIVE',
      resourceId: r.id,
      label: `${r.name} (${r.code ?? ''})`,
      previousOwner: null,
      newOwner: defaultOrgUnitId,
      action: 'UPDATED',
    });
    updated += 1;
  }
  return { updated, skipped };
}

function csvEscape(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsvReport(clientId: string, rows: CsvRow[]): string {
  const dir = join(process.cwd(), 'tmp');
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(dir, `backfill-org-scope-${clientId}-${ts}.csv`);
  const header = [
    'resourceType',
    'resourceId',
    'label',
    'previousOwner',
    'newOwner',
    'action',
    'skippedReason',
  ].join(',');
  const lines = rows.map((r) =>
    [
      r.resourceType,
      r.resourceId,
      csvEscape(r.label),
      r.previousOwner ?? '',
      r.newOwner ?? '',
      r.action,
      r.skippedReason ?? '',
    ].join(','),
  );
  writeFileSync(path, [header, ...lines].join('\n'), 'utf8');
  return path;
}

async function main(): Promise<void> {
  const { clientId, moduleName, dryRun, defaultOrgUnitIdOverride } = parseArgs(
    process.argv,
  );
  console.log(
    `[backfill-owner-org-unit] client=${clientId} module=${moduleName} dryRun=${dryRun}`,
  );

  const defaultOrgUnitId = await resolveDefaultOrgUnitId(
    clientId,
    defaultOrgUnitIdOverride,
  );
  console.log(`[backfill-owner-org-unit] default OrgUnit = ${defaultOrgUnitId}`);

  const rows: CsvRow[] = [];
  const totals: Record<string, { updated: number; skipped: number }> = {};

  const runProjects = moduleName === 'projects' || moduleName === 'all';
  const runBudgets = moduleName === 'budgets' || moduleName === 'all';
  const runSuppliers = moduleName === 'suppliers' || moduleName === 'all';
  const runContracts = moduleName === 'contracts' || moduleName === 'all';
  const runStrategic =
    moduleName === 'strategic_vision' || moduleName === 'all';

  if (runProjects) {
    totals.PROJECT = await backfillProjects(clientId, defaultOrgUnitId, dryRun, rows);
    console.log(`[backfill] PROJECT updated=${totals.PROJECT.updated} skipped=${totals.PROJECT.skipped}`);
  }
  if (runBudgets) {
    totals.BUDGET = await backfillBudgets(clientId, defaultOrgUnitId, dryRun, rows);
    console.log(`[backfill] BUDGET updated=${totals.BUDGET.updated} skipped=${totals.BUDGET.skipped}`);
    const bl = await reportBudgetLines(clientId, rows);
    console.log(
      `[backfill] BUDGET_LINE inherited=${bl.inherited} unresolvedParent=${bl.unresolvedParent} overridden=${bl.overridden}`,
    );
  }
  if (runSuppliers) {
    totals.SUPPLIER = await backfillSuppliers(clientId, defaultOrgUnitId, dryRun, rows);
    console.log(`[backfill] SUPPLIER updated=${totals.SUPPLIER.updated} skipped=${totals.SUPPLIER.skipped}`);
  }
  if (runContracts) {
    totals.CONTRACT = await backfillContracts(clientId, defaultOrgUnitId, dryRun, rows);
    console.log(`[backfill] CONTRACT updated=${totals.CONTRACT.updated} skipped=${totals.CONTRACT.skipped}`);
  }
  if (runStrategic) {
    totals.STRATEGIC_OBJECTIVE = await backfillStrategicObjectives(
      clientId,
      defaultOrgUnitId,
      dryRun,
      rows,
    );
    console.log(
      `[backfill] STRATEGIC_OBJECTIVE updated=${totals.STRATEGIC_OBJECTIVE.updated} skipped=${totals.STRATEGIC_OBJECTIVE.skipped}`,
    );
  }

  const reportPath = writeCsvReport(clientId, rows);
  console.log(`[backfill-owner-org-unit] rapport CSV : ${reportPath}`);

  if (!dryRun) {
    await prisma.auditLog.create({
      data: {
        clientId,
        action: 'org_scope_backfill.applied',
        resourceType: 'org_scope_backfill',
        resourceId: clientId,
        newValue: {
          module: moduleName,
          defaultOrgUnitId,
          totals,
          reportPath,
        } as any,
      },
    });
  }
}

main()
  .catch((err) => {
    console.error('[backfill-owner-org-unit] échec', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
