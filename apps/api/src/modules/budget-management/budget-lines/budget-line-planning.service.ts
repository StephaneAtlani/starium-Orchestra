import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetLinePlanningMode,
  BudgetLineStatus,
  BudgetStatus,
  Prisma,
} from '@prisma/client';
import {
  computeRemainingPlanningAmount,
  defaultReferenceDateUtc,
  getExerciseMonthColumnLabels,
} from '@starium-orchestra/budget-exercise-calendar';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { BUDGET_PLANNING_CANONICAL } from '../../audit-logs/budget-planning-audit-action-map';
import { AuditContext } from '../types/audit-context';
import { GetBudgetLinePlanningResponseDto } from './dto/get-budget-line-planning-response.dto';
import { UpdateBudgetLinePlanningManualDto } from './dto/update-budget-line-planning-manual.dto';
import { ApplyAnnualSpreadDto } from './dto/apply-annual-spread.dto';
import { ApplyQuarterlyPlanningDto } from './dto/apply-quarterly-planning.dto';
import { ApplyOneShotPlanningDto } from './dto/apply-one-shot-planning.dto';
import {
  ApplyGrowthPlanningDto,
  GrowthFrequencyDto,
  GrowthTypeDto,
} from './dto/apply-growth-planning.dto';
import {
  CalculatePlanningDto,
  PlanningFormulaTypeDto,
  QuantityGrowthFrequencyDto,
  QuantityGrowthTypeDto,
} from './dto/calculate-planning.dto';
import { ApplyCalculationPlanningDto } from './dto/apply-calculation-planning.dto';
import { ApplyBudgetLinePlanningModeDto } from './dto/apply-budget-line-planning-mode.dto';

type LineWithExerciseAndPlanning = Prisma.BudgetLineGetPayload<{
  include: {
    budget: {
      select: {
        exercise: { select: { startDate: true; endDate: true } };
      };
    };
    planningMonths: true;
    planningScenarios: {
      orderBy: { createdAt: 'desc' };
      take: 1;
    };
  };
}>;

