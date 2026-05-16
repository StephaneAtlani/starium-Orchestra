import {
  ClientUserStatus,
  Prisma,
  PrismaClient,
  ResourceType,
} from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clientUserLabel,
  HumanResourceCandidate,
  matchClientUserToHumanResource,
  MatchResult,
  parseBackfillStrategyFlag,
  BackfillStrategy,
} from './client-user-human-resource.matcher';

export type BackfillExecutionMode = 'dry-run' | 'apply';

export type BackfillCsvRow = {
  clientUserId: string;
  clientUserLabel: string;
  userEmail: string;
  defaultEmailIdentity: string;
  mode: BackfillExecutionMode;
  action: MatchResult['action'];
  resourceId: string;
  resourceLabel: string;
  matchedBy: MatchResult['matchedBy'];
  candidateCount: number;
  reason: string;
};

export type RunClientUserHumanResourceBackfillOptions = {
  clientId: string;
  mode: BackfillExecutionMode;
  strategyFlag?: string;
  enableNameStrict: boolean;
  limit?: number;
};

export type BackfillRunResult = {
  reportPath: string;
  rows: BackfillCsvRow[];
  totals: {
    linked: number;
    skipped: number;
    ambiguous: number;
    noCandidate: number;
    error: number;
  };
};

const CSV_HEADER = [
  'clientUserId',
  'clientUserLabel',
  'userEmail',
  'defaultEmailIdentity',
  'mode',
  'action',
  'resourceId',
  'resourceLabel',
  'matchedBy',
  'candidateCount',
  'reason',
] as const;

