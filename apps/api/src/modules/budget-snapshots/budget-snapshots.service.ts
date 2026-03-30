import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetSnapshotStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { CreateBudgetSnapshotDto } from './dto/create-budget-snapshot.dto';
import { QueryBudgetSnapshotsDto } from './dto/query-budget-snapshots.dto';
import { randomBytes } from 'crypto';

const SNAP_CODE_SUFFIX_BYTES = 3; // 6 hex chars
const MAX_CODE_RETRIES = 5;

function toNum(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return Number(d);
}

function formatSnapshotDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function generateSnapshotCode(snapshotDate: Date): string {
  const suffix = randomBytes(SNAP_CODE_SUFFIX_BYTES).toString('hex');
  return `SNAP-${formatSnapshotDate(snapshotDate)}-${suffix}`;
}

export interface SnapshotAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

export interface BudgetSnapshotSummary {
  id: string;
  budgetId: string;
  exerciseId?: string;
  name: string;
  code: string;
  description: string | null;
  snapshotDate: string;
  status: BudgetSnapshotStatus;
  budgetName: string;
  budgetCode: string | null;
  budgetCurrency: string;
  budgetStatus: string;
  totalInitialAmount: number;
  totalRevisedAmount: number;
  totalForecastAmount: number;
  totalCommittedAmount: number;
  totalConsumedAmount: number;
  totalRemainingAmount: number;
  createdByUserId: string | null;
  createdByLabel: string | null;
  createdAt: string;
}

export interface BudgetSnapshotDetail extends BudgetSnapshotSummary {
  totals: {
    initialAmount: number;
    revisedAmount: number;
    forecastAmount: number;
    committedAmount: number;
    consumedAmount: number;
    remainingAmount: number;
  };
  lines: BudgetSnapshotLineResponse[];
}

