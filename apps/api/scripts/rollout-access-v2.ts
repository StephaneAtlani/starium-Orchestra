/**
 * Migration / rollout accès V2 par client (RFC-ACL-022, 023, runbook migration-org-scope-access).
 *
 * Pipeline : [OrgUnit racine] → backfill HUMAN → backfill ownerOrgUnitId → flags ACCESS_DECISION_V2_*.
 *
 * Usage :
 *   sh scripts/migrate-access-v2.sh --list-clients
 *   sh scripts/migrate-access-v2.sh --client-name "BatiPro Groupe"              # migration complète
 *   sh scripts/migrate-access-v2.sh --client-name "BatiPro Groupe" --dry-run  # simulation
 *   sh scripts/rollout-access-v2.sh --client-id <ID> --module projects --apply  # pilote module
 */
import { OrgUnitType, PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FLAG_KEYS, type FlagKey } from '../src/modules/feature-flags/flag-keys';
import {
  runClientUserHumanResourceBackfill,
  type BackfillExecutionMode,
} from '../src/common/backfill/client-user-human-resource.backfill';

/** Racine package API (cwd attendu : apps/api lors d’un `pnpm exec tsx scripts/...`). */
const API_ROOT = process.cwd();

type OwnerModule =
  | 'projects'
  | 'budgets'
  | 'contracts'
  | 'suppliers'
  | 'strategic_vision'
  | 'all';

const OWNER_MODULES_ORDER: readonly OwnerModule[] = [
  'projects',
  'budgets',
  'suppliers',
  'contracts',
  'strategic_vision',
] as const;

const MODULE_TO_FLAG: Record<Exclude<OwnerModule, 'all'>, FlagKey> = {
  projects: FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
  budgets: FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
  contracts: FLAG_KEYS.ACCESS_DECISION_V2_CONTRACTS,
  suppliers: FLAG_KEYS.ACCESS_DECISION_V2_PROCUREMENT,
  strategic_vision: FLAG_KEYS.ACCESS_DECISION_V2_STRATEGIC_VISION,
};

type ParsedArgs = {
  listClients: boolean;
  allClients: boolean;
  clientId: string | null;
  clientName: string | null;
  module: OwnerModule;
  mode: BackfillExecutionMode;
  skipHuman: boolean;
  skipOwner: boolean;
  flagsOnly: boolean;
  disableFlags: boolean;
  strategyFlag?: string;
  enableNameStrict: boolean;
  defaultOrgUnitId: string | null;
  ensureOrgRoot: boolean;
  forceContinue: boolean;
};

function usage(): string {
  return `migrate-access-v2 / rollout-access-v2 — migration accès V2 par client

Options :
  --list-clients              Liste les clients (id + nom)
  --all-clients               Enchaîne la migration sur tous les clients (dev / ops)
  --client-id <uuid>          Un client (incompatible avec --all-clients)
  --client-name <nom>         Un client par nom (incompatible avec --all-clients)
  --migrate                   Alias : --apply --module all --ensure-org-root
  --module <m>                projects | budgets | contracts | suppliers | strategic_vision | all
                              (défaut : all avec --migrate, sinon all)
  --dry-run                   Simulation (défaut sans --apply ni --migrate)
  --apply                     Applique backfills + active les flags V2
  --ensure-org-root           Crée une OrgUnit racine ACTIVE si absente (code ROOT)
  --flags-only                Avec --apply : uniquement les flags
  --disable                   Rollback : désactive les flags
  --skip-human                Ignore le backfill ClientUser ↔ HUMAN
  --skip-owner                Ignore le backfill ownerOrgUnitId
  --force-continue            Ne pas bloquer si ambiguous HUMAN en --apply
  --strategy <flag>           Stratégie HUMAN
  --enable-name-strict        Matching nom strict (HUMAN)
  --default-org-unit-id <id>  OrgUnit par défaut pour owner backfill

Exemples :
  sh scripts/migrate-access-v2.sh --all-clients --dry-run
  sh scripts/migrate-access-v2.sh --all-clients
  sh scripts/migrate-access-v2.sh --client-name "BatiPro Groupe"
  sh scripts/rollout-access-v2.sh --client-id <ID> --module projects --apply
`;
}