export function csvEscape(value: string | null | undefined): string {
  const s = value ?? '';
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function writeHumanResourceBackfillCsv(
  clientId: string,
  rows: BackfillCsvRow[],
): string {
  const dir = join(process.cwd(), 'tmp');
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(dir, `backfill-human-link-${clientId}-${ts}.csv`);
  const lines = rows.map((r) =>
    [
      r.clientUserId,
      csvEscape(r.clientUserLabel),
      csvEscape(r.userEmail),
      csvEscape(r.defaultEmailIdentity),
      r.mode,
      r.action,
      r.resourceId,
      csvEscape(r.resourceLabel),
      r.matchedBy,
      String(r.candidateCount),
      csvEscape(r.reason),
    ].join(','),
  );
  writeFileSync(path, [CSV_HEADER.join(','), ...lines].join('\n'), 'utf8');
  return path;
}

function resolveMatcherStrategy(
  strategyFlag: string | undefined,
  enableNameStrict: boolean,
): BackfillStrategy {
  return parseBackfillStrategyFlag(strategyFlag, enableNameStrict);
}

function matchResultToCsvRow(
  member: {
    clientUserId: string;
    userEmail: string;
    userFirstName: string | null;
    userLastName: string | null;
    defaultEmailIdentityEmail: string | null;
  },
  mode: BackfillExecutionMode,
  match: MatchResult,
): BackfillCsvRow {
  return {
    clientUserId: member.clientUserId,
    clientUserLabel: clientUserLabel({
      clientUserId: member.clientUserId,
      resourceId: null,
      userEmail: member.userEmail,
      userFirstName: member.userFirstName,
      userLastName: member.userLastName,
      defaultEmailIdentityEmail: member.defaultEmailIdentityEmail,
    }),
    userEmail: member.userEmail,
    defaultEmailIdentity: member.defaultEmailIdentityEmail ?? '',
    mode,
    action: match.action,
    resourceId: match.resourceId ?? '',
    resourceLabel: match.resourceLabel ?? '',
    matchedBy: match.matchedBy,
    candidateCount: match.candidateCount,
    reason: match.reason,
  };
}

function incrementTotals(
  totals: BackfillRunResult['totals'],
  action: MatchResult['action'],
): void {
  switch (action) {
    case 'LINKED':
      totals.linked += 1;
      break;
    case 'SKIP':
      totals.skipped += 1;
      break;
    case 'AMBIGUOUS':
      totals.ambiguous += 1;
      break;
    case 'NO_CANDIDATE':
      totals.noCandidate += 1;
      break;
    case 'ERROR':
      totals.error += 1;
      break;
    default:
      break;
  }
}

export async function runClientUserHumanResourceBackfill(
  prisma: PrismaClient,
  options: RunClientUserHumanResourceBackfillOptions,
): Promise<BackfillRunResult> {
  const { clientId, mode, enableNameStrict, limit } = options;
  const strategy = resolveMatcherStrategy(options.strategyFlag, enableNameStrict);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) {
    throw new Error(`Client introuvable : ${clientId}`);
  }

  const humanRows = await prisma.resource.findMany({
    where: { clientId, type: ResourceType.HUMAN },
    select: { id: true, name: true, firstName: true, email: true },
  });
  const resources: HumanResourceCandidate[] = humanRows;

  const linkedUsers = await prisma.clientUser.findMany({
    where: { clientId, resourceId: { not: null } },
    select: { resourceId: true },
  });
  const linkedResourceIds = new Set(
    linkedUsers.map((u) => u.resourceId).filter((id): id is string => !!id),
  );

  const members = await prisma.clientUser.findMany({
    where: {
      clientId,
      status: ClientUserStatus.ACTIVE,
      resourceId: null,
    },
    include: {
      user: {
        select: { email: true, firstName: true, lastName: true },
      },
      defaultEmailIdentity: {
        select: { email: true, isActive: true },
      },
    },
    orderBy: { user: { email: 'asc' } },
    ...(limit != null && limit > 0 ? { take: limit } : {}),
  });

  const totals: BackfillRunResult['totals'] = {
    linked: 0,
    skipped: 0,
    ambiguous: 0,
    noCandidate: 0,
    error: 0,
  };

  const rows: BackfillCsvRow[] = [];

  for (const cu of members) {
    const memberInput = {
      clientUserId: cu.id,
      resourceId: cu.resourceId,
      userEmail: cu.user.email,
      userFirstName: cu.user.firstName,
      userLastName: cu.user.lastName,
      defaultEmailIdentityEmail:
        cu.defaultEmailIdentity?.isActive !== false
          ? (cu.defaultEmailIdentity?.email ?? null)
          : null,
    };

    let match = matchClientUserToHumanResource(memberInput, resources, {
      strategy,
      enableNameStrict,
      linkedResourceIds,
    });

    if (mode === 'apply' && match.action === 'LINKED' && match.resourceId) {
      try {
        await prisma.clientUser.update({
          where: { id: cu.id },
          data: { resourceId: match.resourceId },
        });
        linkedResourceIds.add(match.resourceId);
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          match = {
            action: 'ERROR',
            resourceId: match.resourceId,
            resourceLabel: match.resourceLabel,
            matchedBy: 'none',
            candidateCount: match.candidateCount,
            reason: 'unique_constraint_resource_already_linked',
          };
        } else {
          throw e;
        }
      }
    }

    const row = matchResultToCsvRow(memberInput, mode, match);
    rows.push(row);
    incrementTotals(totals, match.action);
  }

  const reportPath = writeHumanResourceBackfillCsv(clientId, rows);

  if (mode === 'apply') {
    await prisma.auditLog.create({
      data: {
        clientId,
        action: 'client_user.human_resource.backfill.linked',
        resourceType: 'client_user_human_backfill',
        resourceId: clientId,
        newValue: {
          mode,
          strategy,
          enableNameStrict,
          limit: limit ?? null,
          totals,
          reportPath,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return { reportPath, rows, totals };
}

export type ParsedBackfillCliArgs = {
  clientId: string;
  mode: BackfillExecutionMode;
  strategyFlag?: string;
  enableNameStrict: boolean;
  limit?: number;
};

export function parseBackfillCliArgs(argv: string[]): ParsedBackfillCliArgs {
  const map = new Map<string, string>();
  let dryRun = false;
  let apply = false;

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      map.set(a.slice(2, eq), a.slice(eq + 1));
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--apply') {
      apply = true;
    } else if (i + 1 < argv.length && !argv[i + 1]!.startsWith('--')) {
      map.set(a.slice(2), argv[i + 1]!);
      i += 1;
    } else {
      map.set(a.slice(2), 'true');
    }
  }

  const clientId = map.get('client-id');
  if (!clientId) {
    throw new Error('--client-id <id> est obligatoire');
  }

  if (dryRun && apply) {
    throw new Error('Les flags --dry-run et --apply sont mutuellement exclusifs');
  }
  if (!dryRun && !apply) {
    throw new Error(
      'Mode obligatoire : fournir exactement --dry-run (simulation) ou --apply (écriture)',
    );
  }

  const limitRaw = map.get('limit');
  const limit =
    limitRaw != null && limitRaw !== 'true' ? Number.parseInt(limitRaw, 10) : undefined;
  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    throw new Error('--limit doit être un entier positif');
  }

  return {
    clientId,
    mode: dryRun ? 'dry-run' : 'apply',
    strategyFlag: map.get('strategy'),
    enableNameStrict: map.get('enable-name-strict') === 'true',
    limit,
  };
}
