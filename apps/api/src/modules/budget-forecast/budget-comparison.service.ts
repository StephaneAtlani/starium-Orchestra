import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BudgetSnapshotsService } from '../budget-snapshots/budget-snapshots.service';
import { BudgetVersioningService } from '../budget-versioning/budget-versioning.service';
import { fromDecimal } from '../budget-management/helpers/decimal.helper';
import { BudgetComparisonMode } from './dto/compare-budget.query.dto';
import { buildBudgetComparisonResponse, toPair } from './mappers/budget-comparison.mapper';
import type {
  BudgetComparisonResponse,
  ComparisonLineAmounts,
} from './types/budget-forecast.types';
import {
  compareBudgetLinesByCode,
  type BudgetLineComparableInput,
} from '../budget-versioning/helpers/budget-version-compare.helper';

const MULTI_CURRENCY_MESSAGE =
  'Le reporting ne supporte pas plusieurs devises dans le même périmètre. Toutes les lignes doivent être libellées dans la même devise.';

@Injectable()
export class BudgetComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly snapshotsService: BudgetSnapshotsService,
    private readonly versioningService: BudgetVersioningService,
  ) {}

  async compareBudget(
    clientId: string,
    budgetId: string,
    compareTo: BudgetComparisonMode,
    targetId: string | undefined,
    actorUserId?: string,
  ): Promise<BudgetComparisonResponse> {
    const leftBudget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      include: { budgetLines: true, versionSet: true },
    });
    if (!leftBudget) {
      throw new NotFoundException('Budget not found');
    }

    if (compareTo === BudgetComparisonMode.BASELINE) {
      if (targetId) {
        throw new BadRequestException(
          'targetId is forbidden when compareTo=baseline',
        );
      }
      if (!leftBudget.isVersioned) {
        throw new BadRequestException('Budget is not versioned');
      }
      if (!leftBudget.versionSetId) {
        throw new BadRequestException('Budget has no version set');
      }
      const baselineBudgetId = leftBudget.versionSet?.baselineBudgetId;
      if (!baselineBudgetId) {
        throw new BadRequestException('Baseline budget is missing');
      }
      const rightBudget = await this.prisma.budget.findFirst({
        where: { id: baselineBudgetId, clientId },
        include: { budgetLines: true },
      });
      if (!rightBudget) {
        throw new NotFoundException('Baseline budget not found');
      }

      const response = this.buildLiveVsBudgetComparison({
        compareTo,
        leftBudgetId: leftBudget.id,
        rightBudgetId: rightBudget.id,
        leftLabel: leftBudget.name,
        rightLabel: rightBudget.name,
        leftLines: this.toComparableBudgetLines(leftBudget.budgetLines),
        rightLines: this.toComparableBudgetLines(rightBudget.budgetLines),
        leftCurrency: leftBudget.currency,
        rightCurrency: rightBudget.currency,
      });
      await this.writeComparisonAudit(clientId, actorUserId, 'budget', budgetId);
      return response;
    }

    if (compareTo === BudgetComparisonMode.SNAPSHOT) {
      if (!targetId) {
        throw new BadRequestException(
          'targetId is required when compareTo=snapshot',
        );
      }
      const snapshot = await this.prisma.budgetSnapshot.findFirst({
        where: { id: targetId, clientId },
        include: { lines: true },
      });
      if (!snapshot) {
        throw new NotFoundException('Budget snapshot not found');
      }
      if (snapshot.budgetId !== budgetId) {
        throw new BadRequestException(
          'Snapshot budgetId does not match requested budgetId',
        );
      }

      const response = this.buildLiveVsSnapshotComparison({
        compareTo,
        budgetId: leftBudget.id,
        snapshotId: snapshot.id,
        leftLabel: leftBudget.name,
        rightLabel: this.snapshotComparisonLabel(snapshot),
        leftLines: this.toComparableBudgetLines(leftBudget.budgetLines),
        rightLines: snapshot.lines.map((line) => ({
          id: line.budgetLineId,
          code: line.lineCode,
          name: line.lineName,
          budgetAmount: fromDecimal(line.initialAmount),
          forecastAmount: fromDecimal(line.forecastAmount),
          committedAmount: fromDecimal(line.committedAmount),
          consumedAmount: fromDecimal(line.consumedAmount),
        })),
        leftCurrency: leftBudget.currency,
        rightCurrency: snapshot.budgetCurrency,
      });
      await this.writeComparisonAudit(clientId, actorUserId, 'budget', budgetId);
      return response;
    }

    if (!targetId) {
      throw new BadRequestException('targetId is required when compareTo=version');
    }
    if (targetId === budgetId) {
      throw new BadRequestException('targetId must reference another budget version');
    }

    const rightBudget = await this.prisma.budget.findFirst({
      where: { id: targetId, clientId },
      include: { budgetLines: true },
    });
    if (!rightBudget) {
      throw new NotFoundException('Target budget not found');
    }
    if (
      !leftBudget.versionSetId ||
      !rightBudget.versionSetId ||
      leftBudget.versionSetId !== rightBudget.versionSetId
    ) {
      throw new BadRequestException(
        'Both budgets must belong to the same version set',
      );
    }

    const response = this.buildLiveVsBudgetComparison({
      compareTo,
      leftBudgetId: leftBudget.id,
      rightBudgetId: rightBudget.id,
      leftLabel: leftBudget.name,
      rightLabel: rightBudget.name,
      leftLines: this.toComparableBudgetLines(leftBudget.budgetLines),
      rightLines: this.toComparableBudgetLines(rightBudget.budgetLines),
      leftCurrency: leftBudget.currency,
      rightCurrency: rightBudget.currency,
    });
    await this.writeComparisonAudit(clientId, actorUserId, 'budget', budgetId);
    return response;
  }

  async compareSnapshots(
    clientId: string,
    leftId: string,
    rightId: string,
    actorUserId?: string,
  ): Promise<BudgetComparisonResponse> {
    // Keep existing domain validations in one place.
    await this.snapshotsService.compare(clientId, leftId, rightId);

    const [leftSnapshot, rightSnapshot] = await Promise.all([
      this.prisma.budgetSnapshot.findFirst({
        where: { id: leftId, clientId },
        include: { lines: true },
      }),
      this.prisma.budgetSnapshot.findFirst({
        where: { id: rightId, clientId },
        include: { lines: true },
      }),
    ]);
    if (!leftSnapshot || !rightSnapshot) {
      throw new NotFoundException('Budget snapshot not found');
    }

    this.assertSingleCurrency([
      leftSnapshot.budgetCurrency,
      rightSnapshot.budgetCurrency,
    ]);
    const comparedPairs = this.compareComparableLines({
      left: leftSnapshot.lines.map((line) => ({
        id: line.budgetLineId,
        code: line.lineCode,
        name: line.lineName,
        budgetAmount: fromDecimal(line.initialAmount),
        forecastAmount: fromDecimal(line.forecastAmount),
        committedAmount: fromDecimal(line.committedAmount),
        consumedAmount: fromDecimal(line.consumedAmount),
      })),
      right: rightSnapshot.lines.map((line) => ({
        id: line.budgetLineId,
        code: line.lineCode,
        name: line.lineName,
        budgetAmount: fromDecimal(line.initialAmount),
        forecastAmount: fromDecimal(line.forecastAmount),
        committedAmount: fromDecimal(line.committedAmount),
        consumedAmount: fromDecimal(line.consumedAmount),
      })),
      liveSide: null,
    });

    const response = buildBudgetComparisonResponse({
      leftSnapshotId: leftId,
      rightSnapshotId: rightId,
      budgetId: leftSnapshot.budgetId,
      currency: rightSnapshot.budgetCurrency,
      leftLabel: this.snapshotComparisonLabel(leftSnapshot),
      rightLabel: this.snapshotComparisonLabel(rightSnapshot),
      pairs: comparedPairs,
      liveSide: null,
    });
    await this.writeComparisonAudit(clientId, actorUserId, 'budget_snapshot', leftId);
    return response;
  }

  async compareVersions(
    clientId: string,
    leftId: string,
    rightId: string,
    actorUserId?: string,
  ): Promise<BudgetComparisonResponse> {
    // Reuse existing versioning validation path.
    await this.versioningService.compareVersions(clientId, leftId, rightId);

    const [leftBudget, rightBudget] = await Promise.all([
      this.prisma.budget.findFirst({
        where: { id: leftId, clientId },
        include: { budgetLines: true },
      }),
      this.prisma.budget.findFirst({
        where: { id: rightId, clientId },
        include: { budgetLines: true },
      }),
    ]);
    if (!leftBudget || !rightBudget) {
      throw new NotFoundException('Budget not found');
    }

    this.assertSingleCurrency([leftBudget.currency, rightBudget.currency]);
    const comparedPairs = this.compareComparableLines({
      left: this.toComparableBudgetLines(leftBudget.budgetLines),
      right: this.toComparableBudgetLines(rightBudget.budgetLines),
      liveSide: null,
    });

    const response = buildBudgetComparisonResponse({
      left: { kind: 'version', budgetId: leftBudget.id },
      right: { kind: 'version', budgetId: rightBudget.id },
      budgetId: rightBudget.id,
      currency: rightBudget.currency,
      leftLabel: leftBudget.name,
      rightLabel: rightBudget.name,
      pairs: comparedPairs,
      liveSide: null,
    });
    await this.writeComparisonAudit(clientId, actorUserId, 'budget_version', leftId);
    return response;
  }

  private buildLiveVsBudgetComparison(params: {
    compareTo: BudgetComparisonMode;
    leftBudgetId: string;
    rightBudgetId: string;
    leftLabel: string;
    rightLabel: string;
    leftLines: BudgetLineComparableInput[];
    rightLines: BudgetLineComparableInput[];
    leftCurrency: string;
    rightCurrency: string;
  }): BudgetComparisonResponse {
    this.assertSingleCurrency([params.leftCurrency, params.rightCurrency]);
    const comparedPairs = this.compareComparableLines({
      left: params.leftLines,
      right: params.rightLines,
      liveSide: 'left',
    });
    return buildBudgetComparisonResponse({
      compareTo: params.compareTo,
      leftLabel: params.leftLabel,
      rightLabel: params.rightLabel,
      left: { kind: 'live', budgetId: params.leftBudgetId },
      right: {
        kind: params.compareTo === BudgetComparisonMode.BASELINE ? 'baseline' : 'version',
        budgetId: params.rightBudgetId,
      },
      budgetId: params.leftBudgetId,
      currency: params.rightCurrency,
      pairs: comparedPairs,
      liveSide: 'left',
    });
  }

  private buildLiveVsSnapshotComparison(params: {
    compareTo: BudgetComparisonMode;
    budgetId: string;
    snapshotId: string;
    leftLabel: string;
    rightLabel: string;
    leftLines: BudgetLineComparableInput[];
    rightLines: BudgetLineComparableInput[];
    leftCurrency: string;
    rightCurrency: string;
  }): BudgetComparisonResponse {
    this.assertSingleCurrency([params.leftCurrency, params.rightCurrency]);
    const comparedPairs = this.compareComparableLines({
      left: params.leftLines,
      right: params.rightLines,
      liveSide: 'left',
    });
    return buildBudgetComparisonResponse({
      compareTo: params.compareTo,
      leftLabel: params.leftLabel,
      rightLabel: params.rightLabel,
      left: { kind: 'live', budgetId: params.budgetId },
      right: { kind: 'snapshot', snapshotId: params.snapshotId },
      budgetId: params.budgetId,
      currency: params.rightCurrency,
      pairs: comparedPairs,
      liveSide: 'left',
    });
  }

  /** Libellé colonne pour un snapshot (nom ; sinon code + date comme l’UI liste). */
  private snapshotComparisonLabel(snapshot: {
    name?: string | null;
    code?: string | null;
    snapshotDate?: Date | null;
  }): string {
    const name = snapshot.name?.trim();
    if (name) {
      return name;
    }
    const code = snapshot.code?.trim() || 'Snapshot';
    const d = snapshot.snapshotDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      return `${code} — ${dateStr}`;
    }
    return code;
  }

  private compareComparableLines(params: {
    left: BudgetLineComparableInput[];
    right: BudgetLineComparableInput[];
    liveSide: 'left' | 'right' | null;
  }) {
    let pairs: ReturnType<typeof compareBudgetLinesByCode>;
    try {
      pairs = compareBudgetLinesByCode({
        left: params.left,
        right: params.right,
        includeMissing: true,
      });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    return pairs.map((pair) => {
      const left = this.pickComparisonAmounts(pair.left);
      const right = this.pickComparisonAmounts(pair.right);
      const liveLineId =
        params.liveSide === 'left'
          ? pair.left?.id ?? null
          : params.liveSide === 'right'
            ? pair.right?.id ?? null
            : null;
      return toPair({
        lineKey: pair.lineKey,
        name: pair.left?.name ?? pair.right?.name ?? '',
        left,
        right,
        liveLineId,
      });
    });
  }

  private pickComparisonAmounts(
    line: BudgetLineComparableInput | null,
  ): ComparisonLineAmounts | null {
    if (!line) return null;
    return {
      budgetAmount: line.budgetAmount,
      forecastAmount: line.forecastAmount ?? 0,
      committedAmount: line.committedAmount ?? 0,
      consumedAmount: line.consumedAmount ?? 0,
    };
  }

  private toComparableBudgetLines(
    lines: Array<{
      id: string;
      code: string;
      name: string;
      initialAmount: unknown;
      forecastAmount: unknown;
      committedAmount?: unknown;
      consumedAmount: unknown;
    }>,
  ): BudgetLineComparableInput[] {
    return lines.map((line) => ({
      id: line.id,
      code: line.code,
      name: line.name,
      budgetAmount: fromDecimal(
        line.initialAmount as Parameters<typeof fromDecimal>[0],
      ),
      forecastAmount: fromDecimal(
        line.forecastAmount as Parameters<typeof fromDecimal>[0],
      ),
      committedAmount: fromDecimal(
        line.committedAmount as Parameters<typeof fromDecimal>[0],
      ),
      consumedAmount: fromDecimal(
        line.consumedAmount as Parameters<typeof fromDecimal>[0],
      ),
    }));
  }

  private assertSingleCurrency(currencies: Array<string | null | undefined>) {
    const unique = [...new Set(currencies.filter(Boolean))];
    if (unique.length > 1) {
      throw new BadRequestException(MULTI_CURRENCY_MESSAGE);
    }
  }

  private async writeComparisonAudit(
    clientId: string,
    actorUserId: string | undefined,
    resourceType: string,
    resourceId: string,
  ) {
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'budget.comparison.viewed',
      resourceType,
      resourceId,
    });
  }
}
