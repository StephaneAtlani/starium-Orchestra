import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { BudgetLineCalculatorService } from '../budget-line-calculator.service';
import { TaxCalculator } from '../helpers/tax-calculator';
import { assertBudgetLineExistsForClient } from '../helpers/budget-line.helper';
import { CreateFinancialEventDto } from './dto/create-financial-event.dto';
import { ListFinancialEventsQueryDto } from './dto/list-financial-events.query.dto';

export interface ListEventsResult {
  items: Awaited<
    ReturnType<PrismaService['financialEvent']['findMany']>
  >;
  total: number;
  limit: number;
  offset: number;
}

export interface CreateEventContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

const RECALC_EVENT_TYPES: FinancialEventType[] = [
  FinancialEventType.COMMITMENT_REGISTERED,
  FinancialEventType.CONSUMPTION_REGISTERED,
];

@Injectable()
export class FinancialEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: BudgetLineCalculatorService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(
    clientId: string,
    dto: CreateFinancialEventDto,
    context?: CreateEventContext,
  ) {
    await assertBudgetLineExistsForClient(
      this.prisma,
      dto.budgetLineId,
      clientId,
    );

    const shouldRecalc = RECALC_EVENT_TYPES.includes(dto.eventType);

    const hasAmountHt = dto.amountHt !== undefined;
    const hasAmountTtc = dto.amountTtc !== undefined;
    const hasTaxRate = dto.taxRate !== undefined;
    const hasTaxAmount = dto.taxAmount !== undefined;
    const useDefaultTaxRate = dto.useDefaultTaxRate === true;

    if (useDefaultTaxRate && hasTaxRate) {
      throw new BadRequestException(
        'Ambigu : taxRate fourni ET useDefaultTaxRate=true. Choisir l’une des deux stratégies.',
      );
    }

    const parsedAmountHt = hasAmountHt ? new Prisma.Decimal(dto.amountHt!) : null;
    const parsedAmountTtc = hasAmountTtc ? new Prisma.Decimal(dto.amountTtc!) : null;
    const parsedTaxRate = hasTaxRate ? new Prisma.Decimal(dto.taxRate!) : null;
    const parsedTaxAmount = hasTaxAmount ? new Prisma.Decimal(dto.taxAmount!) : null;

    // Combinaisons autorisées (strictes) :
    // 1) amountHt + taxRate
    // 2) amountTtc + taxRate
    // 3) amountHt + taxAmount + amountTtc
    // fallback taxRate via Client.defaultTaxRate uniquement si useDefaultTaxRate=true
    let taxCalc:
      | ReturnType<typeof TaxCalculator.fromHtAndTaxRate>
      | ReturnType<typeof TaxCalculator.fromTtcAndTaxRate>
      | ReturnType<typeof TaxCalculator.fromHtTaxAmountAndAmountTtc>;
    let taxRateSource: 'user_taxRate' | 'defaultTaxRate' | 'derived_from_amounts' =
      'user_taxRate';

    try {
      if (hasAmountHt && hasTaxRate && !hasAmountTtc && !hasTaxAmount) {
        taxCalc = TaxCalculator.fromHtAndTaxRate({
          amountHt: parsedAmountHt!,
          taxRate: parsedTaxRate!,
        });
      } else if (hasAmountTtc && hasTaxRate && !hasAmountHt && !hasTaxAmount) {
        taxCalc = TaxCalculator.fromTtcAndTaxRate({
          amountTtc: parsedAmountTtc!,
          taxRate: parsedTaxRate!,
        });
      } else if (hasAmountHt && hasTaxAmount && hasAmountTtc && !hasTaxRate) {
        if (useDefaultTaxRate) {
          throw new BadRequestException(
            'Ambigu : useDefaultTaxRate=true n’est pas autorisé avec la combinaison amountHt + taxAmount + amountTtc.',
          );
        }
        taxRateSource = 'derived_from_amounts';
        taxCalc = TaxCalculator.fromHtTaxAmountAndAmountTtc({
          amountHt: parsedAmountHt!,
          taxAmount: parsedTaxAmount!,
          amountTtc: parsedAmountTtc!,
        });
      } else if (
        useDefaultTaxRate &&
        hasAmountHt &&
        !hasTaxRate &&
        !hasAmountTtc &&
        !hasTaxAmount
      ) {
        // Fallback explicite : Client.defaultTaxRate
        const client = await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { defaultTaxRate: true },
        });
        if (!client?.defaultTaxRate) {
          throw new BadRequestException(
            'useDefaultTaxRate=true mais defaultTaxRate est absent pour ce client.',
          );
        }
        taxRateSource = 'defaultTaxRate';
        taxCalc = TaxCalculator.fromHtAndTaxRate({
          amountHt: parsedAmountHt!,
          taxRate: client.defaultTaxRate,
        });
      } else if (
        useDefaultTaxRate &&
        hasAmountTtc &&
        !hasTaxRate &&
        !hasAmountHt &&
        !hasTaxAmount
      ) {
        const client = await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { defaultTaxRate: true },
        });
        if (!client?.defaultTaxRate) {
          throw new BadRequestException(
            'useDefaultTaxRate=true mais defaultTaxRate est absent pour ce client.',
          );
        }
        taxRateSource = 'defaultTaxRate';
        taxCalc = TaxCalculator.fromTtcAndTaxRate({
          amountTtc: parsedAmountTtc!,
          taxRate: client.defaultTaxRate,
        });
      } else {
        throw new BadRequestException(
          'Combinaison de saisie invalide. Autorisé uniquement : amountHt+taxRate, amountTtc+taxRate, ou amountHt+taxAmount+amountTtc (strict).',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException((err as Error)?.message ?? 'Invalid TVA payload');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.financialEvent.create({
        data: {
          clientId,
          budgetLineId: dto.budgetLineId,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId ?? null,
          eventType: dto.eventType,
          amountHt: taxCalc.amountHt,
          taxRate: taxCalc.taxRate,
          taxAmount: taxCalc.taxAmount,
          amountTtc: taxCalc.amountTtc,
          // Legacy : amount = amountHt (et aucun nouveau calcul ne doit dépendre de amount)
          amount: taxCalc.amountHt,
          currency: dto.currency,
          eventDate: dto.eventDate,
          label: dto.label,
          description: dto.description ?? null,
        },
      });
      if (shouldRecalc) {
        await this.calculator.recalculateForBudgetLine(
          dto.budgetLineId,
          clientId,
          tx as Parameters<BudgetLineCalculatorService['recalculateForBudgetLine']>[2],
        );
      }
      return event;
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'financial-event.created',
      resourceType: 'financial_event',
      resourceId: created.id,
      newValue: {
        budgetLineId: created.budgetLineId,
        eventType: created.eventType,
        amountHt: Number(created.amountHt),
        taxRate: created.taxRate == null ? null : Number(created.taxRate),
        taxAmount: created.taxAmount == null ? null : Number(created.taxAmount),
        amountTtc: created.amountTtc == null ? null : Number(created.amountTtc),
        taxRateSource,
        currency: created.currency,
        eventDate: created.eventDate,
        label: created.label,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return created;
  }

  async list(
    clientId: string,
    query: ListFinancialEventsQueryDto,
  ): Promise<ListEventsResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = {
      clientId,
      ...(query.budgetLineId && { budgetLineId: query.budgetLineId }),
      ...(query.eventType && { eventType: query.eventType }),
    };

    const [items, total] = await Promise.all([
      this.prisma.financialEvent.findMany({
        where,
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.financialEvent.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async listByBudgetLine(
    clientId: string,
    budgetLineId: string,
    query: { limit?: number; offset?: number },
  ): Promise<ListEventsResult> {
    await assertBudgetLineExistsForClient(
      this.prisma,
      budgetLineId,
      clientId,
    );
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where = { clientId, budgetLineId };

    const [items, total] = await Promise.all([
      this.prisma.financialEvent.findMany({
        where,
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.financialEvent.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}
