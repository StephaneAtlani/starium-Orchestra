import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectBudgetAllocationType,
  ProjectScenarioStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { CreateProjectScenarioFinancialLineDto } from './dto/create-project-scenario-financial-line.dto';
import { ListProjectScenarioFinancialLinesQueryDto } from './dto/list-project-scenario-financial-lines.query.dto';
import { UpdateProjectScenarioFinancialLineDto } from './dto/update-project-scenario-financial-line.dto';

type BudgetLineLabelDto = {
  id: string;
  code: string;
  name: string;
};

export type ProjectScenarioFinancialLineDto = {
  id: string;
  clientId: string;
  scenarioId: string;
  projectBudgetLinkId: string | null;
  budgetLineId: string | null;
  label: string;
  costCategory: string | null;
  amountPlanned: string;
  amountForecast: string | null;
  amountActual: string | null;
  currencyCode: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  budgetLine: BudgetLineLabelDto | null;
  projectBudgetLink: {
    id: string;
    allocationType: ProjectBudgetAllocationType;
    percentage: string | null;
    amount: string | null;
    budgetLine: BudgetLineLabelDto;
  } | null;
};

export type ProjectScenarioFinancialSummaryDto = {
  plannedTotal: string;
  forecastTotal: string;
  actualTotal: string;
  varianceVsBaseline: string | null;
  varianceVsActual: string;
  budgetCoverageRate: number | null;
};

type FinancialLineRecord = Prisma.ProjectScenarioFinancialLineGetPayload<{
  include: {
    budgetLine: {
      select: { id: true; code: true; name: true; initialAmount: true };
    };
    projectBudgetLink: {
      include: {
        budgetLine: {
          select: { id: true; code: true; name: true; initialAmount: true };
        };
      };
    };
  };
}>;

