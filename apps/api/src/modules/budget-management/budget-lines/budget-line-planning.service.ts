import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetLinePlanningMode,
  BudgetLineStatus,
  BudgetStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
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

@Injectable()
export class BudgetLinePlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getPlanning(clientId: string, lineId: string): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, clientId },
      include: {
        budget: {
          select: {
            exercise: { select: { startDate: true } },
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

    const monthsByIndex = new Map<number, Prisma.Decimal>();
    for (const m of line.planningMonths) {
      monthsByIndex.set(m.monthIndex, m.amount);
    }

    const months: { monthIndex: number; amount: number }[] = [];
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const dec = monthsByIndex.get(i) ?? new Prisma.Decimal(0);
      const num = dec.toNumber();
      months.push({ monthIndex: i, amount: num });
      total += num;
    }

    const revisedAmount = (line.revisedAmount as Prisma.Decimal).toNumber();
    const deltaVsRevised = total - revisedAmount;

    const lastScenario = line.planningScenarios[0]
      ? {
          mode: line.planningScenarios[0].mode,
          inputJson: line.planningScenarios[0].inputJson,
          createdAt: line.planningScenarios[0].createdAt,
        }
      : undefined;

    return {
      months,
      planningMode: line.planningMode ?? null,
      planningTotalAmount: total,
      revisedAmount,
      deltaVsRevised,
      exerciseStartDate: line.budget.exercise.startDate,
      lastScenario,
    };
  }

  async replaceManualPlanning(
    clientId: string,
    lineId: string,
    dto: UpdateBudgetLinePlanningManualDto,
    context?: AuditContext,
  ): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.ensureEditableLine(clientId, lineId);
    const months = this.normalizeMonths(dto.months);

    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.MANUAL,
      months,
      context,
      null,
    );

    await this.logAudit(
      clientId,
      context,
      lineId,
      'budget_line_planning.updated',
      months,
      BudgetLinePlanningMode.MANUAL,
      result.planningTotalAmount,
    );

    return result;
  }

  async applyAnnualSpread(
    clientId: string,
    lineId: string,
    dto: ApplyAnnualSpreadDto,
    context?: AuditContext,
  ): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.ensureEditableLine(clientId, lineId);

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
    );

    await this.logAudit(
      clientId,
      context,
      lineId,
      'budget_line_planning.applied_annual_spread',
      months,
      BudgetLinePlanningMode.ANNUAL_SPREAD,
      result.planningTotalAmount,
      inputJson,
    );

    return result;
  }

  async applyQuarterly(
    clientId: string,
    lineId: string,
    dto: ApplyQuarterlyPlanningDto,
    context?: AuditContext,
  ): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.ensureEditableLine(clientId, lineId);
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
    );

    await this.logAudit(
      clientId,
      context,
      lineId,
      'budget_line_planning.applied_quarterly',
      months,
      BudgetLinePlanningMode.QUARTERLY_SPREAD,
      result.planningTotalAmount,
      inputJson,
    );

    return result;
  }

  async applyOneShot(
    clientId: string,
    lineId: string,
    dto: ApplyOneShotPlanningDto,
    context?: AuditContext,
  ): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.ensureEditableLine(clientId, lineId);
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
    );

    await this.logAudit(
      clientId,
      context,
      lineId,
      'budget_line_planning.applied_one_shot',
      months,
      BudgetLinePlanningMode.ONE_SHOT,
      result.planningTotalAmount,
      inputJson,
    );

    return result;
  }

  async applyGrowth(
    clientId: string,
    lineId: string,
    dto: ApplyGrowthPlanningDto,
    context?: AuditContext,
  ): Promise<GetBudgetLinePlanningResponseDto> {
    const line = await this.ensureEditableLine(clientId, lineId);
    const months = this.buildGrowthMonths(dto);

    const inputJson = dto;
    const result = await this.applyComputedMonths(
      clientId,
      lineId,
      BudgetLinePlanningMode.GROWTH,
      months,
      context,
      inputJson,
    );

    await this.logAudit(
      clientId,
      context,
      lineId,
      'budget_line_planning.applied_growth',
      months,
      BudgetLinePlanningMode.GROWTH,
      result.planningTotalAmount,
      inputJson,
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

    // audit preview
    await this.logAudit(
      clientId,
      undefined,
      lineId,
      'budget_line_planning.calculated_previewed',
      months,
      BudgetLinePlanningMode.CALCULATED,
      total,
      dto,
    );

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
  ): Promise<GetBudgetLinePlanningResponseDto> {
    await this.ensureEditableLine(clientId, lineId);

    if (dto.formulaType !== PlanningFormulaTypeDto.QUANTITY_X_UNIT_PRICE) {
      throw new BadRequestException('Unsupported formulaType');
    }

    const preview = await this.calculateFormula(clientId, lineId, dto);
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
    );

    await this.logAudit(
      clientId,
      context,
      lineId,
      'budget_line_planning.applied_calculation',
      months,
      BudgetLinePlanningMode.CALCULATED,
      result.planningTotalAmount,
      inputJson,
    );

    return result;
  }

  // --- helpers ---

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
          prev = applyGrowth(prev); // première application au premier trimestre actif
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

    // YEARLY : même montant sur tous les mois actifs
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
            // Prisma attend un InputJsonValue (pas Prisma.JsonValue) pour ce champ
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
              exercise: { select: { startDate: true } },
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

      const revisedAmount = (line.revisedAmount as Prisma.Decimal).toNumber();
      const deltaVsRevised = planningTotalAmount - revisedAmount;

      const lastScenario = line.planningScenarios[0]
        ? {
            mode: line.planningScenarios[0].mode,
            inputJson: line.planningScenarios[0].inputJson,
            createdAt: line.planningScenarios[0].createdAt,
          }
        : undefined;

      const dto: GetBudgetLinePlanningResponseDto = {
        months: outMonths,
        planningMode: line.planningMode ?? null,
        planningTotalAmount,
        revisedAmount,
        deltaVsRevised,
        exerciseStartDate: line.budget.exercise.startDate,
        lastScenario,
      };
      return dto;
    });

    return result;
  }

  private async logAudit(
    clientId: string,
    context: AuditContext | undefined,
    lineId: string,
    action: string,
    months: number[] | { monthIndex: number; amount: number }[],
    mode: BudgetLinePlanningMode,
    total: number,
    inputJson?: unknown,
  ) {
    const monthsForAudit: { monthIndex: number; amount: number }[] =
      (months as any[]).length > 0 && typeof (months as any[])[0] === 'number'
        ? (months as number[]).map((amount, idx) => ({ monthIndex: idx + 1, amount }))
        : (months as { monthIndex: number; amount: number }[]);

    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'budget_line',
      resourceId: lineId,
      newValue: {
        mode,
        planningTotalAmount: total,
        months: monthsForAudit,
        input: inputJson,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }
}