export interface BudgetSnapshotLineResponse {
  id: string;
  budgetLineId: string;
  envelopeName: string | null;
  lineCode: string;
  lineName: string;
  expenseType: string;
  currency: string;
  lineStatus: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

export interface ListSnapshotsResult {
  items: BudgetSnapshotSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SnapshotCompareLineAmounts {
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

export interface SnapshotCompareLineDiff {
  budgetLineId: string;
  lineCode: string;
  lineName: string;
  left: SnapshotCompareLineAmounts;
  right: SnapshotCompareLineAmounts;
  diff: SnapshotCompareLineAmounts;
}

export interface SnapshotCompareResult {
  leftSnapshot: { id: string; name: string; snapshotDate: string };
  rightSnapshot: { id: string; name: string; snapshotDate: string };
  totalsDiff: SnapshotCompareLineAmounts;
  lineDiffs: SnapshotCompareLineDiff[];
}

const zeroAmounts: SnapshotCompareLineAmounts = {
  initialAmount: 0,
  revisedAmount: 0,
  forecastAmount: 0,
  committedAmount: 0,
  consumedAmount: 0,
  remainingAmount: 0,
};

function lineToAmounts(line: {
  initialAmount?: Prisma.Decimal;
  revisedAmount: Prisma.Decimal;
  forecastAmount: Prisma.Decimal;
  committedAmount: Prisma.Decimal;
  consumedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
}): SnapshotCompareLineAmounts {
  return {
    initialAmount: toNum(line.initialAmount),
    revisedAmount: toNum(line.revisedAmount),
    forecastAmount: toNum(line.forecastAmount),
    committedAmount: toNum(line.committedAmount),
    consumedAmount: toNum(line.consumedAmount),
    remainingAmount: toNum(line.remainingAmount),
  };
}

function diffAmounts(
  left: SnapshotCompareLineAmounts,
  right: SnapshotCompareLineAmounts,
): SnapshotCompareLineAmounts {
  return {
    initialAmount: right.initialAmount - left.initialAmount,
    revisedAmount: right.revisedAmount - left.revisedAmount,
    forecastAmount: right.forecastAmount - left.forecastAmount,
    committedAmount: right.committedAmount - left.committedAmount,
    consumedAmount: right.consumedAmount - left.consumedAmount,
    remainingAmount: right.remainingAmount - left.remainingAmount,
  };
}

@Injectable()
export class BudgetSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(
    clientId: string,
    dto: CreateBudgetSnapshotDto,
    context?: SnapshotAuditContext,
  ): Promise<BudgetSnapshotSummary> {
    const resolvedName = (dto.name ?? dto.label ?? '').trim();
    if (!resolvedName) {
      throw new BadRequestException(
        'Either "name" or "label" is required to create a budget snapshot',
      );
    }

    const budget = await this.prisma.budget.findFirst({
      where: { id: dto.budgetId, clientId },
      include: { exercise: true },
    });
    if (!budget) {
      throw new NotFoundException(
        'Budget not found or does not belong to this client',
      );
    }
    if (budget.exercise.clientId !== clientId) {
      throw new BadRequestException(
        'Budget exercise does not belong to this client',
      );
    }

    const lines = await this.prisma.budgetLine.findMany({
      where: { budgetId: budget.id, clientId },
      include: { envelope: true },
    });

    const snapshotDate = dto.snapshotDate
      ? new Date(dto.snapshotDate)
      : new Date();

    const totalInitial = lines.reduce((s, l) => s + toNum(l.initialAmount), 0);
    const totalRevised = lines.reduce((s, l) => s + toNum(l.revisedAmount), 0);
    const totalForecast = lines.reduce((s, l) => s + toNum(l.forecastAmount), 0);
    const totalCommitted = lines.reduce(
      (s, l) => s + toNum(l.committedAmount),
      0,
    );
    const totalConsumed = lines.reduce(
      (s, l) => s + toNum(l.consumedAmount),
      0,
    );
    const totalRemaining = lines.reduce(
      (s, l) => s + toNum(l.remainingAmount),
      0,
    );

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = generateSnapshotCode(snapshotDate);
      try {
        const snapshot = await this.prisma.$transaction(async (tx) => {
          const snap = await tx.budgetSnapshot.create({
            data: {
              clientId,
              budgetId: budget.id,
              exerciseId: budget.exerciseId,
              name: resolvedName,
              code,
              description: dto.description ?? null,
              snapshotDate,
              status: BudgetSnapshotStatus.ACTIVE,
              budgetName: budget.name,
              budgetCode: budget.code,
              budgetCurrency: budget.currency,
              budgetStatus: budget.status,
              totalInitialAmount: new Prisma.Decimal(totalInitial),
              totalRevisedAmount: new Prisma.Decimal(totalRevised),
              totalForecastAmount: new Prisma.Decimal(totalForecast),
              totalCommittedAmount: new Prisma.Decimal(totalCommitted),
              totalConsumedAmount: new Prisma.Decimal(totalConsumed),
              totalRemainingAmount: new Prisma.Decimal(totalRemaining),
              createdByUserId: context?.actorUserId ?? null,
            },
          });
          await tx.budgetSnapshotLine.createMany({
            data: lines.map((line) => ({
              snapshotId: snap.id,
              clientId,
              budgetLineId: line.id,
              budgetId: line.budgetId,
              envelopeId: line.envelopeId,
              envelopeName: line.envelope.name,
              envelopeCode: line.envelope.code,
              envelopeType: line.envelope.type,
              lineCode: line.code,
              lineName: line.name,
              expenseType: line.expenseType,
              currency: line.currency,
              lineStatus: line.status,
              initialAmount: line.initialAmount,
              revisedAmount: line.revisedAmount,
              forecastAmount: line.forecastAmount,
              committedAmount: line.committedAmount,
              consumedAmount: line.consumedAmount,
              remainingAmount: line.remainingAmount,
            })),
          });
          return snap;
        });

        const auditInput: CreateAuditLogInput = {
          clientId,
          userId: context?.actorUserId,
          action: 'budget_snapshot.created',
          resourceType: 'budget_snapshot',
          resourceId: snapshot.id,
          newValue: {
            budgetId: snapshot.budgetId,
            snapshotDate: snapshot.snapshotDate.toISOString(),
            name: resolvedName,
            code: snapshot.code,
            linesCount: lines.length,
            totalInitialAmount: totalInitial,
            totalRevisedAmount: totalRevised,
            totalForecastAmount: totalForecast,
            totalCommittedAmount: totalCommitted,
            totalConsumedAmount: totalConsumed,
            totalRemainingAmount: totalRemaining,
          },
          ipAddress: context?.meta?.ipAddress,
          userAgent: context?.meta?.userAgent,
          requestId: context?.meta?.requestId,
        };
        await this.auditLogs.create(auditInput);

        return toSummary(snapshot);
      } catch (err: unknown) {
        lastError = err;
        const isP2002 =
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'P2002';
        if (!isP2002) throw err;
      }
    }
    throw new ConflictException(
      'Could not generate unique snapshot code after retries',
      { cause: lastError },
    );
  }