function parseArgs(argv: string[]): ParsedArgs {
  const map = new Map<string, string>();
  let listClients = false;
  let mode: BackfillExecutionMode = 'dry-run';
  let skipHuman = false;
  let skipOwner = false;
  let flagsOnly = false;
  let disableFlags = false;
  let enableNameStrict = false;
  let ensureOrgRoot = false;
  let forceContinue = false;
  let migratePreset = false;
  let allClients = false;

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--list-clients') {
      listClients = true;
      continue;
    }
    if (a === '--all-clients') {
      allClients = true;
      continue;
    }
    if (a === '--migrate') {
      migratePreset = true;
      mode = 'apply';
      ensureOrgRoot = true;
      continue;
    }
    if (a === '--dry-run') {
      mode = 'dry-run';
      continue;
    }
    if (a === '--apply') {
      mode = 'apply';
      continue;
    }
    if (a === '--ensure-org-root') {
      ensureOrgRoot = true;
      continue;
    }
    if (a === '--force-continue') {
      forceContinue = true;
      continue;
    }
    if (a === '--skip-human') {
      skipHuman = true;
      continue;
    }
    if (a === '--skip-owner') {
      skipOwner = true;
      continue;
    }
    if (a === '--flags-only') {
      flagsOnly = true;
      continue;
    }
    if (a === '--disable') {
      disableFlags = true;
      continue;
    }
    if (a === '--enable-name-strict') {
      enableNameStrict = true;
      continue;
    }
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      map.set(a.slice(2, eq), a.slice(eq + 1));
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      map.set(a.slice(2), argv[i + 1]);
      i += 1;
    } else {
      map.set(a.slice(2), 'true');
    }
  }

  const moduleRaw = map.get('module') ?? (migratePreset ? 'all' : 'all');
  const allowed: OwnerModule[] = [...OWNER_MODULES_ORDER, 'all'];
  if (!allowed.includes(moduleRaw as OwnerModule)) {
    throw new Error(`--module invalide : ${moduleRaw}. Attendu : ${allowed.join(' | ')}`);
  }

  if (allClients && (map.has('client-id') || map.has('client-name'))) {
    throw new Error('--all-clients est incompatible avec --client-id / --client-name');
  }
  if (allClients && map.has('default-org-unit-id')) {
    throw new Error('--default-org-unit-id est incompatible avec --all-clients (racine org par client)');
  }
  if (!listClients && !allClients && !map.has('client-id') && !map.has('client-name')) {
    throw new Error('Précisez --client-id, --client-name, --all-clients ou --list-clients');
  }

  return {
    listClients,
    allClients,
    clientId: map.get('client-id') ?? null,
    clientName: map.get('client-name') ?? null,
    module: moduleRaw as OwnerModule,
    mode,
    skipHuman,
    skipOwner,
    flagsOnly,
    disableFlags,
    strategyFlag: map.get('strategy'),
    enableNameStrict,
    defaultOrgUnitId: map.get('default-org-unit-id') ?? null,
    ensureOrgRoot,
    forceContinue,
  };
}

function resolveModules(module: OwnerModule): Exclude<OwnerModule, 'all'>[] {
  if (module === 'all') return [...OWNER_MODULES_ORDER];
  return [module];
}

function runOwnerBackfillScript(
  clientId: string,
  ownerModule: Exclude<OwnerModule, 'all'>,
  dryRun: boolean,
  defaultOrgUnitId: string | null,
): void {
  const args = [
    'exec',
    'ts-node',
    '--transpile-only',
    'scripts/backfill-owner-org-unit.ts',
    '--client-id',
    clientId,
    '--module',
    ownerModule,
  ];
  if (dryRun) args.push('--dry-run');
  if (defaultOrgUnitId) {
    args.push('--default-org-unit-id', defaultOrgUnitId);
  }

  console.log(`\n[rollout-access-v2] backfill ownerOrgUnitId module=${ownerModule} dryRun=${dryRun}`);
  const r = spawnSync('pnpm', args, { cwd: API_ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`backfill-owner-org-unit module=${ownerModule} exit=${r.status ?? 1}`);
  }
}

