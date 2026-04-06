import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetVersionKind,
  BudgetVersionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { ListVersionSetsQueryDto } from './dto/list-version-sets.query.dto';
import { CreateRevisionDto } from './dto/create-revision.dto';
import {
  CompareVersionsResponse,
  CreateBaselineResponse,
  CreateRevisionResponse,
  VersionSetDetail,
  VersionSetListItem,
  BudgetVersionSummary,
  CompareLineDelta,
} from './types/budget-versioning.types';
import {
  compareBudgetLinesByCode,
  type BudgetLineComparableInput,
} from './helpers/budget-version-compare.helper';

export interface BudgetVersioningAuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

@Injectable()
export class BudgetVersioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listVersionSets(
    clientId: string,
    query: ListVersionSetsQueryDto,
  ): Promise<{ items: VersionSetListItem[]; total: number; limit: number; offset: number }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.BudgetVersionSetWhereInput = {
      clientId,
      ...(query.exerciseId && { exerciseId: query.exerciseId }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.budgetVersionSet.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.budgetVersionSet.count({ where }),
    ]);
    return {
      items: items.map(toVersionSetListItem),
      total,
      limit,
      offset,
    };
  }

  async getVersionSetById(
    clientId: string,
    id: string,
  ): Promise<VersionSetDetail> {
    const set = await this.prisma.budgetVersionSet.findFirst({
      where: { id, clientId },
      include: {
        baselineBudget: true,
        activeBudget: true,
        versions: {
          orderBy: { versionNumber: 'asc' },
        },
      },
    });
    if (!set) {
      throw new NotFoundException('Budget version set not found');
    }
    return {
      ...toVersionSetListItem(set),
      baseline: set.baselineBudget
        ? toBudgetVersionSummary(set.baselineBudget)
        : null,
      active: set.activeBudget
        ? toBudgetVersionSummary(set.activeBudget)
        : null,
      versions: set.versions.map(toBudgetVersionSummary),
    };
  }

  async createBaseline(
    clientId: string,
    budgetId: string,
    context?: BudgetVersioningAuditContext,
  ): Promise<CreateBaselineResponse> {
    const source = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      include: {
        envelopes: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        budgetLines: { include: { costCenterSplits: true } },
      },
    });
    if (!source) {
      throw new NotFoundException('Budget not found');
    }
    if (source.isVersioned) {
      throw new BadRequestException(
        'Budget is already versioned; use create-revision instead',
      );
    }

    const versionSetCode = source.code;
    const newBudgetCode = `${versionSetCode}-V1`;

    const result = await this.prisma.$transaction(async (tx) => {
      const versionSet = await tx.budgetVersionSet.create({
        data: {
          clientId,
          exerciseId: source.exerciseId,
          code: versionSetCode,
          name: source.name,
          description: source.description,
        },
      });

      const newBudget = await tx.budget.create({
        data: {
          clientId,
          exerciseId: source.exerciseId,
          name: source.name,
          code: newBudgetCode,
          description: source.description,
          currency: source.currency,
          status: source.status,
          ownerUserId: source.ownerUserId,
          versionSetId: versionSet.id,
          versionNumber: 1,
          versionLabel: 'V1',
          versionKind: BudgetVersionKind.BASELINE,
          versionStatus: BudgetVersionStatus.ACTIVE,
          isVersioned: true,
        },
      });

      const envelopeIdMap = new Map<string, string>();
      for (const env of source.envelopes) {
        const created = await tx.budgetEnvelope.create({
          data: {
            clientId,
            budgetId: newBudget.id,
            parentId: null,
            name: env.name,
            code: env.code,
            type: env.type,
            description: env.description,
            sortOrder: env.sortOrder,
          },
        });
        envelopeIdMap.set(env.id, created.id);
      }
      for (const env of source.envelopes) {
        if (env.parentId && envelopeIdMap.has(env.parentId)) {
          const newId = envelopeIdMap.get(env.id)!;
          await tx.budgetEnvelope.update({
            where: { id: newId },
            data: { parentId: envelopeIdMap.get(env.parentId)! },
          });
        }
      }
      for (const line of source.budgetLines) {
        const newEnvelopeId = envelopeIdMap.get(line.envelopeId);
        if (!newEnvelopeId) continue;
        await this.cloneBudgetLineWithAnalytics(
          tx,
          clientId,
          line,
          newBudget.id,
          newEnvelopeId,
        );
      }

      await tx.budgetVersionSet.update({
        where: { id: versionSet.id },
        data: {
          baselineBudgetId: newBudget.id,
          activeBudgetId: newBudget.id,
        },
      });

      return { versionSet, newBudget };
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'budget_version_set.created',
      resourceType: 'budget_version_set',
      resourceId: result.versionSet.id,
      newValue: { id: result.versionSet.id, code: result.versionSet.code },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } as CreateAuditLogInput);
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'budget_version.baseline_created',
      resourceType: 'budget',
      resourceId: result.newBudget.id,
      newValue: {
        versionSetId: result.versionSet.id,
        budgetId: result.newBudget.id,
        versionNumber: 1,
        versionKind: 'BASELINE',
        versionStatus: 'ACTIVE',
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } as CreateAuditLogInput);

    return {
      versionSetId: result.versionSet.id,
      budgetId: result.newBudget.id,
      versionNumber: 1,
      versionLabel: 'V1',
      versionKind: BudgetVersionKind.BASELINE,
      versionStatus: BudgetVersionStatus.ACTIVE,
    };
  }

  async createRevision(
    clientId: string,
    budgetId: string,
    dto?: CreateRevisionDto,
    context?: BudgetVersioningAuditContext,
  ): Promise<CreateRevisionResponse> {
    const source = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      include: {
        versionSet: true,
        envelopes: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        budgetLines: { include: { costCenterSplits: true } },
      },
    });
    if (!source) {
      throw new NotFoundException('Budget not found');
    }
    if (!source.isVersioned || !source.versionSetId || !source.versionSet) {
      throw new BadRequestException(
        'Budget must be versioned; use create-baseline first',
      );
    }
    if (source.versionStatus === BudgetVersionStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot create a revision from an archived version',
      );
    }

    const maxVersion = await this.prisma.budget.aggregate({
      where: { versionSetId: source.versionSetId },
      _max: { versionNumber: true },
    });
    const nextVersionNumber = (maxVersion._max.versionNumber ?? 0) + 1;
    const versionSetCode = source.versionSet.code;
    const newBudgetCode = `${versionSetCode}-V${nextVersionNumber}`;
    const versionLabel = dto?.label ?? `V${nextVersionNumber}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const newBudget = await tx.budget.create({
        data: {
          clientId,
          exerciseId: source.exerciseId,
          name: source.name,
          code: newBudgetCode,
          description: dto?.description ?? source.description,
          currency: source.currency,
          status: source.status,
          ownerUserId: source.ownerUserId,
          versionSetId: source.versionSetId,
          versionNumber: nextVersionNumber,
          versionLabel,
          versionKind: BudgetVersionKind.REVISION,
          versionStatus: BudgetVersionStatus.DRAFT,
          parentBudgetId: source.id,
          isVersioned: true,
        },
      });

      const envelopeIdMap = new Map<string, string>();
      for (const env of source.envelopes) {
        const created = await tx.budgetEnvelope.create({
          data: {
            clientId,
            budgetId: newBudget.id,
            parentId: null,
            name: env.name,
            code: env.code,
            type: env.type,
            description: env.description,
            sortOrder: env.sortOrder,
          },
        });
        envelopeIdMap.set(env.id, created.id);
      }
      for (const env of source.envelopes) {
        if (env.parentId && envelopeIdMap.has(env.parentId)) {
          const newId = envelopeIdMap.get(env.id)!;
          await tx.budgetEnvelope.update({
            where: { id: newId },
            data: { parentId: envelopeIdMap.get(env.parentId)! },
          });
        }
      }
      for (const line of source.budgetLines) {
        const newEnvelopeId = envelopeIdMap.get(line.envelopeId);
        if (!newEnvelopeId) continue;
        await this.cloneBudgetLineWithAnalytics(
          tx,
          clientId,
          line,
          newBudget.id,
          newEnvelopeId,
        );
      }

      return { newBudget, versionSet: source.versionSet! };
    });

    const versionSet = result.versionSet;
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'budget_version.revision_created',
      resourceType: 'budget',
      resourceId: result.newBudget.id,
      newValue: {
        versionSetId: versionSet.id,
        budgetId: result.newBudget.id,
        versionNumber: nextVersionNumber,
        versionKind: 'REVISION',
        versionStatus: 'DRAFT',
        parentBudgetId: source.id,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } as CreateAuditLogInput);

    return {
      versionSetId: versionSet.id,
      budgetId: result.newBudget.id,
      versionNumber: nextVersionNumber,
      versionLabel,
      versionKind: BudgetVersionKind.REVISION,
      versionStatus: BudgetVersionStatus.DRAFT,
      parentBudgetId: source.id,
    };
  }

  async activateVersion(
    clientId: string,
    budgetId: string,
    context?: BudgetVersioningAuditContext,
  ): Promise<{ budgetId: string; versionStatus: BudgetVersionStatus }> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      include: { versionSet: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (!budget.versionSetId || !budget.versionSet) {
      throw new BadRequestException('Budget is not part of a version set');
    }
    if (budget.versionStatus === BudgetVersionStatus.ARCHIVED) {
      throw new BadRequestException('Cannot activate an archived version');
    }
    if (budget.versionStatus === BudgetVersionStatus.ACTIVE) {
      return { budgetId: budget.id, versionStatus: BudgetVersionStatus.ACTIVE };
    }

    const previousActive = await this.prisma.budget.findFirst({
      where: {
        versionSetId: budget.versionSetId,
        versionStatus: BudgetVersionStatus.ACTIVE,
      },
    });

    const versionSetId = budget.versionSetId!;
    await this.prisma.$transaction(async (tx) => {
      if (previousActive) {
        await tx.budget.update({
          where: { id: previousActive.id },
          data: { versionStatus: BudgetVersionStatus.SUPERSEDED },
        });
      }
      await tx.budget.update({
        where: { id: budget.id },
        data: {
          versionStatus: BudgetVersionStatus.ACTIVE,
          activatedAt: new Date(),
        },
      });
      await tx.budgetVersionSet.update({
        where: { id: versionSetId },
        data: { activeBudgetId: budget.id },
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'budget_version.activated',
      resourceType: 'budget',
      resourceId: budget.id,
      newValue: {
        versionSetId: budget.versionSetId,
        budgetId: budget.id,
        versionStatus: 'ACTIVE',
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } as CreateAuditLogInput);

    return { budgetId: budget.id, versionStatus: BudgetVersionStatus.ACTIVE };
  }

  async archiveVersion(
    clientId: string,
    budgetId: string,
    context?: BudgetVersioningAuditContext,
  ): Promise<void> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
      include: { versionSet: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (!budget.versionSetId || !budget.versionSet) {
      throw new BadRequestException('Budget is not part of a version set');
    }
    if (budget.versionStatus === BudgetVersionStatus.ACTIVE) {
      throw new BadRequestException('Cannot archive the active version');
    }
    const isBaseline =
      budget.versionSet.baselineBudgetId === budget.id;
    const versionCount = await this.prisma.budget.count({
      where: { versionSetId: budget.versionSetId },
    });
    if (isBaseline && versionCount <= 1) {
      throw new BadRequestException(
        'Cannot archive the baseline when it is the only version in the set',
      );
    }
    const nonArchivedCount = await this.prisma.budget.count({
      where: {
        versionSetId: budget.versionSetId,
        versionStatus: { not: BudgetVersionStatus.ARCHIVED },
      },
    });
    if (nonArchivedCount <= 1) {
      throw new BadRequestException(
        'Cannot archive: at least one non-archived version must remain in the set',
      );
    }

    await this.prisma.budget.update({
      where: { id: budget.id },
      data: {
        versionStatus: BudgetVersionStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'budget_version.archived',
      resourceType: 'budget',
      resourceId: budget.id,
      newValue: {
        versionSetId: budget.versionSetId,
        budgetId: budget.id,
        versionStatus: 'ARCHIVED',
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } as CreateAuditLogInput);
  }

  async getVersionHistory(
    clientId: string,
    budgetId: string,
  ): Promise<BudgetVersionSummary[]> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, clientId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (!budget.versionSetId) {
      throw new BadRequestException('Budget is not versioned');
    }
    const versions = await this.prisma.budget.findMany({
      where: { versionSetId: budget.versionSetId },
      orderBy: { versionNumber: 'asc' },
    });
    return versions.map(toBudgetVersionSummary);
  }

  async compareVersions(
    clientId: string,
    sourceBudgetId: string,
    targetBudgetId: string,
  ): Promise<CompareVersionsResponse> {
    const [source, target] = await Promise.all([
      this.prisma.budget.findFirst({
        where: { id: sourceBudgetId, clientId },
        include: { budgetLines: true },
      }),
      this.prisma.budget.findFirst({
        where: { id: targetBudgetId, clientId },
        include: { budgetLines: true },
      }),
    ]);
    if (!source) {
      throw new NotFoundException('Source budget not found');
    }
    if (!target) {
      throw new NotFoundException('Target budget not found');
    }
    if (
      !source.versionSetId ||
      !target.versionSetId ||
      source.versionSetId !== target.versionSetId
    ) {
      throw new BadRequestException(
        'Both budgets must belong to the same version set',
      );
    }

    const sourceLines: BudgetLineComparableInput[] = source.budgetLines.map(
      (l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        revisedAmount: Number(l.revisedAmount),
        initialAmount: Number(l.initialAmount),
        forecastAmount: Number(l.forecastAmount),
      }),
    );
    const targetLines: BudgetLineComparableInput[] = target.budgetLines.map(
      (l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        revisedAmount: Number(l.revisedAmount),
        initialAmount: Number(l.initialAmount),
        forecastAmount: Number(l.forecastAmount),
      }),
    );

    let comparedPairs: ReturnType<typeof compareBudgetLinesByCode>;
    try {
      comparedPairs = compareBudgetLinesByCode({
        left: sourceLines,
        right: targetLines,
        includeMissing: false,
      });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const lines: CompareLineDelta[] = [];
    for (const pair of comparedPairs) {
      const s = pair.left!;
      const t = pair.right!;
      const srcRev = s.revisedAmount;
      const tgtRev = t.revisedAmount;
      const srcInit = s.initialAmount ?? 0;
      const tgtInit = t.initialAmount ?? 0;
      const srcFc = s.forecastAmount ?? 0;
      const tgtFc = t.forecastAmount ?? 0;
      lines.push({
        code: pair.lineKey,
        source: {
          revisedAmount: srcRev,
          initialAmount: srcInit,
          forecastAmount: srcFc,
        },
        target: {
          revisedAmount: tgtRev,
          initialAmount: tgtInit,
          forecastAmount: tgtFc,
        },
        delta: {
          revisedAmount: tgtRev - srcRev,
          initialAmount: tgtInit - srcInit,
          forecastAmount: tgtFc - srcFc,
        },
      });
    }
    return {
      sourceBudgetId,
      targetBudgetId,
      lines,
    };
  }

  /**
   * Clone a budget line into a new budget (baseline or revision), including
   * generalLedgerAccountId, analyticalLedgerAccountId, allocationScope and costCenterSplits.
   */
  private async cloneBudgetLineWithAnalytics(
    tx: Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    clientId: string,
    sourceLine: {
      envelopeId: string;
      code: string;
      name: string;
      description: string | null;
      expenseType: string;
      currency: string;
      generalLedgerAccountId: string | null;
      analyticalLedgerAccountId: string | null;
      allocationScope: string;
      initialAmount: Prisma.Decimal;
      revisedAmount: Prisma.Decimal;
      forecastAmount: Prisma.Decimal;
      committedAmount: Prisma.Decimal;
      consumedAmount: Prisma.Decimal;
      remainingAmount: Prisma.Decimal;
      costCenterSplits?: { costCenterId: string; percentage: Prisma.Decimal }[];
    },
    newBudgetId: string,
    newEnvelopeId: string,
  ): Promise<void> {
    const newLine = await tx.budgetLine.create({
      data: {
        clientId,
        budgetId: newBudgetId,
        envelopeId: newEnvelopeId,
        code: sourceLine.code,
        name: sourceLine.name,
        description: sourceLine.description,
        expenseType: sourceLine.expenseType as 'OPEX' | 'CAPEX',
        currency: sourceLine.currency,
        generalLedgerAccountId: sourceLine.generalLedgerAccountId,
        analyticalLedgerAccountId: sourceLine.analyticalLedgerAccountId,
        allocationScope: sourceLine.allocationScope as any,
        initialAmount: sourceLine.initialAmount,
        revisedAmount: sourceLine.revisedAmount,
        forecastAmount: sourceLine.forecastAmount,
        committedAmount: sourceLine.committedAmount,
        consumedAmount: sourceLine.consumedAmount,
        remainingAmount: sourceLine.remainingAmount,
      },
    });
    if (sourceLine.costCenterSplits?.length) {
      for (const split of sourceLine.costCenterSplits) {
        await tx.budgetLineCostCenterSplit.create({
          data: {
            clientId,
            budgetLineId: newLine.id,
            costCenterId: split.costCenterId,
            percentage: split.percentage,
          },
        });
      }
    }
  }
}

function toVersionSetListItem(
  row: Prisma.BudgetVersionSetGetPayload<object>,
): VersionSetListItem {
  return {
    id: row.id,
    clientId: row.clientId,
    exerciseId: row.exerciseId,
    code: row.code,
    name: row.name,
    description: row.description,
    baselineBudgetId: row.baselineBudgetId,
    activeBudgetId: row.activeBudgetId,
    createdAt: row.createdAt,
  };
}

function toBudgetVersionSummary(
  row: Prisma.BudgetGetPayload<object>,
): BudgetVersionSummary {
  return {
    id: row.id,
    versionNumber: row.versionNumber,
    versionLabel: row.versionLabel,
    versionKind: row.versionKind,
    versionStatus: row.versionStatus,
    parentBudgetId: row.parentBudgetId,
    activatedAt: row.activatedAt,
    archivedAt: row.archivedAt,
    code: row.code,
    name: row.name,
    status: row.status,
  };
}