  async list(
    clientId: string,
    query: QueryBudgetSnapshotsDto,
  ): Promise<ListSnapshotsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.BudgetSnapshotWhereInput = {
      clientId,
      ...(query.budgetId && { budgetId: query.budgetId }),
    };
    const [items, total] = await Promise.all([
      this.prisma.budgetSnapshot.findMany({
        where,
        orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          createdByUser: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.budgetSnapshot.count({ where }),
    ]);
    return {
      items: items.map(toSummary),
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
    context?: SnapshotAuditContext,
  ): Promise<BudgetSnapshotDetail> {
    const snapshot = await this.prisma.budgetSnapshot.findFirst({
      where: { id, clientId },
      include: {
        lines: true,
        createdByUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!snapshot) {
      throw new NotFoundException('Budget snapshot not found');
    }
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'budget_snapshot.viewed',
      resourceType: 'budget_snapshot',
      resourceId: snapshot.id,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return toDetail(snapshot);
  }

  async compare(
    clientId: string,
    leftSnapshotId: string,
    rightSnapshotId: string,
  ): Promise<SnapshotCompareResult> {
    const [leftSnapshot, rightSnapshot] = await Promise.all([
      this.prisma.budgetSnapshot.findFirst({
        where: { id: leftSnapshotId, clientId },
        include: { lines: true },
      }),
      this.prisma.budgetSnapshot.findFirst({
        where: { id: rightSnapshotId, clientId },
        include: { lines: true },
      }),
    ]);
    if (!leftSnapshot) {
      throw new NotFoundException(
        `Snapshot "${leftSnapshotId}" not found or does not belong to this client`,
      );
    }
    if (!rightSnapshot) {
      throw new NotFoundException(
        `Snapshot "${rightSnapshotId}" not found or does not belong to this client`,
      );
    }
    if (leftSnapshot.budgetId !== rightSnapshot.budgetId) {
      throw new BadRequestException(
        'Cannot compare snapshots from different budgets',
      );
    }

    const leftByLineId = new Map(leftSnapshot.lines.map((l) => [l.budgetLineId, l]));
    const rightByLineId = new Map(
      rightSnapshot.lines.map((l) => [l.budgetLineId, l]),
    );
    const allLineIds = new Set([
      ...leftByLineId.keys(),
      ...rightByLineId.keys(),
    ]);

    const lineDiffs: SnapshotCompareLineDiff[] = [];
    for (const budgetLineId of allLineIds) {
      const leftLine = leftByLineId.get(budgetLineId);
      const rightLine = rightByLineId.get(budgetLineId);
      const leftAmounts = leftLine ? lineToAmounts(leftLine) : zeroAmounts;
      const rightAmounts = rightLine ? lineToAmounts(rightLine) : zeroAmounts;
      const lineCode = (rightLine ?? leftLine)?.lineCode ?? '';
      const lineName = (rightLine ?? leftLine)?.lineName ?? '';
      lineDiffs.push({
        budgetLineId,
        lineCode,
        lineName,
        left: leftAmounts,
        right: rightAmounts,
        diff: diffAmounts(leftAmounts, rightAmounts),
      });
    }

    const leftTotals = lineToAmounts({
      initialAmount: leftSnapshot.totalInitialAmount,
      revisedAmount: leftSnapshot.totalRevisedAmount,
      forecastAmount: leftSnapshot.totalForecastAmount,
      committedAmount: leftSnapshot.totalCommittedAmount,
      consumedAmount: leftSnapshot.totalConsumedAmount,
      remainingAmount: leftSnapshot.totalRemainingAmount,
    });
    const rightTotals = lineToAmounts({
      initialAmount: rightSnapshot.totalInitialAmount,
      revisedAmount: rightSnapshot.totalRevisedAmount,
      forecastAmount: rightSnapshot.totalForecastAmount,
      committedAmount: rightSnapshot.totalCommittedAmount,
      consumedAmount: rightSnapshot.totalConsumedAmount,
      remainingAmount: rightSnapshot.totalRemainingAmount,
    });

    return {
      leftSnapshot: {
        id: leftSnapshot.id,
        name: leftSnapshot.name,
        snapshotDate: leftSnapshot.snapshotDate.toISOString(),
      },
      rightSnapshot: {
        id: rightSnapshot.id,
        name: rightSnapshot.name,
        snapshotDate: rightSnapshot.snapshotDate.toISOString(),
      },
      totalsDiff: diffAmounts(leftTotals, rightTotals),
      lineDiffs,
    };
  }
}

function toSummary(
  row: Prisma.BudgetSnapshotGetPayload<{
    include?: {
      createdByUser?: {
        select: { firstName: true; lastName: true; email: true };
      };
    };
  }>,
): BudgetSnapshotSummary {
  return {
    id: row.id,
    budgetId: row.budgetId,
    exerciseId: row.exerciseId,
    name: row.name,
    code: row.code,
    description: row.description,
    snapshotDate: row.snapshotDate.toISOString(),
    status: row.status,
    budgetName: row.budgetName,
    budgetCode: row.budgetCode,
    budgetCurrency: row.budgetCurrency,
    budgetStatus: row.budgetStatus,
    totalInitialAmount: toNum(row.totalInitialAmount),
    totalRevisedAmount: toNum(row.totalRevisedAmount),
    totalForecastAmount: toNum(row.totalForecastAmount),
    totalCommittedAmount: toNum(row.totalCommittedAmount),
    totalConsumedAmount: toNum(row.totalConsumedAmount),
    totalRemainingAmount: toNum(row.totalRemainingAmount),
    createdByUserId: row.createdByUserId,
    createdByLabel: resolveCreatedByLabel(row.createdByUser),
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetail(
  row: Prisma.BudgetSnapshotGetPayload<{
    include: {
      lines: true;
      createdByUser: { select: { firstName: true; lastName: true; email: true } };
    };
  }>,
): BudgetSnapshotDetail {
  const summary = toSummary(row);
  return {
    ...summary,
    totals: {
      initialAmount: toNum(row.totalInitialAmount),
      revisedAmount: toNum(row.totalRevisedAmount),
      forecastAmount: toNum(row.totalForecastAmount),
      committedAmount: toNum(row.totalCommittedAmount),
      consumedAmount: toNum(row.totalConsumedAmount),
      remainingAmount: toNum(row.totalRemainingAmount),
    },
    lines: row.lines.map((l) => ({
      id: l.id,
      budgetLineId: l.budgetLineId,
      envelopeName: l.envelopeName,
      lineCode: l.lineCode,
      lineName: l.lineName,
      expenseType: l.expenseType,
      currency: l.currency,
      lineStatus: l.lineStatus,
      initialAmount: toNum(l.initialAmount),
      revisedAmount: toNum(l.revisedAmount),
      forecastAmount: toNum(l.forecastAmount),
      committedAmount: toNum(l.committedAmount),
      consumedAmount: toNum(l.consumedAmount),
      remainingAmount: toNum(l.remainingAmount),
    })),
  };
}

function resolveCreatedByLabel(
  createdByUser:
    | {
        firstName: string | null;
        lastName: string | null;
        email: string;
      }
    | null
    | undefined,
): string | null {
  if (!createdByUser) return null;
  const fullName = [createdByUser.firstName, createdByUser.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) return fullName;
  return createdByUser.email || null;
}