async function resolveClientId(
  prisma: PrismaClient,
  clientId: string | null,
  clientName: string | null,
): Promise<{ id: string; name: string }> {
  if (clientId) {
    const row = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });
    if (!row) throw new Error(`Client introuvable : ${clientId}`);
    return row;
  }
  if (clientName) {
    const rows = await prisma.client.findMany({
      where: { name: { equals: clientName, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    if (rows.length === 0) {
      throw new Error(`Aucun client pour le nom « ${clientName} ». Utilisez --list-clients.`);
    }
    if (rows.length > 1) {
      throw new Error(
        `Plusieurs clients pour « ${clientName} » : ${rows.map((r) => r.id).join(', ')}. Utilisez --client-id.`,
      );
    }
    return rows[0]!;
  }
  throw new Error('Précisez --client-id ou --client-name (ou --list-clients).');
}

async function findActiveRootOrgUnit(
  prisma: PrismaClient,
  clientId: string,
): Promise<{ id: string; name: string } | null> {
  return prisma.orgUnit.findFirst({
    where: { clientId, parentId: null, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
}

async function ensureRootOrgUnit(
  prisma: PrismaClient,
  client: { id: string; name: string },
  dryRun: boolean,
): Promise<string> {
  const existing = await findActiveRootOrgUnit(prisma, client.id);
  if (existing) {
    console.log(`[migrate-access-v2] OrgUnit racine : ${existing.name} (${existing.id})`);
    return existing.id;
  }

  const label = `${client.name} — Direction générale`;
  if (dryRun) {
    console.log(
      `[migrate-access-v2] [dry-run] créerait OrgUnit racine ACTIVE : code=ROOT, name="${label}"`,
    );
    return null;
  }

  const created = await prisma.orgUnit.create({
    data: {
      clientId: client.id,
      parentId: null,
      code: 'ROOT',
      name: label,
      type: OrgUnitType.COMPANY,
      sortOrder: 0,
    },
    select: { id: true, name: true },
  });
  console.log(`[migrate-access-v2] OrgUnit racine créée : ${created.name} (${created.id})`);
  return created.id;
}

async function resolveDefaultOrgUnitForOwner(
  prisma: PrismaClient,
  client: { id: string; name: string },
  explicitId: string | null,
  ensureOrgRoot: boolean,
  dryRun: boolean,
  skipOwner: boolean,
): Promise<string | null> {
  if (skipOwner) return explicitId;
  if (explicitId) return explicitId;

  const root = await findActiveRootOrgUnit(prisma, client.id);
  if (root) {
    console.log(`[migrate-access-v2] OrgUnit racine : ${root.name} (${root.id})`);
    return root.id;
  }

  if (ensureOrgRoot) {
    return ensureRootOrgUnit(prisma, client, dryRun);
  }

  console.warn(
    `[migrate-access-v2] ATTENTION : aucune OrgUnit racine ACTIVE. ` +
      `Utilisez --ensure-org-root ou --migrate, ou --default-org-unit-id.`,
  );
  return null;
}

async function setFeatureFlags(
  prisma: PrismaClient,
  clientId: string,
  modules: Exclude<OwnerModule, 'all'>[],
  enabled: boolean,
  dryRun: boolean,
): Promise<void> {
  for (const m of modules) {
    const flagKey = MODULE_TO_FLAG[m];
    if (dryRun) {
      console.log(
        `[rollout-access-v2] [dry-run] flag ${flagKey} → ${enabled ? 'ON' : 'OFF'} (module ${m})`,
      );
      continue;
    }
    await prisma.clientFeatureFlag.upsert({
      where: { clientId_flagKey: { clientId, flagKey } },
      create: { clientId, flagKey, enabled },
      update: { enabled },
    });
    console.log(`[rollout-access-v2] flag ${flagKey} = ${enabled}`);
  }
}

async function runMigrationForClient(
  prisma: PrismaClient,
  args: ParsedArgs,
  client: { id: string; name: string },
): Promise<void> {
  const modules = resolveModules(args.module);
  const dryRun = args.mode === 'dry-run';
  const applyFlags = args.mode === 'apply' && !dryRun;
  const logPrefix = '[migrate-access-v2]';

  console.log(
      `\n${'='.repeat(72)}\n${logPrefix} client=${client.name} (${client.id}) module=${args.module} mode=${args.mode}`,
  );
  if (args.flagsOnly) console.log(`${logPrefix} --flags-only : backfills ignorés`);
  if (args.disableFlags) console.log(`${logPrefix} --disable : désactivation des flags`);

  const defaultOrgUnitId = await resolveDefaultOrgUnitForOwner(
    prisma,
    client,
    args.defaultOrgUnitId,
    args.ensureOrgRoot,
    dryRun,
    args.skipOwner,
  );

  if (!args.flagsOnly && !args.skipHuman) {
    console.log(`\n${logPrefix} étape 1/3 — backfill ClientUser ↔ HUMAN`);
    const human = await runClientUserHumanResourceBackfill(prisma, {
      clientId: client.id,
      mode: args.mode,
      strategyFlag: args.strategyFlag,
      enableNameStrict: args.enableNameStrict,
    });
    console.log(`${logPrefix} rapport HUMAN : ${human.reportPath}`);
    console.log(
      `${logPrefix} linked=${human.totals.linked} ambiguous=${human.totals.ambiguous} noCandidate=${human.totals.noCandidate}`,
    );
    if (human.totals.ambiguous > 0 && args.mode === 'apply' && !args.forceContinue) {
      throw new Error(
        `${human.totals.ambiguous} membre(s) AMBIGUOUS — corrigez via UI ou relancez avec --force-continue`,
      );
    }
  }

  if (!args.flagsOnly && !args.skipOwner) {
    console.log(`\n${logPrefix} étape 2/3 — backfill ownerOrgUnitId`);
    const ownerOrgId = defaultOrgUnitId ?? args.defaultOrgUnitId;
    if (!ownerOrgId) {
      if (dryRun) {
        console.log(
          `${logPrefix} [dry-run] backfill owner ignoré (pas de racine org — sera créée en --migrate / --apply)`,
        );
      } else {
        throw new Error(
          'Backfill owner impossible sans OrgUnit racine — --migrate, --ensure-org-root ou --default-org-unit-id',
        );
      }
    } else {
      for (const m of modules) {
        runOwnerBackfillScript(client.id, m, dryRun, ownerOrgId);
      }
    }
  }

  console.log(`\n${logPrefix} étape 3/3 — feature flags ACCESS_DECISION_V2_*`);
  await setFeatureFlags(prisma, client.id, modules, !args.disableFlags, !applyFlags);
  console.log(`${logPrefix} OK — ${client.name}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();

  try {
    if (args.listClients) {
      const clients = await prisma.client.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      if (clients.length === 0) {
        console.log('Aucun client en base.');
        return;
      }
      console.log('Clients :');
      for (const c of clients) {
        console.log(`  ${c.id}\t${c.name}`);
      }
      return;
    }

    const dryRun = args.mode === 'dry-run';

    if (args.allClients) {
      const clients = await prisma.client.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      if (clients.length === 0) {
        console.log('Aucun client en base.');
        return;
      }

      console.log(
        `[migrate-access-v2] --all-clients : ${clients.length} client(s), mode=${args.mode}`,
      );
      if (args.mode === 'apply') {
        console.warn(
          '[migrate-access-v2] ATTENTION : bascule V2 sur toute la base — réservé dev / staging.',
        );
      }

      const failures: { name: string; id: string; error: string }[] = [];
      for (const client of clients) {
        try {
          await runMigrationForClient(prisma, args, client);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          failures.push({ name: client.name, id: client.id, error: message });
          console.error(`[migrate-access-v2] ÉCHEC — ${client.name} (${client.id}): ${message}`);
        }
      }

      console.log(`\n${'='.repeat(72)}`);
      console.log(
        `[migrate-access-v2] Résumé : ${clients.length - failures.length}/${clients.length} OK`,
      );
      if (failures.length > 0) {
        console.log('[migrate-access-v2] Échecs :');
        for (const f of failures) {
          console.log(`  - ${f.name} (${f.id}): ${f.error}`);
        }
        process.exitCode = 1;
      } else if (dryRun) {
        console.log('Relancez avec --all-clients (sans --dry-run) pour appliquer.');
      } else {
        console.log(
          'Vérifiez par client : /client/administration/access-model et accessDecisionV2 dans /api/me/permissions',
        );
      }
      return;
    }

    const client = await resolveClientId(prisma, args.clientId, args.clientName);
    await runMigrationForClient(prisma, args, client);

    if (dryRun) {
      console.log('\nRelancez sans --dry-run (ou avec --migrate) après revue des CSV sous apps/api/tmp/.');
    } else {
      console.log(
        '\nVérifiez : GET /api/me/permissions (accessDecisionV2) et /client/administration/access-model',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[migrate-access-v2] échec :', err instanceof Error ? err.message : err);
  console.error(usage());
  process.exitCode = 1;
});