@Injectable()
export class BudgetLinePlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getPlanning(
    clientId: string,
    lineId: string,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, clientId },
      include: {
        budget: {
          select: {
            exercise: { select: { startDate: true, endDate: true } },
          },
        },
        planningMonths: true,
        planningScenarios: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!line) {
      throw new NotFoundException('Budget line not found');
    }

    return this.buildPlanningResponseFromLine(line, referenceDate);
  }

  async replaceManualPlanning(
    clientId: string,
    lineId: string,
    dto: UpdateBudgetLinePlanningManualDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);
    const oldSnap = await this.loadPlanningSnapshot(clientId, lineId);
    if (!oldSnap) {
      throw new NotFoundException('Budget line not found');
    }

    const months = this.normalizeMonths(dto.months);

    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.MANUAL,
      months,
      context,
      null,
      referenceDate,
    );

    await this.logPlanningAuditCanonical(clientId, context, lineId, BUDGET_PLANNING_CANONICAL.UPDATED, {
      mode: BudgetLinePlanningMode.MANUAL,
      oldValues: oldSnap,
      newValues: {
        planningTotalAmount: result.planningTotalAmount,
        months: result.months,
        landing: result.landing,
        remainingPlanning: result.remainingPlanning,
      },
    });

    return result;
  }

  async applyPlanningMode(
    clientId: string,
    lineId: string,
    dto: ApplyBudgetLinePlanningModeDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    switch (dto.mode) {
      case BudgetLinePlanningMode.MANUAL:
        throw new BadRequestException('Use PUT /budget-lines/:id/planning for manual planning');
      case BudgetLinePlanningMode.ANNUAL_SPREAD:
        if (!dto.annualSpread) {
          throw new BadRequestException('annualSpread is required for ANNUAL_SPREAD');
        }
        return this.applyAnnualSpread(clientId, lineId, dto.annualSpread, context, referenceDate);
      case BudgetLinePlanningMode.QUARTERLY_SPREAD:
        if (!dto.quarterly) {
          throw new BadRequestException('quarterly is required for QUARTERLY_SPREAD');
        }
        return this.applyQuarterly(clientId, lineId, dto.quarterly, context, referenceDate);
      case BudgetLinePlanningMode.ONE_SHOT:
        if (!dto.oneShot) {
          throw new BadRequestException('oneShot is required for ONE_SHOT');
        }
        return this.applyOneShot(clientId, lineId, dto.oneShot, context, referenceDate);
      case BudgetLinePlanningMode.GROWTH:
        if (!dto.growth) {
          throw new BadRequestException('growth is required for GROWTH');
        }
        return this.applyGrowth(clientId, lineId, dto.growth, context, referenceDate);
      case BudgetLinePlanningMode.CALCULATED:
        if (!dto.calculation) {
          throw new BadRequestException('calculation is required for CALCULATED');
        }
        return this.applyCalculation(clientId, lineId, dto.calculation, context, referenceDate);
      default:
        throw new BadRequestException(`Unsupported planning mode: ${dto.mode}`);
    }
  }

  async applyAnnualSpread(
    clientId: string,
    lineId: string,
    dto: ApplyAnnualSpreadDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);
    const oldSnap = await this.loadPlanningSnapshot(clientId, lineId);
    if (!oldSnap) {
      throw new NotFoundException('Budget line not found');
    }

    const months = this.buildEmptyMonths();
    const count = dto.activeMonthIndexes.length;
    if (count === 0) {
      throw new BadRequestException('activeMonthIndexes must not be empty');
    }
    const perMonth = dto.annualAmount / count;
    for (const idx of dto.activeMonthIndexes) {
      this.ensureMonthIndex(idx);
      months[idx - 1] = perMonth;
    }

    const inputJson = dto;
    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.ANNUAL_SPREAD,
      months,
      context,
      inputJson,
      referenceDate,
    );

    await this.logPlanningAuditCanonical(
      clientId,
      context,
      lineId,
      BUDGET_PLANNING_CANONICAL.APPLIED_MODE,
      {
        mode: BudgetLinePlanningMode.ANNUAL_SPREAD,
        oldValues: oldSnap,
        newValues: {
          planningTotalAmount: result.planningTotalAmount,
          months: result.months,
          landing: result.landing,
          input: inputJson,
        },
      },
    );

    return result;
  }

  async applyQuarterly(
    clientId: string,
    lineId: string,
    dto: ApplyQuarterlyPlanningDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);
    const oldSnap = await this.loadPlanningSnapshot(clientId, lineId);
    if (!oldSnap) {
      throw new NotFoundException('Budget line not found');
    }

    const months = this.buildEmptyMonths();

    for (const q of dto.quarters) {
      const start = (q.quarter - 1) * 3 + 1;
      const perMonth = q.amount / 3;
      for (let i = 0; i < 3; i++) {
        const monthIndex = start + i;
        this.ensureMonthIndex(monthIndex);
        months[monthIndex - 1] = perMonth;
      }
    }

    const inputJson = dto;
    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.QUARTERLY_SPREAD,
      months,
      context,
      inputJson,
      referenceDate,
    );

    await this.logPlanningAuditCanonical(
      clientId,
      context,
      lineId,
      BUDGET_PLANNING_CANONICAL.APPLIED_MODE,
      {
        mode: BudgetLinePlanningMode.QUARTERLY_SPREAD,
        oldValues: oldSnap,
        newValues: {
          planningTotalAmount: result.planningTotalAmount,
          months: result.months,
          landing: result.landing,
          input: inputJson,
        },
      },
    );

    return result;
  }

  async applyOneShot(
    clientId: string,
    lineId: string,
    dto: ApplyOneShotPlanningDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);
    const oldSnap = await this.loadPlanningSnapshot(clientId, lineId);
    if (!oldSnap) {
      throw new NotFoundException('Budget line not found');
    }

    this.ensureMonthIndex(dto.monthIndex);

    const months = this.buildEmptyMonths();
    months[dto.monthIndex - 1] = dto.amount;

    const inputJson = dto;
    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.ONE_SHOT,
      months,
      context,
      inputJson,
      referenceDate,
    );

    await this.logPlanningAuditCanonical(
      clientId,
      context,
      lineId,
      BUDGET_PLANNING_CANONICAL.APPLIED_MODE,
      {
        mode: BudgetLinePlanningMode.ONE_SHOT,
        oldValues: oldSnap,
        newValues: {
          planningTotalAmount: result.planningTotalAmount,
          months: result.months,
          landing: result.landing,
          input: inputJson,
        },
      },
    );

    return result;
  }

  async applyGrowth(
    clientId: string,
    lineId: string,
    dto: ApplyGrowthPlanningDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);
    const oldSnap = await this.loadPlanningSnapshot(clientId, lineId);
    if (!oldSnap) {
      throw new NotFoundException('Budget line not found');
    }

    const months = this.buildGrowthMonths(dto);

    const inputJson = dto;
    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.GROWTH,
      months,
      context,
      inputJson,
      referenceDate,
    );

    await this.logPlanningAuditCanonical(
      clientId,
      context,
      lineId,
      BUDGET_PLANNING_CANONICAL.APPLIED_MODE,
      {
        mode: BudgetLinePlanningMode.GROWTH,
        oldValues: oldSnap,
        newValues: {
          planningTotalAmount: result.planningTotalAmount,
          months: result.months,
          landing: result.landing,
          input: inputJson,
        },
      },
    );

    return result;
  }

  async calculateFormula(
    clientId: string,
    lineId: string,
    dto: CalculatePlanningDto,
  ): Promise<{ previewMonths: { monthIndex: number; amount: number }[]; previewTotalAmount: number }> {
    await this.ensureEditableLine(clientId, lineId);

    if (dto.formulaType !== PlanningFormulaTypeDto.QUANTITY_X_UNIT_PRICE) {
      throw new BadRequestException('Unsupported formulaType');
    }

    const preview = this.computeQuantityFormulaPreview(dto);

    await this.logPlanningAuditCanonical(clientId, undefined, lineId, BUDGET_PLANNING_CANONICAL.PREVIEWED, {
      mode: BudgetLinePlanningMode.CALCULATED,
      oldValues: null,
      newValues: {
        planningTotalAmount: preview.previewTotalAmount,
        months: preview.previewMonths,
        input: dto,
      },
    });

    return preview;
  }

  private computeQuantityFormulaPreview(dto: CalculatePlanningDto): {
    previewMonths: { monthIndex: number; amount: number }[];
    previewTotalAmount: number;
  } {
    const quantities = this.buildGrowthMonths({
      baseAmount: dto.quantity.startValue,
      growthType:
        dto.quantity.growthType === QuantityGrowthTypeDto.PERCENT
          ? GrowthTypeDto.PERCENT
          : GrowthTypeDto.FIXED,
      growthValue: dto.quantity.growthValue,
      growthFrequency:
        dto.quantity.growthFrequency === QuantityGrowthFrequencyDto.MONTHLY
          ? GrowthFrequencyDto.MONTHLY
          : dto.quantity.growthFrequency === QuantityGrowthFrequencyDto.QUARTERLY
            ? GrowthFrequencyDto.QUARTERLY
            : GrowthFrequencyDto.YEARLY,
      activeMonthIndexes: dto.activeMonthIndexes,
    });

    const months: { monthIndex: number; amount: number }[] = [];
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const amount = quantities[i - 1] * dto.unitPrice.value;
      months.push({ monthIndex: i, amount });
      total += amount;
    }

    return {
      previewMonths: months,
      previewTotalAmount: total,
    };
  }

  async applyCalculation(
    clientId: string,
    lineId: string,
    dto: ApplyCalculationPlanningDto,
    context?: AuditContext,
    referenceDate: Date = defaultReferenceDateUtc(),
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);
    const oldSnap = await this.loadPlanningSnapshot(clientId, lineId);
    if (!oldSnap) {
      throw new NotFoundException('Budget line not found');
    }

    if (dto.formulaType !== PlanningFormulaTypeDto.QUANTITY_X_UNIT_PRICE) {
      throw new BadRequestException('Unsupported formulaType');
    }

    const preview = this.computeQuantityFormulaPreview(dto);
    const months = this.buildEmptyMonths();
    for (const m of preview.previewMonths) {
      this.ensureMonthIndex(m.monthIndex);
      months[m.monthIndex - 1] = m.amount;
    }

    const inputJson = dto;
    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.CALCULATED,
      months,
      context,
      inputJson,
      referenceDate,
    );

    await this.logPlanningAuditCanonical(
      clientId,
      context,
      lineId,
      BUDGET_PLANNING_CANONICAL.APPLIED_MODE,
      {
        mode: BudgetLinePlanningMode.CALCULATED,
        oldValues: oldSnap,
        newValues: {
          planningTotalAmount: result.planningTotalAmount,
          months: result.months,
          landing: result.landing,
          input: inputJson,
        },
      },
    );

    return result;
  }

  // --- helpers ---

  private async loadPlanningSnapshot(
    clientId: string,
    lineId: string,
  ): Promise<Record<string, unknown> | null> {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, clientId },
      include: {
        planningMonths: true,
        budget: {
          select: {
            exercise: { select: { startDate: true, endDate: true } },
          },
        },
      },
    });
    if (!line) {
      return null;
    }
    const monthsByIndex = new Map<number, Prisma.Decimal>();
    for (const m of line.planningMonths) {
      monthsByIndex.set(m.monthIndex, m.amount);
    }
    const months: { monthIndex: number; amount: number }[] = [];
    let planningTotalAmount = 0;
    for (let i = 1; i <= 12; i++) {
      const dec = monthsByIndex.get(i) ?? new Prisma.Decimal(0);
      const num = dec.toNumber();
      months.push({ monthIndex: i, amount: num });
      planningTotalAmount += num;
    }
    return {
      planningMode: line.planningMode ?? null,
      planningTotalAmount,
      months,
      consumedAmount: (line.consumedAmount as Prisma.Decimal).toNumber(),
      committedAmount: (line.committedAmount as Prisma.Decimal).toNumber(),
    };
  }

  private async logPlanningAuditCanonical(
    clientId: string,
    context: AuditContext | undefined,
    lineId: string,
    action: string,
    payload: {
      mode: BudgetLinePlanningMode;
      oldValues: unknown | null;
      newValues: unknown;
    },
  ): Promise<void> {
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'budget_line',
      resourceId: lineId,
      oldValue: payload.oldValues ?? null,
      newValue: {
        mode: payload.mode,
        ...(typeof payload.newValues === 'object' && payload.newValues !== null
          ? (payload.newValues as object)
          : { value: payload.newValues }),
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }

  private buildPlanningResponseFromLine(
    line: LineWithExerciseAndPlanning,
    referenceDate: Date,
  ): GetBudgetLinePlanningResponseDto {
    const monthsByIndex = new Map<number, Prisma.Decimal>();
    for (const m of line.planningMonths) {
      monthsByIndex.set(m.monthIndex, m.amount);
    }
    const outMonths: { monthIndex: number; amount: number }[] = [];
    let planningTotalAmount = 0;
    for (let i = 1; i <= 12; i++) {
      const dec = monthsByIndex.get(i) ?? new Prisma.Decimal(0);
      const num = dec.toNumber();
      outMonths.push({ monthIndex: i, amount: num });
      planningTotalAmount += num;
    }

    return this.composePlanningDto(line, outMonths, planningTotalAmount, referenceDate);
  }

  private composePlanningDto(
    line: LineWithExerciseAndPlanning,
    outMonths: { monthIndex: number; amount: number }[],
    planningTotalAmount: number,
    referenceDate: Date,
  ): GetBudgetLinePlanningResponseDto {
    const exerciseStart = line.budget.exercise.startDate;
    const exerciseEnd = line.budget.exercise.endDate;
    const amounts12 = outMonths.map((m) => m.amount);
    const monthColumnLabels = getExerciseMonthColumnLabels(exerciseStart);
    const remainingPlanning = computeRemainingPlanningAmount(
      exerciseStart,
      exerciseEnd,
      referenceDate,
      amounts12,
    );
    const consumed = (line.consumedAmount as Prisma.Decimal).toNumber();
    const committed = (line.committedAmount as Prisma.Decimal).toNumber();
    const revised = (line.revisedAmount as Prisma.Decimal).toNumber();
    const landing = consumed + committed + remainingPlanning;
    const planningDelta = planningTotalAmount - revised;
    const landingVariance = landing - revised;

    const lastScenario = line.planningScenarios[0]
      ? {
          mode: line.planningScenarios[0].mode,
          inputJson: line.planningScenarios[0].inputJson,
          createdAt: line.planningScenarios[0].createdAt,
        }
      : undefined;

    return {
      months: outMonths.map((m) => ({
        monthIndex: m.monthIndex,
        month: m.monthIndex,
        amount: m.amount,
      })),
      monthColumnLabels,
      planningMode: line.planningMode ?? null,
      planningTotalAmount,
      revisedAmount: revised,
      planningDelta,
      landingVariance,
      deltaVsRevised: planningDelta,
      variance: landingVariance,
      consumedAmount: consumed,
      committedAmount: committed,
      remainingPlanning,
      landing,
      exerciseStartDate: exerciseStart,
      exerciseEndDate: exerciseEnd,
      lastScenario,
    };
  }

  private async ensureEditableLine(clientId: string, lineId: string) {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, clientId },
      include: { budget: true },
    });
    if (!line) {
      throw new NotFoundException('Budget line not found');
    }
    if (
      line.budget.status === BudgetStatus.LOCKED ||
      line.budget.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException('Parent budget is not editable');
    }
    if (
      line.budget.isVersioned &&
      line.budget.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(line.budget.versionStatus)
    ) {
      throw new BadRequestException('Parent budget version is not editable');
    }
    if (
      line.status === BudgetLineStatus.ARCHIVED ||
      line.status === BudgetLineStatus.CLOSED
    ) {
      throw new BadRequestException('Budget line is not editable');
    }
    return line;
  }

  private ensureMonthIndex(idx: number) {
    if (idx < 1 || idx > 12) {
      throw new BadRequestException('monthIndex must be between 1 and 12');
    }
  }

  private buildEmptyMonths(): number[] {
    return Array.from({ length: 12 }, () => 0);
  }

  private normalizeMonths(
    input: { monthIndex: number; amount: number }[],
  ): number[] {
    const months = this.buildEmptyMonths();
    for (const m of input) {
      this.ensureMonthIndex(m.monthIndex);
      if (m.amount < 0) {
        throw new BadRequestException('amount must be >= 0');
      }
      months[m.monthIndex - 1] = m.amount;
    }
    return months;
  }

  private buildGrowthMonths(dto: ApplyGrowthPlanningDto): number[] {
    const months = this.buildEmptyMonths();
    const active = [...dto.activeMonthIndexes].sort((a, b) => a - b);
    if (active.length === 0) {
      throw new BadRequestException('activeMonthIndexes must not be empty');
    }
    active.forEach((idx) => this.ensureMonthIndex(idx));

    const isPercent = dto.growthType === GrowthTypeDto.PERCENT;

    const applyGrowth = (prev: number): number => {
      if (isPercent) {
        return prev * (1 + dto.growthValue / 100);
      }
      return prev + dto.growthValue;
    };

    if (dto.growthFrequency === GrowthFrequencyDto.MONTHLY) {
      let prev = dto.baseAmount;
      months[active[0] - 1] = prev;
      for (let i = 1; i < active.length; i++) {
        prev = applyGrowth(prev);
        months[active[i] - 1] = prev;
      }
      return months;
    }

    if (dto.growthFrequency === GrowthFrequencyDto.QUARTERLY) {
      const quarters: number[][] = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10, 11, 12],
      ];
      let prev = dto.baseAmount;
      let firstQuarter = true;
      for (const qMonths of quarters) {
        const qActive = qMonths.filter((m) => active.includes(m));
        if (qActive.length === 0) continue;
        if (firstQuarter) {
          prev = applyGrowth(prev);
          firstQuarter = false;
        } else {
          prev = applyGrowth(prev);
        }
        for (const idx of qActive) {
          months[idx - 1] = prev;
        }
      }
      return months;
    }

    let annualAmount: number;
    if (dto.growthType === GrowthTypeDto.PERCENT) {
      annualAmount = dto.baseAmount * (1 + dto.growthValue / 100);
    } else {
      annualAmount = dto.baseAmount + dto.growthValue;
    }
    for (const idx of active) {
      months[idx - 1] = annualAmount;
    }
    return months;
  }

  private async applyComputedMonths(
    clientId: string,
    lineId: string,
    mode: BudgetLinePlanningMode,
    months: number[],
    context: AuditContext | undefined,
    scenarioInput: unknown | null,
    referenceDate: Date,
  ): Promise<GetBudgetLinePlanningResponseDto> {
    if (months.length !== 12) {
      throw new BadRequestException('months array must have length 12');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.budgetLinePlanningMonth.deleteMany({
        where: { clientId, budgetLineId: lineId },
      });

      const data = months.map((amount, idx) => ({
        clientId,
        budgetLineId: lineId,
        monthIndex: idx + 1,
        amount: new Prisma.Decimal(amount),
      }));

      if (data.length > 0) {
        await tx.budgetLinePlanningMonth.createMany({ data });
      }

      const total = months.reduce((s, v) => s + v, 0);

      await tx.budgetLine.update({
        where: { id: lineId },
        data: {
          planningMode: mode,
          planningTotalAmount: new Prisma.Decimal(total),
          forecastAmount: new Prisma.Decimal(total),
        },
      });

      if (scenarioInput != null && mode !== BudgetLinePlanningMode.MANUAL) {
        await tx.budgetLinePlanningScenario.create({
          data: {
            clientId,
            budgetLineId: lineId,
            mode,
            inputJson: scenarioInput as Prisma.InputJsonValue,
            createdById: context?.actorUserId,
          },
        });
      }

      const line = await tx.budgetLine.findFirstOrThrow({
        where: { id: lineId, clientId },
        include: {
          budget: {
            select: {
              exercise: { select: { startDate: true, endDate: true } },
            },
          },
          planningMonths: true,
          planningScenarios: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const monthsByIndex = new Map<number, Prisma.Decimal>();
      for (const m of line.planningMonths) {
        monthsByIndex.set(m.monthIndex, m.amount);
      }
      const outMonths: { monthIndex: number; amount: number }[] = [];
      let planningTotalAmount = 0;
      for (let i = 1; i <= 12; i++) {
        const dec = monthsByIndex.get(i) ?? new Prisma.Decimal(0);
        const num = dec.toNumber();
        outMonths.push({ monthIndex: i, amount: num });
        planningTotalAmount += num;
      }

      return this.composePlanningDto(line, outMonths, planningTotalAmount, referenceDate);
    });

    return result;
  }
}