@Injectable()
export class ProjectScenarioFinancialLinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    scenarioId: string,
    query: ListProjectScenarioFinancialLinesQueryDto,
  ): Promise<{
    items: ProjectScenarioFinancialLineDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);

    const where: Prisma.ProjectScenarioFinancialLineWhereInput = {
      clientId,
      scenarioId,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectScenarioFinancialLine.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          budgetLine: {
            select: { id: true, code: true, name: true, initialAmount: true },
          },
          projectBudgetLink: {
            include: {
              budgetLine: {
                select: { id: true, code: true, name: true, initialAmount: true },
              },
            },
          },
        },
      }),
      this.prisma.projectScenarioFinancialLine.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serializeLine(item)),
      total,
      limit,
      offset,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: CreateProjectScenarioFinancialLineDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioFinancialLineDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);

    const relations = await this.resolveRelations(
      clientId,
      projectId,
      dto.projectBudgetLinkId,
      dto.budgetLineId,
    );

    const planned = this.parseNonNegativeDecimal(dto.amountPlanned, 'amountPlanned');
    const forecast =
      dto.amountForecast === undefined || dto.amountForecast === null
        ? null
        : this.parseNonNegativeDecimal(dto.amountForecast, 'amountForecast');
    const actual =
      dto.amountActual === undefined || dto.amountActual === null
        ? null
        : this.parseNonNegativeDecimal(dto.amountActual, 'amountActual');

    this.assertDateRange(dto.startDate ?? null, dto.endDate ?? null);

    const created = await this.prisma.projectScenarioFinancialLine.create({
      data: {
        clientId,
        scenarioId: scenario.id,
        projectBudgetLinkId: relations.projectBudgetLink?.id ?? null,
        budgetLineId: relations.budgetLine?.id ?? null,
        label: dto.label.trim(),
        costCategory: this.normalizeNullableText(dto.costCategory),
        amountPlanned: planned,
        amountForecast: forecast,
        amountActual: actual,
        currencyCode: this.normalizeCurrencyCode(dto.currencyCode),
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        notes: this.normalizeNullableText(dto.notes),
      },
      include: {
        budgetLine: {
          select: { id: true, code: true, name: true, initialAmount: true },
        },
        projectBudgetLink: {
          include: {
            budgetLine: {
              select: { id: true, code: true, name: true, initialAmount: true },
            },
          },
        },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_FINANCIAL_LINE_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_FINANCIAL_LINE,
      resourceId: created.id,
      newValue: this.auditPayload(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.serializeLine(created);
  }

  async update(
    clientId: string,
    projectId: string,
    scenarioId: string,
    lineId: string,
    dto: UpdateProjectScenarioFinancialLineDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioFinancialLineDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);
    const existing = await this.getLineForScope(clientId, scenarioId, lineId);

    const nextProjectBudgetLinkId =
      dto.projectBudgetLinkId === undefined
        ? existing.projectBudgetLinkId
        : dto.projectBudgetLinkId;
    const nextBudgetLineId =
      dto.budgetLineId === undefined ? existing.budgetLineId : dto.budgetLineId;

    const relations = await this.resolveRelations(
      clientId,
      projectId,
      nextProjectBudgetLinkId,
      nextBudgetLineId,
    );

    const nextStartDate =
      dto.startDate === undefined ? existing.startDate : dto.startDate;
    const nextEndDate = dto.endDate === undefined ? existing.endDate : dto.endDate;
    this.assertDateRange(nextStartDate ?? null, nextEndDate ?? null);

    const updated = await this.prisma.projectScenarioFinancialLine.update({
      where: { id: existing.id },
      data: {
        ...(dto.projectBudgetLinkId !== undefined
          ? { projectBudgetLinkId: relations.projectBudgetLink?.id ?? null }
          : {}),
        ...(dto.budgetLineId !== undefined
          ? { budgetLineId: relations.budgetLine?.id ?? null }
          : {}),
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.costCategory !== undefined
          ? { costCategory: this.normalizeNullableText(dto.costCategory) }
          : {}),
        ...(dto.amountPlanned !== undefined
          ? {
              amountPlanned: this.parseNonNegativeDecimal(
                dto.amountPlanned,
                'amountPlanned',
              ),
            }
          : {}),
        ...(dto.amountForecast !== undefined
          ? {
              amountForecast:
                dto.amountForecast === null
                  ? null
                  : this.parseNonNegativeDecimal(dto.amountForecast, 'amountForecast'),
            }
          : {}),
        ...(dto.amountActual !== undefined
          ? {
              amountActual:
                dto.amountActual === null
                  ? null
                  : this.parseNonNegativeDecimal(dto.amountActual, 'amountActual'),
            }
          : {}),
        ...(dto.currencyCode !== undefined
          ? { currencyCode: this.normalizeCurrencyCode(dto.currencyCode) }
          : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ?? null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ?? null } : {}),
        ...(dto.notes !== undefined ? { notes: this.normalizeNullableText(dto.notes) } : {}),
      },
      include: {
        budgetLine: {
          select: { id: true, code: true, name: true, initialAmount: true },
        },
        projectBudgetLink: {
          include: {
            budgetLine: {
              select: { id: true, code: true, name: true, initialAmount: true },
            },
          },
        },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_FINANCIAL_LINE_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_FINANCIAL_LINE,
      resourceId: updated.id,
      oldValue: this.auditPayload(existing),
      newValue: this.auditPayload(updated),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.serializeLine(updated);
  }

  async remove(
    clientId: string,
    projectId: string,
    scenarioId: string,
    lineId: string,
    context?: AuditContext,
  ): Promise<void> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);
    const existing = await this.getLineForScope(clientId, scenarioId, lineId);

    await this.prisma.projectScenarioFinancialLine.delete({
      where: { id: existing.id },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_FINANCIAL_LINE_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_FINANCIAL_LINE,
      resourceId: existing.id,
      oldValue: this.auditPayload(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async getSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioFinancialSummaryDto> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const lines = await this.prisma.projectScenarioFinancialLine.findMany({
      where: { clientId, scenarioId },
      include: {
        budgetLine: {
          select: { id: true, code: true, name: true, initialAmount: true },
        },
        projectBudgetLink: {
          include: {
            budgetLine: {
              select: { id: true, code: true, name: true, initialAmount: true },
            },
          },
        },
      },
    });

    let plannedTotal = new Prisma.Decimal(0);
    let forecastTotal = new Prisma.Decimal(0);
    let actualTotal = new Prisma.Decimal(0);
    let baselineTotal = new Prisma.Decimal(0);
    let hasBaseline = false;

    for (const line of lines) {
      plannedTotal = plannedTotal.plus(line.amountPlanned);
      forecastTotal = forecastTotal.plus(
        line.amountForecast ?? line.amountPlanned,
      );
      actualTotal = actualTotal.plus(line.amountActual ?? new Prisma.Decimal(0));

      const baseline = this.getLineBaseline(line);
      if (baseline != null) {
        hasBaseline = true;
        baselineTotal = baselineTotal.plus(baseline);
      }
    }

    const varianceVsActual = plannedTotal.minus(actualTotal);
    const varianceVsBaseline =
      hasBaseline && baselineTotal.gt(0)
        ? plannedTotal.minus(baselineTotal)
        : null;

    return {
      plannedTotal: this.toMoneyString(plannedTotal),
      forecastTotal: this.toMoneyString(forecastTotal),
      actualTotal: this.toMoneyString(actualTotal),
      varianceVsBaseline:
        varianceVsBaseline != null ? this.toMoneyString(varianceVsBaseline) : null,
      varianceVsActual: this.toMoneyString(varianceVsActual),
      budgetCoverageRate:
        hasBaseline && baselineTotal.gt(0)
          ? Number(
              plannedTotal
                .div(baselineTotal)
                .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
                .toString(),
            )
          : null,
    };
  }

  async buildBudgetSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioFinancialSummaryDto> {
    return this.getSummary(clientId, projectId, scenarioId);
  }

  private async getScenarioForScope(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ) {
    const scenario = await this.prisma.projectScenario.findFirst({
      where: {
        id: scenarioId,
        clientId,
        projectId,
      },
      select: {
        id: true,
        clientId: true,
        projectId: true,
        status: true,
      },
    });

    if (!scenario) {
      throw new NotFoundException('Project scenario not found');
    }

    return scenario;
  }

  private async getLineForScope(
    clientId: string,
    scenarioId: string,
    lineId: string,
  ): Promise<FinancialLineRecord> {
    const line = await this.prisma.projectScenarioFinancialLine.findFirst({
      where: {
        id: lineId,
        clientId,
        scenarioId,
      },
      include: {
        budgetLine: {
          select: { id: true, code: true, name: true, initialAmount: true },
        },
        projectBudgetLink: {
          include: {
            budgetLine: {
              select: { id: true, code: true, name: true, initialAmount: true },
            },
          },
        },
      },
    });

    if (!line) {
      throw new NotFoundException('Project scenario financial line not found');
    }

    return line;
  }

  private async resolveRelations(
    clientId: string,
    projectId: string,
    projectBudgetLinkId?: string | null,
    budgetLineId?: string | null,
  ): Promise<{
    projectBudgetLink: {
      id: string;
      allocationType: ProjectBudgetAllocationType;
      percentage: Prisma.Decimal | null;
      amount: Prisma.Decimal | null;
      budgetLine: { id: string; code: string; name: string; initialAmount: Prisma.Decimal };
    } | null;
    budgetLine: { id: string; code: string; name: string; initialAmount: Prisma.Decimal } | null;
  }> {
    const normalizedProjectBudgetLinkId = this.normalizeNullableId(projectBudgetLinkId);
    const normalizedBudgetLineId = this.normalizeNullableId(budgetLineId);

    let projectBudgetLink: {
      id: string;
      allocationType: ProjectBudgetAllocationType;
      percentage: Prisma.Decimal | null;
      amount: Prisma.Decimal | null;
      budgetLine: { id: string; code: string; name: string; initialAmount: Prisma.Decimal };
    } | null = null;

    let budgetLine: {
      id: string;
      code: string;
      name: string;
      initialAmount: Prisma.Decimal;
    } | null = null;

    if (normalizedProjectBudgetLinkId) {
      projectBudgetLink = await this.prisma.projectBudgetLink.findFirst({
        where: {
          id: normalizedProjectBudgetLinkId,
          clientId,
          projectId,
        },
        select: {
          id: true,
          allocationType: true,
          percentage: true,
          amount: true,
          budgetLine: {
            select: { id: true, code: true, name: true, initialAmount: true },
          },
        },
      });

      if (!projectBudgetLink) {
        throw new NotFoundException('Project budget link not found');
      }
    }

    if (normalizedBudgetLineId) {
      budgetLine = await this.prisma.budgetLine.findFirst({
        where: { id: normalizedBudgetLineId, clientId },
        select: { id: true, code: true, name: true, initialAmount: true },
      });

      if (!budgetLine) {
        throw new BadRequestException('Budget line not found for this client');
      }
    }

    if (
      projectBudgetLink &&
      budgetLine &&
      projectBudgetLink.budgetLine.id !== budgetLine.id
    ) {
      throw new BadRequestException(
        'projectBudgetLinkId and budgetLineId must reference the same budget line',
      );
    }

    return { projectBudgetLink, budgetLine };
  }

  private assertScenarioWritable(status: ProjectScenarioStatus): void {
    if (status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be edited');
    }
  }

  private getLineBaseline(line: FinancialLineRecord): Prisma.Decimal | null {
    if (line.projectBudgetLink) {
      const budgetAmount = line.projectBudgetLink.budgetLine.initialAmount;
      if (line.projectBudgetLink.allocationType === ProjectBudgetAllocationType.FULL) {
        return budgetAmount;
      }
      if (
        line.projectBudgetLink.allocationType === ProjectBudgetAllocationType.PERCENTAGE
      ) {
        return budgetAmount
          .times(line.projectBudgetLink.percentage ?? new Prisma.Decimal(0))
          .div(100)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      }
      if (line.projectBudgetLink.allocationType === ProjectBudgetAllocationType.FIXED) {
        return (line.projectBudgetLink.amount ?? new Prisma.Decimal(0)).toDecimalPlaces(
          2,
          Prisma.Decimal.ROUND_HALF_UP,
        );
      }
    }

    if (line.budgetLine) {
      return line.budgetLine.initialAmount.toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP,
      );
    }

    return null;
  }

  private serializeLine(line: FinancialLineRecord): ProjectScenarioFinancialLineDto {
    const projectedBudgetLine = line.budgetLine ?? line.projectBudgetLink?.budgetLine ?? null;

    return {
      id: line.id,
      clientId: line.clientId,
      scenarioId: line.scenarioId,
      projectBudgetLinkId: line.projectBudgetLinkId ?? null,
      budgetLineId: line.budgetLineId ?? null,
      label: line.label,
      costCategory: line.costCategory ?? null,
      amountPlanned: this.toMoneyString(line.amountPlanned),
      amountForecast:
        line.amountForecast != null ? this.toMoneyString(line.amountForecast) : null,
      amountActual: line.amountActual != null ? this.toMoneyString(line.amountActual) : null,
      currencyCode: line.currencyCode ?? null,
      startDate: line.startDate?.toISOString() ?? null,
      endDate: line.endDate?.toISOString() ?? null,
      notes: line.notes ?? null,
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString(),
      budgetLine: projectedBudgetLine
        ? {
            id: projectedBudgetLine.id,
            code: projectedBudgetLine.code,
            name: projectedBudgetLine.name,
          }
        : null,
      projectBudgetLink: line.projectBudgetLink
        ? {
            id: line.projectBudgetLink.id,
            allocationType: line.projectBudgetLink.allocationType,
            percentage:
              line.projectBudgetLink.percentage != null
                ? new Prisma.Decimal(line.projectBudgetLink.percentage)
                    .toDecimalPlaces(2)
                    .toString()
                : null,
            amount:
              line.projectBudgetLink.amount != null
                ? this.toMoneyString(line.projectBudgetLink.amount)
                : null,
            budgetLine: {
              id: line.projectBudgetLink.budgetLine.id,
              code: line.projectBudgetLink.budgetLine.code,
              name: line.projectBudgetLink.budgetLine.name,
            },
          }
        : null,
    };
  }

  private auditPayload(line: FinancialLineRecord) {
    return {
      scenarioId: line.scenarioId,
      projectBudgetLinkId: line.projectBudgetLinkId ?? null,
      budgetLineId: line.budgetLineId ?? null,
      label: line.label,
      costCategory: line.costCategory ?? null,
      amountPlanned: this.toMoneyString(line.amountPlanned),
      amountForecast:
        line.amountForecast != null ? this.toMoneyString(line.amountForecast) : null,
      amountActual: line.amountActual != null ? this.toMoneyString(line.amountActual) : null,
      currencyCode: line.currencyCode ?? null,
      startDate: line.startDate?.toISOString() ?? null,
      endDate: line.endDate?.toISOString() ?? null,
    };
  }

  private parseNonNegativeDecimal(value: string, fieldName: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);
    if (decimal.lt(0)) {
      throw new BadRequestException(`${fieldName} must be greater than or equal to 0`);
    }
    return decimal.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private assertDateRange(startDate: Date | null, endDate: Date | null): void {
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be less than or equal to endDate');
    }
  }

  private normalizeNullableText(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeCurrencyCode(value?: string | null): string | null {
    const normalized = this.normalizeNullableText(value);
    return normalized ? normalized.toUpperCase() : null;
  }

  private normalizeNullableId(value?: string | null): string | null {
    const normalized = this.normalizeNullableText(value);
    return normalized ?? null;
  }

  private toMoneyString(value: Prisma.Decimal): string {
    return new Prisma.Decimal(value).toDecimalPlaces(2).toString();
  }
}
